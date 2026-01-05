package auth

import (
	"crypto/rand"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/snaptalker/backend/pkg/storage"
	"golang.org/x/crypto/bcrypt"
)

// Service handles authentication and authorization
type Service struct {
	db        *storage.PostgresDB
	redis     *storage.RedisClient
	jwtSecret []byte
}

// NewService creates a new auth service
func NewService(db *storage.PostgresDB, redis *storage.RedisClient, jwtSecret string) *Service {
	return &Service{
		db:        db,
		redis:     redis,
		jwtSecret: []byte(jwtSecret),
	}
}

// RegisterRequest represents a registration request
type RegisterRequest struct {
	Username    string `json:"username" binding:"required,min=3,max=50"`
	Phone       string `json:"phone" binding:"required"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	IdentityKey string `json:"identityKey" binding:"required"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// User represents a user
type User struct {
	ID          string    `json:"id"`
	Username    string    `json:"username"`
	Phone       string    `json:"phone"`
	Email       string    `json:"email"`
	IdentityKey string    `json:"identityKey"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Register handles user registration
func (s *Service) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user already exists
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE phone = $1 OR email = $2)`
	err := s.db.QueryRow(query, req.Phone, req.Email).Scan(&exists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "user already exists"})
		return
	}

	// Hash password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	// Generate user ID
	userID := uuid.New().String()

	// Create user (identity key will be set when uploading key bundle)
	query = `
		INSERT INTO users (id, username, phone, email, password_hash, identity_key, signed_prekey_id, signed_prekey, signed_prekey_signature, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, 0, '', '', $7)
	`
	_, err = s.db.Exec(query, userID, req.Username, req.Phone, req.Email, passwordHash, req.IdentityKey, time.Now())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	// Generate OTP for phone verification (only if Redis is available)
	var otp string
	if s.redis != nil {
		otp = s.generateOTP()
		s.redis.Set(c.Request.Context(), fmt.Sprintf("otp:%s", req.Phone), otp, 10*time.Minute)
	} else {
		// Skip OTP verification if Redis not available
		otp = "000000" // Placeholder for development
	}

	// TODO: Send OTP via SMS

	c.JSON(http.StatusCreated, gin.H{
		"userId":  userID,
		"message": "user registered successfully, please verify OTP",
		"otp":     otp, // Remove in production
	})
}

// Login handles user login
func (s *Service) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user from database
	var user User
	var passwordHash string
	query := `
		SELECT id, username, phone, email, password_hash, identity_key, created_at
		FROM users
		WHERE phone = $1
	`
	err := s.db.QueryRow(query, req.Phone).Scan(
		&user.ID, &user.Username, &user.Phone, &user.Email, &passwordHash, &user.IdentityKey, &user.CreatedAt,
	)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Generate JWT token
	token, err := s.generateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	// Generate refresh token
	refreshToken, err := s.generateRefreshToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":        token,
		"refreshToken": refreshToken,
		"user":         user,
	})
}

// VerifyOTP verifies the OTP
func (s *Service) VerifyOTP(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
		OTP   string `json:"otp" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get OTP from Redis (skip if Redis not available)
	if s.redis == nil {
		// No Redis, skip OTP verification
		c.JSON(http.StatusOK, gin.H{"message": "OTP verification skipped (development mode)"})
		return
	}
	
	storedOTP, err := s.redis.Get(c.Request.Context(), fmt.Sprintf("otp:%s", req.Phone))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "OTP expired or invalid"})
		return
	}

	if storedOTP != req.OTP {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid OTP"})
		return
	}

	// Delete OTP from Redis
	s.redis.Delete(c.Request.Context(), fmt.Sprintf("otp:%s", req.Phone))

	c.JSON(http.StatusOK, gin.H{"message": "OTP verified successfully"})
}

// RefreshToken generates a new access token from a refresh token
func (s *Service) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refreshToken" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify refresh token
	userID, err := s.verifyRefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
		return
	}

	// Generate new access token
	token, err := s.generateToken(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

// AuthMiddleware validates JWT tokens
func (s *Service) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			c.Abort()
			return
		}

		// Remove "Bearer " prefix
		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}

		// Parse token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return s.jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		// Extract user ID from claims
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			if userID, ok := claims["userId"].(string); ok {
				c.Set("userId", userID)
				
				// Set user context for Row-Level Security
				if err := s.db.SetUserContext(c.Request.Context(), userID); err != nil {
					// Log error but don't block request - RLS policies will handle authorization
					fmt.Printf("Warning: Failed to set RLS user context: %v\n", err)
				}
				
				c.Next()
				return
			}
		}

		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
		c.Abort()
	}
}

// GetCurrentUser returns the current user's profile
func (s *Service) GetCurrentUser(c *gin.Context) {
	userID := c.GetString("userId")
	user, err := s.getUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

// UpdateProfile updates the user's profile
func (s *Service) UpdateProfile(c *gin.Context) {
	userID := c.GetString("userId")
	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := `UPDATE users SET username = $1, email = $2, updated_at = $3 WHERE id = $4`
	_, err := s.db.Exec(query, req.Username, req.Email, time.Now(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "profile updated successfully"})
}

// GetUserProfile returns a user's public profile
func (s *Service) GetUserProfile(c *gin.Context) {
	userID := c.Param("userId")
	user, err := s.getUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

// Helper functions

func (s *Service) generateToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"userId": userID,
		"exp":    time.Now().Add(24 * time.Hour).Unix(),
		"iat":    time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *Service) generateRefreshToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"userId": userID,
		"exp":    time.Now().Add(30 * 24 * time.Hour).Unix(),
		"iat":    time.Now().Unix(),
		"type":   "refresh",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *Service) verifyRefreshToken(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return "", fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", fmt.Errorf("invalid claims")
	}

	if tokenType, ok := claims["type"].(string); !ok || tokenType != "refresh" {
		return "", fmt.Errorf("not a refresh token")
	}

	userID, ok := claims["userId"].(string)
	if !ok {
		return "", fmt.Errorf("invalid userId")
	}

	return userID, nil
}

func (s *Service) generateOTP() string {
	bytes := make([]byte, 3)
	rand.Read(bytes)
	return fmt.Sprintf("%06d", int(bytes[0])<<16|int(bytes[1])<<8|int(bytes[2]))[:6]
}

func (s *Service) getUserByID(userID string) (*User, error) {
	var user User
	query := `SELECT id, username, phone, email, identity_key, created_at FROM users WHERE id = $1`
	err := s.db.QueryRow(query, userID).Scan(
		&user.ID, &user.Username, &user.Phone, &user.Email, &user.IdentityKey, &user.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetOnlineStatus returns online status for multiple users
func (s *Service) GetOnlineStatus(c *gin.Context) {
	userIDs := c.QueryArray("userIds")
	if len(userIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userIds required"})
		return
	}

	statuses := make(map[string]bool)
	for _, userID := range userIDs {
		key := fmt.Sprintf("online:%s", userID)
		if s.redis != nil {
			val, err := s.redis.Get(c.Request.Context(), key)
			statuses[userID] = err == nil && val == "true"
		} else {
			statuses[userID] = false
		}
	}

	c.JSON(http.StatusOK, gin.H{"statuses": statuses})
}

// UpdateOnlineStatus sets user as online with TTL
func (s *Service) UpdateOnlineStatus(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	key := fmt.Sprintf("online:%s", userID)
	if s.redis != nil {
		err := s.redis.Set(c.Request.Context(), key, "true", 30*time.Second)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update status"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "online"})
}

// SearchUsers handles user search by username or phone
func (s *Service) SearchUsers(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "search query required"})
		return
	}

	// Get current user ID from context
	userID, _ := c.Get("userId")

	// Search for users by username or phone (excluding current user)
	sqlQuery := `
		SELECT id, username, phone, email, identity_key, created_at 
		FROM users 
		WHERE (username ILIKE $1 OR phone LIKE $2) AND id != $3
		LIMIT 20
	`

	rows, err := s.db.Query(sqlQuery, "%"+query+"%", "%"+query+"%", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
		return
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.Username, &user.Phone, &user.Email, &user.IdentityKey, &user.CreatedAt); err != nil {
			continue
		}
		users = append(users, user)
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"found": len(users) > 0,
	})
}
