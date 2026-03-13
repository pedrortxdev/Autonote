// Package worker provides background processing for document OCR and data extraction.
package worker

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/autonote/backend/models"
	"github.com/autonote/backend/storage"
	"github.com/otiai10/gosseract/v2"
)

// Processing errors.
var (
	// ErrOCRFailed indicates OCR processing failed.
	ErrOCRFailed = fmt.Errorf("OCR processing failed")
	// ErrFileNotFound indicates the image file doesn't exist.
	ErrFileNotFound = fmt.Errorf("image file not found")
	// ErrDataExtractionFailed indicates regex extraction failed.
	ErrDataExtractionFailed = fmt.Errorf("data extraction failed")
)

// Processor handles background document processing.
//
// This type runs as a goroutine, listening to a task channel and
// processing documents through OCR and regex-based data extraction.
type Processor struct {
	// store provides database operations.
	store *storage.DocumentStore
	// taskChannel receives tasks for processing.
	taskChannel <-chan models.ProcessingTask
	// shutdown signals the processor to stop.
	shutdown <-chan struct{}
	// done signals when the processor has stopped.
	done chan<- struct{}
	// ocrClient is the Tesseract OCR client.
	ocrClient *gosseract.Client
	// processingTimeout is the maximum time for processing a document.
	processingTimeout time.Duration
}

// ProcessorConfig holds configuration for creating a Processor.
type ProcessorConfig struct {
	// Store is the document storage interface.
	Store *storage.DocumentStore
	// TaskChannel is the channel to receive processing tasks.
	TaskChannel <-chan models.ProcessingTask
	// Shutdown is a channel that signals shutdown.
	Shutdown <-chan struct{}
	// Done is a channel to signal when processing is complete.
	Done chan<- struct{}
	// ProcessingTimeout is the maximum time for processing a single document.
	ProcessingTimeout time.Duration
}

// NewProcessor creates a new Processor.
//
// Parameters:
//   - config: Configuration for the processor
//
// Returns:
//   - *Processor: Initialized processor
//
// Example:
//
//	processor := worker.NewProcessor(worker.ProcessorConfig{
//	    Store:       store,
//	    TaskChannel: taskChan,
//	    Shutdown:    shutdownChan,
//	    Done:        doneChan,
//	})
func NewProcessor(config ProcessorConfig) *Processor {
	timeout := config.ProcessingTimeout
	if timeout == 0 {
		timeout = 5 * time.Minute // Default timeout
	}

	return &Processor{
		store:             config.Store,
		taskChannel:       config.TaskChannel,
		shutdown:          config.Shutdown,
		done:              config.Done,
		ocrClient:         gosseract.NewClient(),
		processingTimeout: timeout,
	}
}

// Run starts the background processing loop.
//
// This method runs indefinitely until a shutdown signal is received.
// It should be called as a goroutine:
//
//	go processor.Run()
//
// The processor will:
// 1. Listen for tasks on the task channel
// 2. Update document status to PROCESSING
// 3. Perform OCR on the image
// 4. Extract structured data using regex patterns
// 5. Update document status to COMPLETED or FAILED
func (p *Processor) Run() {
	// Signal completion when exiting
	defer func() {
		if p.done != nil {
			close(p.done)
		}
		if p.ocrClient != nil {
			p.ocrClient.Close()
		}
		slog.Info("Document processor stopped")
	}()

	slog.Info("Document processor started", "timeout", p.processingTimeout)

	for {
		select {
		case <-p.shutdown:
			slog.Info("Shutdown signal received, stopping processor")
			return

		case task, ok := <-p.taskChannel:
			if !ok {
				slog.Info("Task channel closed, stopping processor")
				return
			}
			p.processTask(task)
		}
	}
}

// processTask handles a single document processing task.
func (p *Processor) processTask(task models.ProcessingTask) {
	ctx, cancel := context.WithTimeout(context.Background(), p.processingTimeout)
	defer cancel()

	slog.Info("Processing document", "task_id", task.TaskID, "path", task.ImagePath)

	// Update status to processing
	if err := p.store.UpdateDocumentToProcessing(ctx, task.TaskID); err != nil {
		slog.Error("Failed to update document status to processing",
			"task_id", task.TaskID, "error", err)
		return
	}

	// Process the document
	extractedData, err := p.extractDocumentData(ctx, task.ImagePath)
	if err != nil {
		slog.Error("Document processing failed",
			"task_id", task.TaskID, "error", err)

		if updateErr := p.store.UpdateDocumentToFailed(ctx, task.TaskID, err); updateErr != nil {
			slog.Error("Failed to update document status to failed",
				"task_id", task.TaskID, "error", updateErr)
		}
		return
	}

	// Update status to completed with extracted data
	if err := p.store.UpdateDocumentToCompleted(ctx, task.TaskID, extractedData); err != nil {
		slog.Error("Failed to update document status to completed",
			"task_id", task.TaskID, "error", err)
		return
	}

	slog.Info("Document processing completed successfully",
		"task_id", task.TaskID,
		"product", extractedData.ProductName,
		"value", extractedData.Value)
}

// extractDocumentData performs OCR and extracts structured data from an image.
//
// Parameters:
//   - ctx: Context for cancellation and timeouts
//   - imagePath: Path to the image file
//
// Returns:
//   - *models.ExtractedData: Extracted structured data
//   - error: Error if processing fails
func (p *Processor) extractDocumentData(ctx context.Context, imagePath string) (*models.ExtractedData, error) {
	// Verify file exists
	if _, err := os.Stat(imagePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("%w: %s", ErrFileNotFound, imagePath)
	}

	// Perform OCR
	rawText, err := p.performOCR(ctx, imagePath)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrOCRFailed, err)
	}

	// Extract structured data using regex
	extractedData := p.extractStructuredData(rawText)
	extractedData.RawText = rawText

	return extractedData, nil
}

// performOCR uses Tesseract to extract text from an image.
func (p *Processor) performOCR(ctx context.Context, imagePath string) (string, error) {
	// Set language to Portuguese for better accuracy with Brazilian documents
	if err := p.ocrClient.SetLanguage("por"); err != nil {
		slog.Warn("Failed to set Portuguese language", "error", err)
	}

	// Set OCR engine mode (3 = legacy + LSTM)
	if err := p.ocrClient.SetVariable("tessedit_ocr_engine_mode", "3"); err != nil {
		slog.Warn("Failed to set OCR engine mode", "error", err)
	}

	// Set image path for OCR
	if err := p.ocrClient.SetImage(imagePath); err != nil {
		return "", fmt.Errorf("failed to set image: %w", err)
	}

	// Perform OCR
	text, err := p.ocrClient.Text()
	if err != nil {
		return "", fmt.Errorf("tesseract OCR failed: %w", err)
	}

	return strings.TrimSpace(text), nil
}

// extractStructuredData uses regex patterns to extract fields from OCR text.
//
// This function looks for:
// - Product names (typically capitalized words or phrases)
// - Monetary values (R$ XX,XX or R$ XX.XX format)
// - Other common document fields
func (p *Processor) extractStructuredData(ocrText string) *models.ExtractedData {
	data := &models.ExtractedData{
		AdditionalFields: make(map[string]string),
	}

	lines := strings.Split(ocrText, "\n")

	// Extract monetary values (Brazilian Real format)
	// Matches: R$ 50,00 or R$ 50.00 or R$50,00
	valuePattern := regexp.MustCompile(`R\$\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2}|\.\d{2}))`)
	for _, line := range lines {
		if matches := valuePattern.FindStringSubmatch(line); len(matches) >= 2 {
			value := normalizeCurrency(matches[1])
			if value != "" && data.Value == "" {
				data.Value = formatCurrency(value)
			}
		}
	}

	// Extract product name - look for capitalized phrases
	// This is a heuristic that works for many invoice/receipt formats
	productName := p.extractProductName(ocrText, lines)
	if productName != "" {
		data.ProductName = productName
	}

	// Extract additional fields
	p.extractAdditionalFields(data, lines)

	// If no product name found, use first significant line
	if data.ProductName == "" && len(lines) > 0 {
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if len(line) > 3 && len(line) < 100 && !isMostlyNumeric(line) {
				data.ProductName = line
				break
			}
		}
	}

	return data
}

// extractProductName attempts to identify the product name from OCR text.
func (p *Processor) extractProductName(ocrText string, lines []string) string {
	// Common product name patterns in Portuguese
	productPatterns := []string{
		`(?i)(?:produto|descrição|item|nome)[:\s]*(.+)`,
		`(?i)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)`, // Capitalized words
	}

	for _, patternStr := range productPatterns {
		pattern := regexp.MustCompile(patternStr)
		for _, line := range lines {
			if matches := pattern.FindStringSubmatch(line); len(matches) >= 2 {
				candidate := strings.TrimSpace(matches[1])
				if isValidProductName(candidate) {
					return candidate
				}
			}
		}
	}

	// Fallback: find the most prominent non-numeric line
	return findMostProminentLine(lines)
}

// isValidProductName checks if a string looks like a valid product name.
func isValidProductName(name string) bool {
	name = strings.TrimSpace(name)
	if len(name) < 2 || len(name) > 100 {
		return false
	}
	// Should contain at least one letter
	hasLetter := false
	for _, r := range name {
		if unicode.IsLetter(r) {
			hasLetter = true
			break
		}
	}
	return hasLetter
}

// findMostProminentLine finds the most likely product name from lines.
func findMostProminentLine(lines []string) string {
	bestLine := ""
	bestScore := 0

	for _, line := range lines {
		line = strings.TrimSpace(line)
		score := scoreLine(line)
		if score > bestScore {
			bestScore = score
			bestLine = line
		}
	}

	return bestLine
}

// scoreLine gives a score to how likely a line is a product name.
func scoreLine(line string) int {
	if len(line) < 3 || len(line) > 100 {
		return 0
	}

	score := 0

	// Prefer lines with letters
	letterCount := 0
	digitCount := 0
	for _, r := range line {
		if unicode.IsLetter(r) {
			letterCount++
		}
		if unicode.IsDigit(r) {
			digitCount++
		}
	}

	// More letters = higher score
	score += letterCount * 2
	// Too many digits = lower score
	if digitCount > len(line)/2 {
		score -= digitCount * 3
	}

	// Prefer title case
	if isTitleCase(line) {
		score += 10
	}

	return score
}

// isTitleCase checks if a string is in title case.
func isTitleCase(s string) bool {
	words := strings.Fields(s)
	if len(words) == 0 {
		return false
	}

	for _, word := range words {
		if len(word) == 0 {
			continue
		}
		first := []rune(word)[0]
		if !unicode.IsUpper(first) && unicode.IsLetter(first) {
			return false
		}
	}
	return true
}

// isMostlyNumeric checks if a string is mostly numeric.
func isMostlyNumeric(s string) bool {
	if len(s) == 0 {
		return false
	}
	digitCount := 0
	for _, r := range s {
		if unicode.IsDigit(r) {
			digitCount++
		}
	}
	return digitCount > len(s)/2
}

// extractAdditionalFields extracts other common fields from document.
func (p *Processor) extractAdditionalFields(data *models.ExtractedData, lines []string) {
	// Date pattern (DD/MM/YYYY or DD-MM-YYYY)
	datePattern := regexp.MustCompile(`(\d{2}[/-]\d{2}[/-]\d{4})`)
	for _, line := range lines {
		if matches := datePattern.FindStringSubmatch(line); len(matches) >= 2 {
			data.AdditionalFields["date"] = matches[1]
			break
		}
	}

	// Quantity pattern
	qtyPattern := regexp.MustCompile(`(?i)(?:quantidade|qtd|qty)[:\s]*(\d+)`)
	for _, line := range lines {
		if matches := qtyPattern.FindStringSubmatch(line); len(matches) >= 2 {
			data.AdditionalFields["quantity"] = matches[1]
			break
		}
	}

	// Code/SKU pattern
	skuPattern := regexp.MustCompile(`(?i)(?:código|cod|sku|cód)[:\s]*([A-Z0-9-]+)`)
	for _, line := range lines {
		if matches := skuPattern.FindStringSubmatch(line); len(matches) >= 2 {
			data.AdditionalFields["sku"] = matches[1]
			break
		}
	}
}

// normalizeCurrency converts various currency formats to a standard format.
func normalizeCurrency(value string) string {
	// Remove spaces
	value = strings.ReplaceAll(value, " ", "")
	// Remove thousands separator (.)
	value = strings.ReplaceAll(value, ".", "")
	// Replace comma with period for decimal
	value = strings.ReplaceAll(value, ",", ".")
	return value
}

// formatCurrency formats a numeric value as Brazilian Real.
func formatCurrency(value string) string {
	num, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return "R$ " + value
	}
	return fmt.Sprintf("R$ %.2f", num)
}

// GetProcessingTimeout returns the current processing timeout.
func (p *Processor) GetProcessingTimeout() time.Duration {
	return p.processingTimeout
}
