// Package storage provides database operations for the document processing system.
package storage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"time"

	"github.com/autonote/backend/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Common errors returned by storage operations.
var (
	// ErrDocumentNotFound is returned when a document with the given task ID doesn't exist.
	ErrDocumentNotFound = errors.New("document not found")
	// ErrDatabaseNotInitialized is returned when database operations are attempted before initialization.
	ErrDatabaseNotInitialized = errors.New("database not initialized")
)

// DocumentStore provides database operations for document records.
//
// This type wraps GORM to provide a clean interface for document persistence,
// with proper error handling and context support.
type DocumentStore struct {
	db *gorm.DB
}

// NewDocumentStore creates and initializes a new DocumentStore.
//
// Parameters:
//   - dbPath: Path to the SQLite database file (e.g., "documents.db")
//
// Returns:
//   - *DocumentStore: Initialized document store
//   - error: Error if database connection or migration fails
//
// Example:
//
//	store, err := storage.NewDocumentStore("./data/documents.db")
//	if err != nil {
//	    log.Fatalf("Failed to initialize storage: %v", err)
//	}
func NewDocumentStore(dbPath string) (*DocumentStore, error) {
	// Configure GORM with appropriate logging
	gormLogger := logger.New(
		&logWriter{},
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false,
		},
	)

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Run auto migrations to create/update tables
	if err := db.AutoMigrate(&models.Document{}); err != nil {
		return nil, fmt.Errorf("failed to migrate database schema: %w", err)
	}

	// Enable WAL mode for better concurrent performance
	if err := db.Exec("PRAGMA journal_mode=WAL").Error; err != nil {
		return nil, fmt.Errorf("failed to enable WAL mode: %w", err)
	}

	return &DocumentStore{db: db}, nil
}

// slogWriter adapts slog for GORM's logger interface.
type slogWriter struct{}

func (w *slogWriter) Write(p []byte) (n int, err error) {
	slog.Debug(string(p))
	return len(p), nil
}

// logWriter adapts standard log for GORM's logger interface.
type logWriter struct{}

func (w *logWriter) Write(p []byte) (n int, err error) {
	log.Print(string(p))
	return len(p), nil
}

func (w *logWriter) Printf(format string, args ...interface{}) {
	log.Printf(format, args...)
}

// CreateDocument creates a new document record in the database.
//
// Parameters:
//   - ctx: Context for cancellation and timeouts
//   - doc: Document record to create (TaskID, ImagePath, and Status must be set)
//
// Returns:
//   - *models.Document: Created document with ID and timestamps
//   - error: Wrapped error if creation fails
func (s *DocumentStore) CreateDocument(ctx context.Context, doc *models.Document) (*models.Document, error) {
	if s.db == nil {
		return nil, ErrDatabaseNotInitialized
	}

	// Validate required fields
	if doc.TaskID == "" {
		return nil, errors.New("task ID is required")
	}
	if doc.ImagePath == "" {
		return nil, errors.New("image path is required")
	}

	// Set default status if not provided
	if doc.Status == "" {
		doc.Status = models.StatusPending
	}

	// Create with context support
	result := s.db.WithContext(ctx).Create(doc)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to create document: %w", result.Error)
	}

	return doc, nil
}

// GetDocumentByTaskID retrieves a document by its task ID.
//
// Parameters:
//   - ctx: Context for cancellation and timeouts
//   - taskID: The UUID task identifier
//
// Returns:
//   - *models.Document: Found document
//   - error: ErrDocumentNotFound if not found, or wrapped error on failure
func (s *DocumentStore) GetDocumentByTaskID(ctx context.Context, taskID string) (*models.Document, error) {
	if s.db == nil {
		return nil, ErrDatabaseNotInitialized
	}

	var doc models.Document
	result := s.db.WithContext(ctx).First(&doc, "task_id = ?", taskID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, ErrDocumentNotFound
		}
		return nil, fmt.Errorf("failed to get document: %w", result.Error)
	}

	return &doc, nil
}

// UpdateDocumentStatus updates the status of a document.
//
// Parameters:
//   - ctx: Context for cancellation and timeouts
//   - taskID: The UUID task identifier
//   - status: New status to set
//   - extractedData: Optional extracted data (only for COMPLETED status)
//   - errorMessage: Optional error message (only for FAILED status)
//
// Returns:
//   - error: Wrapped error if update fails
func (s *DocumentStore) UpdateDocumentStatus(
	ctx context.Context,
	taskID string,
	status models.DocumentStatus,
	extractedData *models.ExtractedData,
	errorMessage string,
) error {
	if s.db == nil {
		return ErrDatabaseNotInitialized
	}

	updates := map[string]interface{}{
		"status": status,
	}

	// Serialize extracted data to JSON if provided
	if extractedData != nil {
		dataJSON, err := json.Marshal(extractedData)
		if err != nil {
			return fmt.Errorf("failed to marshal extracted data: %w", err)
		}
		updates["extracted_data_json"] = string(dataJSON)
	}

	// Include error message if provided
	if errorMessage != "" {
		updates["error_message"] = errorMessage
	}

	result := s.db.WithContext(ctx).
		Model(&models.Document{}).
		Where("task_id = ?", taskID).
		Updates(updates)

	if result.Error != nil {
		return fmt.Errorf("failed to update document status: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return ErrDocumentNotFound
	}

	return nil
}

// UpdateDocumentToProcessing marks a document as being processed.
//
// Parameters:
//   - ctx: Context for cancellation and timeouts
//   - taskID: The UUID task identifier
//
// Returns:
//   - error: Wrapped error if update fails
func (s *DocumentStore) UpdateDocumentToProcessing(ctx context.Context, taskID string) error {
	return s.UpdateDocumentStatus(ctx, taskID, models.StatusProcessing, nil, "")
}

// UpdateDocumentToCompleted marks a document as successfully processed.
//
// Parameters:
//   - ctx: Context for cancellation and timeouts
//   - taskID: The UUID task identifier
//   - data: Extracted data from OCR processing
//
// Returns:
//   - error: Wrapped error if update fails
func (s *DocumentStore) UpdateDocumentToCompleted(
	ctx context.Context,
	taskID string,
	data *models.ExtractedData,
) error {
	return s.UpdateDocumentStatus(ctx, taskID, models.StatusCompleted, data, "")
}

// UpdateDocumentToFailed marks a document as failed.
//
// Parameters:
//   - ctx: Context for cancellation and timeouts
//   - taskID: The UUID task identifier
//   - err: Error message describing the failure
//
// Returns:
//   - error: Wrapped error if update fails
func (s *DocumentStore) UpdateDocumentToFailed(ctx context.Context, taskID string, err error) error {
	errorMessage := ""
	if err != nil {
		errorMessage = err.Error()
	}
	return s.UpdateDocumentStatus(ctx, taskID, models.StatusFailed, nil, errorMessage)
}

// GetPendingDocumentsCount returns the number of documents pending processing.
//
// Parameters:
//   - ctx: Context for cancellation and timeouts
//
// Returns:
//   - int64: Count of pending documents
//   - error: Wrapped error if query fails
func (s *DocumentStore) GetPendingDocumentsCount(ctx context.Context) (int64, error) {
	if s.db == nil {
		return 0, ErrDatabaseNotInitialized
	}

	var count int64
	result := s.db.WithContext(ctx).
		Model(&models.Document{}).
		Where("status = ?", models.StatusPending).
		Count(&count)

	if result.Error != nil {
		return 0, fmt.Errorf("failed to count pending documents: %w", result.Error)
	}

	return count, nil
}

// Close closes the database connection.
//
// Should be called when shutting down the application to ensure
// all pending transactions are completed and resources are released.
func (s *DocumentStore) Close() error {
	if s.db == nil {
		return nil
	}

	sqlDB, err := s.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying SQL DB: %w", err)
	}

	return sqlDB.Close()
}

// HealthCheck verifies the database connection is healthy.
//
// Parameters:
//   - ctx: Context for cancellation and timeouts
//
// Returns:
//   - error: nil if healthy, error if connection failed
func (s *DocumentStore) HealthCheck(ctx context.Context) error {
	if s.db == nil {
		return ErrDatabaseNotInitialized
	}

	sqlDB, err := s.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying SQL DB: %w", err)
	}

	if err := sqlDB.PingContext(ctx); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}

	return nil
}
