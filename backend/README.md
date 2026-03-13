# Document Processing Backend

A Go-based "Smart Server" backend for document processing with OCR capabilities. This server handles document uploads, performs OCR extraction using Tesseract, and provides real-time status tracking via a REST API.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Document Processing Server              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   GIN       │    │  Background │    │    SQLite       │  │
│  │   Router    │───▶│   Workers   │───▶│    Database     │  │
│  │  (HTTP API) │    │  (Goroutines)│   │                 │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────┘  │
│         │                  │                                 │
│         │           ┌──────▼──────┐                         │
│         │           │   Tesseract │                         │
│         │           │     OCR     │                         │
│         │           └─────────────┘                         │
│         │                                                    │
│  ┌──────▼─────────────────────────────────────────────────┐  │
│  │                   Task Channel                          │  │
│  │              (Go Channels + Buffer)                     │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **REST API** with GIN framework
- **SQLite Database** for document record persistence
- **Background Workers** using Go channels and goroutines
- **OCR Processing** with Tesseract for text extraction
- **Regex-based Data Extraction** for structured fields
- **Graceful Shutdown** with proper resource cleanup
- **Structured Logging** using Go's slog package
- **CORS Support** for frontend integration

## Project Structure

```
backend/
├── main.go                 # Entry point, server setup
├── go.mod                  # Go module definition
├── go.sum                  # Dependency checksums
├── handlers/
│   └── document_handler.go # HTTP request handlers
├── models/
│   └── document.go         # Data models and types
├── worker/
│   └── processor.go        # Background OCR processor
├── storage/
│   └── sqlite.go           # Database operations
├── uploads/                # Uploaded image storage
├── data/                   # SQLite database storage
└── README.md               # This file
```

## Prerequisites

### Required

- **Go 1.21+** - [Download Go](https://go.dev/dl/)
- **Tesseract OCR** - Required for OCR processing

### Installing Tesseract

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-por
```

**macOS (Homebrew):**
```bash
brew install tesseract tesseract-lang
```

**Windows:**
```powershell
# Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
# Or use Chocolatey:
choco install tesseract
```

## Installation

### 1. Clone and Navigate

```bash
cd backend
```

### 2. Download Dependencies

```bash
go mod download
```

### 3. Build the Server

```bash
go build -o document-server .
```

## Configuration

The server can be configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `DB_PATH` | `./data/documents.db` | SQLite database file path |
| `UPLOAD_DIR` | `./uploads` | Directory for uploaded files |
| `TASK_CHANNEL_SIZE` | `100` | Size of processing task channel |
| `WORKER_COUNT` | `2` | Number of background workers |
| `PROCESSING_TIMEOUT` | `5m` | Timeout for processing a document |
| `GIN_MODE` | `release` | Gin mode (debug/release) |

### Example Configuration

```bash
export PORT=3000
export WORKER_COUNT=4
export PROCESSING_TIMEOUT=10m
./document-server
```

## Running the Server

### Development Mode

```bash
go run main.go
```

### Production Mode

```bash
# Build
go build -o document-server .

# Run
./document-server
```

### With Custom Configuration

```bash
PORT=3000 WORKER_COUNT=4 ./document-server
```

## API Endpoints

### Upload Document

Uploads an image file for OCR processing.

**Request:**
```http
POST /api/v1/documentos/upload
Content-Type: multipart/form-data

file: <image_file>
```

**Response (202 Accepted):**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "message": "Document uploaded successfully and queued for processing"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "invalid file type: only image files are allowed"
}
```

### Get Document Status

Retrieves the processing status of a document.

**Request:**
```http
GET /api/v1/documentos/status/:id
```

**Response - Processing:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PROCESSING",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:05Z"
}
```

**Response - Completed:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETED",
  "dados": {
    "product_name": "Filtro de Óleo",
    "value": "R$ 50,00",
    "raw_text": "Full OCR text output...",
    "additional_fields": {
      "date": "15/01/2024",
      "quantity": "2"
    }
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:30Z"
}
```

**Response - Failed:**
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "FAILED",
  "error_message": "OCR processing failed: image file corrupted",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:10Z"
}
```

### Health Check

**Request:**
```http
GET /api/v1/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Processing Statistics

**Request:**
```http
GET /api/v1/stats
```

**Response:**
```json
{
  "pending_count": 5,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Usage Examples

### cURL

```bash
# Upload a document
curl -X POST http://localhost:8080/api/v1/documentos/upload \
  -F "file=@/path/to/invoice.jpg"

# Check status (replace with actual task_id)
curl http://localhost:8080/api/v1/documentos/status/550e8400-e29b-41d4-a716-446655440000

# Poll until completed
TASK_ID="550e8400-e29b-41d4-a716-446655440000"
while true; do
  RESPONSE=$(curl -s http://localhost:8080/api/v1/documentos/status/$TASK_ID)
  STATUS=$(echo $RESPONSE | jq -r '.status')
  echo "Status: $STATUS"
  if [ "$STATUS" = "COMPLETED" ] || [ "$STATUS" = "FAILED" ]; then
    echo $RESPONSE | jq .
    break
  fi
  sleep 2
done
```

### JavaScript/Fetch

```javascript
// Upload document
async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:8080/api/v1/documentos/upload', {
    method: 'POST',
    body: formData,
  });

  return await response.json();
}

// Check status
async function checkStatus(taskId) {
  const response = await fetch(`http://localhost:8080/api/v1/documentos/status/${taskId}`);
  return await response.json();
}

// Poll until complete
async function waitForCompletion(taskId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await checkStatus(taskId);
    if (result.status === 'COMPLETED' || result.status === 'FAILED') {
      return result;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Processing timeout');
}

// Usage
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const { task_id } = await uploadDocument(file);
  console.log('Uploaded, task_id:', task_id);

  const result = await waitForCompletion(task_id);
  console.log('Processing complete:', result);
});
```

## Database Schema

The SQLite database contains a single `documents` table:

```sql
CREATE TABLE documents (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id             VARCHAR(36) UNIQUE NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  image_path          VARCHAR(512) NOT NULL,
  extracted_data_json TEXT,
  error_message       TEXT,
  created_at          DATETIME NOT NULL,
  updated_at          DATETIME NOT NULL
);
```

## Status Values

| Status | Description |
|--------|-------------|
| `PENDING` | Document uploaded, waiting in queue |
| `PROCESSING` | Currently being processed by worker |
| `COMPLETED` | OCR and extraction completed successfully |
| `FAILED` | Processing failed (check error_message) |

## Error Handling

The API uses standard HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 202 | Accepted (upload queued) |
| 400 | Bad Request (invalid file, missing parameters) |
| 404 | Not Found (invalid task_id) |
| 500 | Internal Server Error |

## Development

### Run Tests

```bash
go test ./...
```

### Run with Race Detector

```bash
go run -race main.go
```

### Build for Production

```bash
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o document-server .
```

### Docker (Optional)

```dockerfile
FROM golang:1.21-alpine AS builder
RUN apk add --no-cache tesseract-ocr tesseract-ocr-eng
WORKDIR /app
COPY . .
RUN go build -o document-server .

FROM alpine:latest
RUN apk add --no-cache tesseract-ocr tesseract-ocr-eng
COPY --from=builder /app/document-server /document-server
EXPOSE 8080
CMD ["./document-server"]
```

## Troubleshooting

### Tesseract Not Found

```bash
# Verify installation
tesseract --version

# Check language packs
tesseract --list-langs
```

### Permission Issues

```bash
# Ensure upload directory is writable
chmod 755 ./uploads

# Ensure data directory is writable
chmod 755 ./data
```

### Database Locked

The SQLite database uses WAL mode for better concurrency. If you encounter locking issues:

```bash
# Check for stale processes
ps aux | grep document-server

# Remove WAL files if server crashed
rm -f ./data/documents.db-wal ./data/documents.db-shm
```

## License

MIT License - See LICENSE file for details.
