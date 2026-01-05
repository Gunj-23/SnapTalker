package main

import (
	"context"
	"log"
	"net/http"
	"os"
	ossignal "os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/snaptalker/backend/internal/auth"
	"github.com/snaptalker/backend/internal/calls"
	"github.com/snaptalker/backend/internal/messaging"
	"github.com/snaptalker/backend/internal/signal"
	"github.com/snaptalker/backend/pkg/storage"
)

const (
	defaultPort  = "8080"
	readTimeout  = 15 * time.Second
	writeTimeout = 15 * time.Second
	idleTimeout  = 60 * time.Second
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load configuration
	config := loadConfig()

	// Set Gin mode
	if config.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database
	db, err := storage.NewPostgresDB(config.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run database migrations
	if err := runMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize Redis (optional in production if not used)
	var redisClient *storage.RedisClient
	redisURL := getEnv("REDIS_URL", "")
	if redisURL != "" {
		redisClient, err = storage.NewRedisClient(redisURL)
		if err != nil {
			log.Printf("Warning: Failed to connect to Redis: %v", err)
			log.Println("Continuing without Redis (some features may be limited)")
		}
	} else {
		log.Println("Redis URL not configured, running without Redis")
	}

	// Initialize MinIO (optional for media storage)
	var minioClient *storage.MinIOClient
	minioEndpoint := getEnv("MINIO_ENDPOINT", "")
	if minioEndpoint != "" {
		minioClient, err = storage.NewMinIOClient(storage.MinIOConfig{
			Endpoint:   minioEndpoint,
			AccessKey:  getEnv("MINIO_ACCESS_KEY", "minioadmin"),
			SecretKey:  getEnv("MINIO_SECRET_KEY", "minioadmin"),
			UseSSL:     getEnv("MINIO_USE_SSL", "false") == "true",
			BucketName: getEnv("MINIO_BUCKET", "snaptalker"),
		})
		if err != nil {
			log.Printf("Warning: Failed to connect to MinIO: %v", err)
			log.Println("Continuing without MinIO (media uploads will be limited)")
		}
	} else {
		log.Println("MinIO not configured, media storage disabled")
	}

	// Initialize services
	authService := auth.NewService(db, redisClient, config.JWTSecret)
	signalService := signal.NewService(db, redisClient)
	messagingService := messaging.NewService(db, redisClient, minioClient)
	callsService := calls.NewService(redisClient)

	// Initialize router
	router := gin.Default()

	// CORS configuration
	corsConfig := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	// Production: Allow Vercel deployments and localhost
	if config.Environment == "production" {
		corsConfig.AllowOriginFunc = func(origin string) bool {
			// Allow main Vercel domain
			if origin == "https://snaptalker.vercel.app" {
				return true
			}
			// Allow Vercel preview deployments
			if len(origin) > 19 && origin[:8] == "https://" && origin[len(origin)-11:] == ".vercel.app" {
				return true
			}
			// Allow localhost for development testing
			if len(origin) > 7 && origin[:7] == "http://" && 
			   (origin[7:16] == "localhost" || origin[7:14] == "127.0.0") {
				return true
			}
			return false
		}
	} else {
		// Development: Allow all origins
		corsConfig.AllowOriginFunc = func(origin string) bool {
			return true
		}
	}

	router.Use(cors.New(corsConfig))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"service":   "snaptalker-backend",
			"timestamp": time.Now().Unix(),
		})
	})

	// API routes
	v1 := router.Group("/api/v1")
	{
		// Authentication
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/register", authService.Register)
			authGroup.POST("/login", authService.Login)
			authGroup.POST("/verify", authService.VerifyOTP)
			authGroup.POST("/refresh", authService.RefreshToken)
			authGroup.POST("/forgot-password", authService.ForgotPassword)
			authGroup.POST("/reset-password", authService.ResetPassword)
		}

		// Protected routes (require authentication)
		protected := v1.Group("")
		protected.Use(authService.AuthMiddleware())
		{
			// Signal Protocol - Key Exchange
			keysGroup := protected.Group("/keys")
			{
				keysGroup.POST("/upload", signalService.UploadKeyBundle)
				keysGroup.GET("/bundle/:userId", signalService.GetKeyBundle)
				keysGroup.POST("/signed-prekey", signalService.RotateSignedPreKey)
				keysGroup.DELETE("/prekey/:id", signalService.MarkPreKeyUsed)
			}

			// Messaging
			messagesGroup := protected.Group("/messages")
			{
				messagesGroup.GET("/conversations", messagingService.GetConversations)
				messagesGroup.POST("/send", messagingService.SendMessage)
				messagesGroup.GET("/:chatId", messagingService.GetMessages)
				messagesGroup.PUT("/:id/status", messagingService.UpdateMessageStatus)
				messagesGroup.GET("/stream", messagingService.StreamMessages)
			}

			// WebRTC Calls
			callsGroup := protected.Group("/calls")
			{
				callsGroup.GET("/signal", callsService.SignalingWebSocket)
				callsGroup.POST("/ice", callsService.ExchangeICECandidates)
				callsGroup.POST("/offer", callsService.SendOffer)
				callsGroup.POST("/answer", callsService.SendAnswer)
			}

			// User management
			usersGroup := protected.Group("/users")
			{
				usersGroup.GET("/me", authService.GetCurrentUser)
				usersGroup.PUT("/me", authService.UpdateProfile)
				usersGroup.GET("/search", authService.SearchUsers)
				usersGroup.GET("/:userId", authService.GetUserProfile)
				usersGroup.GET("/online-status", authService.GetOnlineStatus)
				usersGroup.POST("/heartbeat", authService.UpdateOnlineStatus)
			}
		}
	}

	// Prometheus metrics endpoint
	router.GET("/metrics", func(c *gin.Context) {
		// TODO: Implement Prometheus metrics
		c.JSON(http.StatusOK, gin.H{
			"metrics": "prometheus metrics would go here",
		})
	})

	// Create HTTP server (bind to 0.0.0.0 for mobile access)
	port := getEnv("PORT", defaultPort)
	srv := &http.Server{
		Addr:         "0.0.0.0:" + port,
		Handler:      router,
		ReadTimeout:  readTimeout,
		WriteTimeout: writeTimeout,
		IdleTimeout:  idleTimeout,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Starting server on 0.0.0.0:%s (accessible from mobile devices)", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	ossignal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

// Config holds application configuration
type Config struct {
	DatabaseURL string
	JWTSecret   string
	Environment string
	Port        string
}

func loadConfig() Config {
	return Config{
		DatabaseURL: getEnv("DATABASE_URL", "sqlite://snaptalker.db"),
		JWTSecret:   getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		Environment: getEnv("ENVIRONMENT", "development"),
		Port:        getEnv("PORT", defaultPort),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
