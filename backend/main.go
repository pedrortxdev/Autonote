// Package main is the entry point for the document processing server.
//
// This server provides a REST API for uploading documents and tracking
// their OCR processing status. It uses a "Smart Server" architecture where
// all processing logic runs on the server side.
//
// Usage:
//
//	go run main.go
//
// Environment Variables:
//   - PORT: Server port (default: 8080)
//   - DB_PATH: SQLite database path (default: "./data/documents.db")
//   - UPLOAD_DIR: Directory for uploaded files (default: "./uploads")
//   - TASK_CHANNEL_SIZE: Size of the processing task channel (default: 100)
//   - WORKER_COUNT: Number of background workers (default: 2)
//   - ALLOWED_ORIGINS: Comma-separated list of allowed CORS origins (default: *)
//
// API Endpoints:
//   - POST /api/v1/documentos/upload - Upload a document for processing
//   - GET /api/v1/documentos/status/:id - Get document processing status
//   - GET /api/v1/health - Health check endpoint
//   - GET /api/v1/stats - Processing statistics
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/autonote/backend/handlers"
	"github.com/autonote/backend/models"
	"github.com/autonote/backend/storage"
	"github.com/autonote/backend/worker"
	"github.com/gin-gonic/gin"
)

// Server configuration defaults.
const (
	defaultPort            = "8080"
	defaultDBPath          = "./data/documents.db"
	defaultUploadDir       = "./uploads"
	defaultTaskChannelSize = 100
	defaultWorkerCount     = 2
	defaultShutdownTimeout = 30 * time.Second
)

// Config holds the server configuration.
type Config struct {
	// Port is the HTTP server port.
	Port string
	// DBPath is the SQLite database file path.
	DBPath string
	// UploadDir is the directory for uploaded files.
	UploadDir string
	// TaskChannelSize is the size of the processing task channel.
	TaskChannelSize int
	// WorkerCount is the number of background workers.
	WorkerCount int
	// ProcessingTimeout is the timeout for processing a single document.
	ProcessingTimeout time.Duration
}

// Server represents the document processing server.
type Server struct {
	config      *Config
	httpServer  *http.Server
	store       *storage.DocumentStore
	taskChannel chan models.ProcessingTask
	shutdown    chan struct{}
	workerDone  []chan struct{}
}

// main is the application entry point.
func main() {
	if err := run(); err != nil {
		slog.Error("Server failed", "error", err)
		os.Exit(1)
	}
}

// run initializes and starts the server.
func run() error {
	// Configure structured logging
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	slog.Info("Starting document processing server")

	// Load configuration from environment
	config := loadConfig()

	// Create server instance
	server, err := NewServer(config)
	if err != nil {
		return fmt.Errorf("failed to create server: %w", err)
	}

	// Start the server
	if err := server.Start(); err != nil {
		return fmt.Errorf("server failed: %w", err)
	}

	return nil
}

// loadConfig loads configuration from environment variables.
func loadConfig() *Config {
	config := &Config{
		Port:              getEnv("PORT", defaultPort),
		DBPath:            getEnv("DB_PATH", defaultDBPath),
		UploadDir:         getEnv("UPLOAD_DIR", defaultUploadDir),
		TaskChannelSize:   getIntEnv("TASK_CHANNEL_SIZE", defaultTaskChannelSize),
		WorkerCount:       getIntEnv("WORKER_COUNT", defaultWorkerCount),
		ProcessingTimeout: getDurationEnv("PROCESSING_TIMEOUT", 5*time.Minute),
	}

	// Ensure minimum values
	if config.TaskChannelSize < 10 {
		config.TaskChannelSize = 10
	}
	if config.WorkerCount < 1 {
		config.WorkerCount = 1
	}

	return config
}

// NewServer creates a new Server instance.
func NewServer(config *Config) (*Server, error) {
	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(config.UploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Create data directory for database
	dbDir := filepath.Dir(config.DBPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	// Initialize database storage
	store, err := storage.NewDocumentStore(config.DBPath)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize storage: %w", err)
	}

	// Create task channel
	taskChannel := make(chan models.ProcessingTask, config.TaskChannelSize)

	return &Server{
		config:      config,
		store:       store,
		taskChannel: taskChannel,
		shutdown:    make(chan struct{}),
		workerDone:  make([]chan struct{}, 0, config.WorkerCount),
	}, nil
}

// Start initializes and starts the HTTP server and background workers.
func (s *Server) Start() error {
	// Start background workers
	s.startWorkers()

	// Setup Gin router
	router := s.setupRouter()

	// Create HTTP server
	s.httpServer = &http.Server{
		Addr:         ":" + s.config.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Channel to receive server errors
	serverErr := make(chan error, 1)

	// Start HTTP server in goroutine
	go func() {
		slog.Info("HTTP server starting", "port", s.config.Port)
		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErr <- err
		}
		close(serverErr)
	}()

	// Wait for shutdown signal or server error
	shutdownChan := make(chan os.Signal, 1)
	signal.Notify(shutdownChan, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErr:
		return fmt.Errorf("HTTP server error: %w", err)

	case sig := <-shutdownChan:
		slog.Info("Shutdown signal received", "signal", sig)
	}

	// Graceful shutdown
	return s.shutdown_server()
}

// startWorkers initializes and starts the background processing workers.
func (s *Server) startWorkers() {
	slog.Info("Starting background workers", "count", s.config.WorkerCount)

	for i := 0; i < s.config.WorkerCount; i++ {
		done := make(chan struct{})
		s.workerDone = append(s.workerDone, done)

		proc := worker.NewProcessor(worker.ProcessorConfig{
			Store:             s.store,
			TaskChannel:       s.taskChannel,
			Shutdown:          s.shutdown,
			Done:              done,
			ProcessingTimeout: s.config.ProcessingTimeout,
		})

		go proc.Run()
	}
}

// setupRouter configures the Gin router with all routes and middleware.
func (s *Server) setupRouter() *gin.Engine {
	// Set Gin mode based on environment
	ginMode := getEnv("GIN_MODE", "release")
	gin.SetMode(ginMode)

	router := gin.New()

	// Add recovery middleware
	router.Use(gin.Recovery())

	// Add request logging middleware
	router.Use(func(c *gin.Context) {
		start := time.Now()
		c.Next()

		slog.Info("HTTP request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"latency", time.Since(start),
			"client_ip", c.ClientIP(),
		)
	})

	// Add CORS middleware for frontend integration
	router.Use(func(c *gin.Context) {
		// Configure allowed origins
		// For development: allow all (*)
		// For production: set ALLOWED_ORIGINS env var (comma-separated)
		allowedOrigins := getEnv("ALLOWED_ORIGINS", "*")
		origin := c.Request.Header.Get("Origin")

		// Codespaces development: allow all github.dev origins
		if allowedOrigins == "*" {
			// Check if it's a Codespaces origin
			if strings.Contains(origin, ".app.github.dev") || strings.Contains(origin, "github.dev") {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			}
		} else {
			// Specific origins configured - check if origin matches
			originAllowed := false
			for _, o := range strings.Split(allowedOrigins, ",") {
				if o == origin || strings.Contains(origin, o) {
					originAllowed = true
					break
				}
			}
			if !originAllowed {
				c.AbortWithStatus(http.StatusForbidden)
				return
			}
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
	})

	// Create document handler
	docHandler := handlers.NewDocumentHandler(handlers.DocumentHandlerConfig{
		Store:       s.store,
		TaskChannel: s.taskChannel,
		UploadDir:   s.config.UploadDir,
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Document endpoints
		documentos := v1.Group("/documentos")
		{
			documentos.POST("/upload", docHandler.UploadDocument)
			documentos.GET("/status/:id", docHandler.GetDocumentStatus)
		}

		// System endpoints
		v1.GET("/health", docHandler.HealthCheck)
		v1.GET("/stats", docHandler.GetStats)
	}

	// Auth endpoint (root API level for frontend compatibility)
	router.POST("/api/login", docHandler.Login)
	router.OPTIONS("/api/login", func(c *gin.Context) {
		c.AbortWithStatus(http.StatusNoContent)
	})

	// Frontend-compatible API routes (alias to v1 endpoints)
	router.POST("/api/documents/upload", docHandler.UploadDocument)
	router.OPTIONS("/api/documents/upload", func(c *gin.Context) {
		c.AbortWithStatus(http.StatusNoContent)
	})
	router.GET("/api/tasks/:id", docHandler.GetDocumentStatus)
	router.OPTIONS("/api/tasks/:id", func(c *gin.Context) {
		c.AbortWithStatus(http.StatusNoContent)
	})
	router.POST("/api/tasks/:id/confirm", func(c *gin.Context) {
		// MVP: Just confirm without additional processing
		c.JSON(http.StatusOK, gin.H{"success": true})
	})
	router.OPTIONS("/api/tasks/:id/confirm", func(c *gin.Context) {
		c.AbortWithStatus(http.StatusNoContent)
	})

	// Root endpoint with API info
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"name":        "Document Processing API",
			"version":     "1.0.0",
			"description": "Smart Server for document OCR processing",
			"endpoints": map[string]string{
				"POST /api/v1/documentos/upload":   "Upload a document for processing",
				"GET /api/v1/documentos/status/:id": "Get document processing status",
				"GET /api/v1/health":               "Health check",
				"GET /api/v1/stats":                "Processing statistics",
			},
		})
	})

	// 404 handler
	router.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "endpoint not found",
			"help":  "See GET / for available endpoints",
		})
	})

	return router
}

// shutdown_server performs graceful shutdown of the server.
func (s *Server) shutdown_server() error {
	slog.Info("Initiating graceful shutdown")

	// Signal workers to stop
	close(s.shutdown)

	// Wait for workers to finish
	slog.Info("Waiting for workers to finish")
	for i, done := range s.workerDone {
		select {
		case <-done:
			slog.Info("Worker stopped", "worker_id", i)
		case <-time.After(defaultShutdownTimeout):
			slog.Warn("Worker shutdown timeout", "worker_id", i)
		}
	}

	// Shutdown HTTP server with timeout
	ctx, cancel := context.WithTimeout(context.Background(), defaultShutdownTimeout)
	defer cancel()

	if err := s.httpServer.Shutdown(ctx); err != nil {
		return fmt.Errorf("HTTP server shutdown error: %w", err)
	}

	// Close database connection
	if err := s.store.Close(); err != nil {
		slog.Warn("Database close error", "error", err)
	}

	slog.Info("Server shutdown complete")
	return nil
}

// getEnv returns an environment variable value or a default.
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getIntEnv returns an environment variable as an integer or a default.
func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		var result int
		if _, err := fmt.Sscanf(value, "%d", &result); err == nil {
			return result
		}
	}
	return defaultValue
}

// getDurationEnv returns an environment variable as a duration or a default.
func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}
