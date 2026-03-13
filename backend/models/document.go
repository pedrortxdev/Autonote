// Package models defines the data structures used throughout the document processing system.
package models

import (
	"encoding/json"
	"time"
)

// DocumentStatus represents the current processing state of a document.
type DocumentStatus string

const (
	// StatusPending indicates the document is queued for processing.
	StatusPending DocumentStatus = "PENDING"
	// StatusProcessing indicates the document is currently being processed.
	StatusProcessing DocumentStatus = "PROCESSING"
	// StatusCompleted indicates the document has been successfully processed.
	StatusCompleted DocumentStatus = "COMPLETED"
	// StatusFailed indicates the document processing failed.
	StatusFailed DocumentStatus = "FAILED"
)

// ExtractedData represents the structured data extracted from a document via OCR.
type ExtractedData struct {
	// ProductName is the name of the product extracted from the document.
	ProductName string `json:"product_name,omitempty"`
	// Value is the monetary value extracted from the document (e.g., "R$ 50,00").
	Value string `json:"value,omitempty"`
	// RawText contains the full OCR output for reference.
	RawText string `json:"raw_text,omitempty"`
	// AdditionalFields stores any other key-value pairs extracted.
	AdditionalFields map[string]string `json:"additional_fields,omitempty"`
}

// Document represents a document record in the SQLite database.
//
// This model tracks the lifecycle of uploaded documents from initial upload
// through OCR processing to final completion or failure.
type Document struct {
	// ID is the primary key (auto-increment).
	ID uint `gorm:"primaryKey" json:"-"`
	// TaskID is the unique UUID returned to clients for status tracking.
	TaskID string `gorm:"uniqueIndex;size:36;not null" json:"task_id"`
	// Status indicates the current processing state.
	Status DocumentStatus `gorm:"type:varchar(20);not null;default:'PENDING'" json:"status"`
	// ImagePath is the filesystem path to the uploaded image.
	ImagePath string `gorm:"size:512;not null" json:"-"`
	// ExtractedDataJSON stores the extracted data as JSON.
	ExtractedDataJSON string `gorm:"type:text" json:"-"`
	// ExtractedData is the parsed extracted data (not stored directly in DB).
	ExtractedData *ExtractedData `gorm:"-" json:"dados,omitempty"`
	// ErrorMessage contains the error details if processing failed.
	ErrorMessage string `gorm:"type:text" json:"error_message,omitempty"`
	// CreatedAt is the timestamp when the document was created.
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	// UpdatedAt is the timestamp when the document was last updated.
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// TableName specifies the database table name for the Document model.
func (Document) TableName() string {
	return "documents"
}

// ToResponse converts a Document to its API response representation.
//
// This method handles the JSON unmarshaling of extracted data for API responses.
func (d *Document) ToResponse() DocumentResponse {
	response := DocumentResponse{
		TaskID:    d.TaskID,
		Status:    string(d.Status),
		CreatedAt: d.CreatedAt,
		UpdatedAt: d.UpdatedAt,
	}

	// Parse extracted data JSON if available
	if d.ExtractedDataJSON != "" && d.Status == StatusCompleted {
		var data ExtractedData
		// Note: In production, handle unmarshal errors properly
		if err := jsonUnmarshal([]byte(d.ExtractedDataJSON), &data); err == nil {
			response.ExtractedData = &data
		}
	}

	// Include error message if failed
	if d.Status == StatusFailed {
		response.ErrorMessage = d.ErrorMessage
	}

	return response
}

// jsonUnmarshal is a helper for JSON unmarshaling.
// Separated for easier testing and potential replacement.
func jsonUnmarshal(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}

// DocumentResponse represents the API response for document status queries.
type DocumentResponse struct {
	// TaskID is the unique identifier for tracking the document.
	TaskID string `json:"task_id"`
	// Status is the current processing status.
	Status string `json:"status"`
	// ExtractedData contains the OCR-extracted information (only when completed).
	ExtractedData *ExtractedData `json:"dados,omitempty"`
	// ErrorMessage contains error details if processing failed.
	ErrorMessage string `json:"error_message,omitempty"`
	// CreatedAt is when the document was uploaded.
	CreatedAt time.Time `json:"created_at"`
	// UpdatedAt is when the document was last updated.
	UpdatedAt time.Time `json:"updated_at"`
}

// ProcessingTask represents a task queued for background processing.
type ProcessingTask struct {
	// DocumentID is the database ID of the document to process.
	DocumentID uint
	// TaskID is the UUID for client tracking.
	TaskID string
	// ImagePath is the path to the image file.
	ImagePath string
}
