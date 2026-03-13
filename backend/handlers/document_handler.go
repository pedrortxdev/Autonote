// Package handlers provides HTTP request handlers for the document processing API.
package handlers

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/autonote/backend/models"
	"github.com/autonote/backend/storage"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Common errors for document handling.
var (
	// ErrNoFile is returned when no file is provided in the upload request.
	ErrNoFile = errors.New("no file provided in request")
	// ErrInvalidFileType is returned when the uploaded file is not a valid image.
	ErrInvalidFileType = errors.New("invalid file type: only image files are allowed")
	// ErrFileTooLarge is returned when the uploaded file exceeds the size limit.
	ErrFileTooLarge = errors.New("file too large: maximum size is 10MB")
	// ErrFailedToSaveFile is returned when saving the uploaded file fails.
	ErrFailedToSaveFile = errors.New("failed to save uploaded file")
)

// Maximum upload size: 10MB.
const maxUploadSize = 10 * 1024 * 1024

// Allowed image extensions.
var allowedExtensions = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".bmp":  true,
	".tiff": true,
	".tif":  true,
	".webp": true,
}

// DocumentHandler handles HTTP requests for document operations.
//
// This handler manages document uploads and status queries, coordinating
// with the storage layer and background worker through a task channel.
type DocumentHandler struct {
	// store provides database operations.
	store *storage.DocumentStore
	// taskChannel is used to queue documents for background processing.
	taskChannel chan<- models.ProcessingTask
	// uploadDir is the directory where uploaded files are stored.
	uploadDir string
}

// DocumentHandlerConfig holds configuration for creating a DocumentHandler.
type DocumentHandlerConfig struct {
	// Store is the document storage interface.
	Store *storage.DocumentStore
	// TaskChannel is the channel for queuing processing tasks.
	TaskChannel chan<- models.ProcessingTask
	// UploadDir is the directory for storing uploaded files.
	UploadDir string
}

// NewDocumentHandler creates a new DocumentHandler.
//
// Parameters:
//   - config: Configuration for the handler
//
// Returns:
//   - *DocumentHandler: Initialized handler
//
// Example:
//
//	handler := handlers.NewDocumentHandler(handlers.DocumentHandlerConfig{
//	    Store:       store,
//	    TaskChannel: taskChan,
//	    UploadDir:   "./uploads",
//	})
func NewDocumentHandler(config DocumentHandlerConfig) *DocumentHandler {
	return &DocumentHandler{
		store:       config.Store,
		taskChannel: config.TaskChannel,
		uploadDir:   config.UploadDir,
	}
}

// UploadDocument handles multipart/form-data file uploads.
//
// This endpoint:
// 1. Validates the uploaded file (type, size)
// 2. Saves the file to disk with a unique name
// 3. Creates a database record with PENDING status
// 4. Queues the document for background processing
// 5. Returns HTTP 202 with the task ID
//
// Request:
//   - Method: POST
//   - Path: /api/v1/documentos/upload
//   - Content-Type: multipart/form-data
//   - Form Field: "file" (required) - The image file to upload
//
// Response (202 Accepted):
//
//	{
//	    "task_id": "550e8400-e29b-41d4-a716-446655440000",
//	    "status": "pending",
//	    "message": "Document uploaded successfully"
//	}
//
// Response (400 Bad Request):
//
//	{
//	    "error": "no file provided in request"
//	}
//
// Response (500 Internal Server Error):
//
//	{
//	    "error": "failed to process upload: <details>"
//	}
func (h *DocumentHandler) UploadDocument(c *gin.Context) {
	ctx := c.Request.Context()

	// Limit upload size
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxUploadSize)

	// Parse multipart form (max 32MB total)
	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
		if strings.Contains(err.Error(), "http: request body too large") {
			c.JSON(http.StatusBadRequest, gin.H{"error": ErrFileTooLarge.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse form data"})
		return
	}

	// Get the uploaded file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		if errors.Is(err, http.ErrMissingFile) {
			c.JSON(http.StatusBadRequest, gin.H{"error": ErrNoFile.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to get file from request"})
		return
	}
	defer file.Close()

	// Validate file extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedExtensions[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": ErrInvalidFileType.Error()})
		return
	}

	// Generate unique filename
	uniqueID := uuid.New()
	filename := fmt.Sprintf("%s%s", uniqueID.String(), ext)
	filePath := filepath.Join(h.uploadDir, filename)

	// Create the upload file
	dst, err := os.Create(filePath)
	if err != nil {
		slog.Error("Failed to create upload file", "error", err, "path", filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}
	defer dst.Close()

	// Copy file content with size limit
	written, err := io.CopyN(dst, file, maxUploadSize)
	if err != nil && !errors.Is(err, io.EOF) {
		os.Remove(filePath) // Clean up partial file
		slog.Error("Failed to copy file content", "error", err)
		if err.Error() == "http: request body too large" || strings.Contains(err.Error(), "too large") {
			c.JSON(http.StatusBadRequest, gin.H{"error": ErrFileTooLarge.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": ErrFailedToSaveFile.Error()})
		return
	}

	slog.Info("File uploaded successfully",
		"task_id", uniqueID.String(),
		"path", filePath,
		"size", written,
	)

	// Create database record
	doc := &models.Document{
		TaskID:    uniqueID.String(),
		Status:    models.StatusPending,
		ImagePath: filePath,
	}

	if _, err := h.store.CreateDocument(ctx, doc); err != nil {
		os.Remove(filePath) // Clean up file on DB error
		slog.Error("Failed to create document record", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create document record"})
		return
	}

	// Queue for background processing
	task := models.ProcessingTask{
		DocumentID: doc.ID,
		TaskID:     doc.TaskID,
		ImagePath:  doc.ImagePath,
	}

	select {
	case h.taskChannel <- task:
		slog.Info("Document queued for processing", "task_id", doc.TaskID)
	default:
		// Channel is full, log warning but don't fail the request
		slog.Warn("Task channel full, document will be processed when space available",
			"task_id", doc.TaskID)
	}

	// Return 202 Accepted
	c.JSON(http.StatusAccepted, gin.H{
		"task_id": doc.TaskID,
		"status":  string(doc.Status),
		"message": "Document uploaded successfully and queued for processing",
	})
}

// GetDocumentStatus returns the current status of a document.
//
// This is a lightweight endpoint that queries the database and returns
// the current processing status. If the document is completed, it includes
// the extracted data.
//
// Request:
//   - Method: GET
//   - Path: /api/v1/documentos/status/:id
//   - Path Parameter: id - The task UUID
//
// Response (200 OK) - Pending/Processing:
//
//	{
//	    "task_id": "550e8400-e29b-41d4-a716-446655440000",
//	    "status": "PROCESSING",
//	    "created_at": "2024-01-15T10:30:00Z",
//	    "updated_at": "2024-01-15T10:30:05Z"
//	}
//
// Response (200 OK) - Completed:
//
//	{
//	    "task_id": "550e8400-e29b-41d4-a716-446655440000",
//	    "status": "COMPLETED",
//	    "dados": {
//	        "product_name": "Filtro de Óleo",
//	        "value": "R$ 50,00",
//	        "raw_text": "..."
//	    },
//	    "created_at": "2024-01-15T10:30:00Z",
//	    "updated_at": "2024-01-15T10:30:30Z"
//	}
//
// Response (404 Not Found):
//
//	{
//	    "error": "document not found"
//	}
func (h *DocumentHandler) GetDocumentStatus(c *gin.Context) {
	ctx := c.Request.Context()

	// Get task ID from URL parameter
	taskID := c.Param("id")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "task ID is required"})
		return
	}

	// Validate UUID format
	if _, err := uuid.Parse(taskID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task ID format"})
		return
	}

	// Query database
	doc, err := h.store.GetDocumentByTaskID(ctx, taskID)
	if err != nil {
		if errors.Is(err, storage.ErrDocumentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
			return
		}
		slog.Error("Failed to get document", "error", err, "task_id", taskID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get document status"})
		return
	}

	// Convert to response format
	response := doc.ToResponse()

	c.JSON(http.StatusOK, response)
}

// HealthCheck returns the health status of the document service.
//
// This endpoint can be used for load balancer health checks
// and monitoring systems.
//
// Request:
//   - Method: GET
//   - Path: /api/v1/health
//
// Response (200 OK):
//
//	{
//	    "status": "healthy",
//	    "timestamp": "2024-01-15T10:30:00Z"
//	}
func (h *DocumentHandler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// GetStats returns processing statistics.
//
// This endpoint provides metrics about the document processing system,
// useful for monitoring and dashboards.
//
// Request:
//   - Method: GET
//   - Path: /api/v1/stats
//
// Response (200 OK):
//
//	{
//	    "pending_count": 5,
//	    "timestamp": "2024-01-15T10:30:00Z"
//	}
func (h *DocumentHandler) GetStats(c *gin.Context) {
	ctx := c.Request.Context()

	count, err := h.store.GetPendingDocumentsCount(ctx)
	if err != nil {
		slog.Error("Failed to get pending count", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get statistics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"pending_count": count,
		"timestamp":     time.Now().UTC().Format(time.RFC3339),
	})
}

// Login handles company code authentication (MVP - simple validation).
//
// This is a simplified login for MVP that accepts any company code
// and returns a fake token. In production, this would validate against
// a real authentication system.
//
// Request:
//   - Method: POST
//   - Path: /api/login
//   - Body: { "codigoEmpresa": "ABC123" }
//
// Response (200 OK):
//
//	{
//	    "success": true,
//	    "token": "fake-jwt-token",
//	    "empresaId": "ABC123"
//	}
func (h *DocumentHandler) Login(c *gin.Context) {
	var req struct {
		CodigoEmpresa string `json:"codigoEmpresa" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "codigoEmpresa is required",
		})
		return
	}

	if len(req.CodigoEmpresa) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "codigoEmpresa must be at least 3 characters",
		})
		return
	}

	// MVP: Accept any company code and return fake token
	// In production, validate against database or auth service
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"token":     fmt.Sprintf("mvp-token-%s-%d", req.CodigoEmpresa, time.Now().Unix()),
		"empresaId": req.CodigoEmpresa,
	})
}

// ensure DocumentHandler implements proper error handling
var (
	_ error = ErrNoFile
	_ error = ErrInvalidFileType
	_ error = ErrFileTooLarge
	_ error = ErrFailedToSaveFile
)
