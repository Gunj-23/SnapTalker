package signal

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/snaptalker/backend/pkg/storage"
)

var (
	ErrKeyBundleNotFound = errors.New("key bundle not found")
	ErrInvalidKeyBundle  = errors.New("invalid key bundle")
	ErrNoPreKeysLeft     = errors.New("no one-time pre-keys available")
)

// Service handles Signal Protocol key exchange
type Service struct {
	db    *storage.PostgresDB
	redis *storage.RedisClient
}

// NewService creates a new Signal service
func NewService(db *storage.PostgresDB, redis *storage.RedisClient) *Service {
	return &Service{
		db:    db,
		redis: redis,
	}
}

// KeyBundle represents a user's public key bundle
type KeyBundle struct {
	UserID              string    `json:"userId"`
	IdentityKey         string    `json:"identityKey"`
	SignedPreKey        string    `json:"signedPreKey"`
	SignedPreKeyID      int       `json:"signedPreKeyId"`
	SignedPreKeySignature string  `json:"signedPreKeySignature"`
	OneTimePreKey       *string   `json:"oneTimePreKey,omitempty"`
	OneTimePreKeyID     *int      `json:"oneTimePreKeyId,omitempty"`
	Timestamp           time.Time `json:"timestamp"`
}

// UploadKeyBundleRequest represents the request to upload a key bundle
type UploadKeyBundleRequest struct {
	IdentityKey           string                `json:"identityKey" binding:"required"`
	SignedPreKey          SignedPreKeyRequest   `json:"signedPreKey" binding:"required"`
	OneTimePreKeys        []OneTimePreKeyRequest `json:"oneTimePreKeys" binding:"required"`
}

// SignedPreKeyRequest represents a signed pre-key
type SignedPreKeyRequest struct {
	KeyID     int    `json:"keyId" binding:"required"`
	PublicKey string `json:"publicKey" binding:"required"`
	Signature string `json:"signature" binding:"required"`
}

// OneTimePreKeyRequest represents a one-time pre-key
type OneTimePreKeyRequest struct {
	KeyID     int    `json:"keyId" binding:"required"`
	PublicKey string `json:"publicKey" binding:"required"`
}

// UploadKeyBundle handles uploading a user's key bundle
func (s *Service) UploadKeyBundle(c *gin.Context) {
	userID := c.GetString("userId") // Set by auth middleware
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req UploadKeyBundleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate key bundle
	if len(req.OneTimePreKeys) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "at least one one-time pre-key required"})
		return
	}

	// Start transaction
	tx, err := s.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	defer tx.Rollback()

	// Update user's identity key and signed pre-key
	query := `
		INSERT INTO users (id, identity_key, signed_prekey_id, signed_prekey, signed_prekey_signature, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			identity_key = EXCLUDED.identity_key,
			signed_prekey_id = EXCLUDED.signed_prekey_id,
			signed_prekey = EXCLUDED.signed_prekey,
			signed_prekey_signature = EXCLUDED.signed_prekey_signature,
			updated_at = EXCLUDED.updated_at
	`
	_, err = tx.Exec(query, userID, req.IdentityKey, req.SignedPreKey.KeyID, 
		req.SignedPreKey.PublicKey, req.SignedPreKey.Signature, time.Now())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update keys"})
		return
	}

	// Insert one-time pre-keys
	for _, preKey := range req.OneTimePreKeys {
		query = `
			INSERT INTO prekeys (user_id, prekey_id, public_key, is_used, created_at)
			VALUES ($1, $2, $3, false, $4)
			ON CONFLICT (user_id, prekey_id) DO NOTHING
		`
		_, err = tx.Exec(query, userID, preKey.KeyID, preKey.PublicKey, time.Now())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to insert pre-keys"})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit transaction"})
		return
	}

	// Cache the key bundle in Redis for fast access
	bundleJSON, _ := json.Marshal(req)
	if s.redis != nil {
		s.redis.Set(c.Request.Context(), fmt.Sprintf("keybundle:%s", userID), bundleJSON, 24*time.Hour)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "key bundle uploaded successfully",
		"preKeysUploaded": len(req.OneTimePreKeys),
	})
}

// GetKeyBundle retrieves a user's key bundle
func (s *Service) GetKeyBundle(c *gin.Context) {
	requestingUserID := c.GetString("userId") // User requesting the bundle
	targetUserID := c.Param("userId")          // User whose bundle is requested

	if targetUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId parameter required"})
		return
	}

	// Check cache first
	cacheKey := fmt.Sprintf("keybundle:%s", targetUserID)
	var cached string
	var err error
	if s.redis != nil {
		cached, err = s.redis.Get(c.Request.Context(), cacheKey)
	}
	if err == nil && cached != "" {
		var bundle KeyBundle
		if json.Unmarshal([]byte(cached), &bundle) == nil {
			c.JSON(http.StatusOK, bundle)
			return
		}
	}

	// Fetch from database
	var bundle KeyBundle
	query := `
		SELECT id, identity_key, signed_prekey_id, signed_prekey, signed_prekey_signature, updated_at
		FROM users
		WHERE id = $1
	`
	err = s.db.QueryRow(query, targetUserID).Scan(
		&bundle.UserID,
		&bundle.IdentityKey,
		&bundle.SignedPreKeyID,
		&bundle.SignedPreKey,
		&bundle.SignedPreKeySignature,
		&bundle.Timestamp,
	)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// Get an unused one-time pre-key
	var oneTimeKeyID int
	var oneTimeKey string
	query = `
		SELECT id, public_key
		FROM prekeys
		WHERE user_id = $1 AND is_used = false
		ORDER BY created_at ASC
		LIMIT 1
		FOR UPDATE SKIP LOCKED
	`
	err = s.db.QueryRow(query, targetUserID).Scan(&oneTimeKeyID, &oneTimeKey)
	if err == nil {
		// Mark as used
		_, _ = s.db.Exec("UPDATE prekeys SET is_used = true WHERE id = $1", oneTimeKeyID)
		bundle.OneTimePreKey = &oneTimeKey
		bundle.OneTimePreKeyID = &oneTimeKeyID
	}
	// If no one-time keys available, that's okay - protocol can continue without them

	// Cache the bundle
	bundleJSON, _ := json.Marshal(bundle)
	if s.redis != nil {
		s.redis.Set(c.Request.Context(), cacheKey, bundleJSON, 24*time.Hour)
	}

	// Log the key exchange for security audit
	s.logKeyExchange(c.Request.Context(), requestingUserID, targetUserID)

	c.JSON(http.StatusOK, bundle)
}

// RotateSignedPreKey handles rotating a user's signed pre-key
func (s *Service) RotateSignedPreKey(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req SignedPreKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update signed pre-key
	query := `
		UPDATE users
		SET signed_prekey_id = $1, signed_prekey = $2, signed_prekey_signature = $3, updated_at = $4
		WHERE id = $5
	`
	_, err := s.db.Exec(query, req.KeyID, req.PublicKey, req.Signature, time.Now(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to rotate key"})
		return
	}

	// Invalidate cache
	if s.redis != nil {
		s.redis.Delete(c.Request.Context(), fmt.Sprintf("keybundle:%s", userID))
	}

	c.JSON(http.StatusOK, gin.H{"message": "signed pre-key rotated successfully"})
}

// MarkPreKeyUsed marks a one-time pre-key as used
func (s *Service) MarkPreKeyUsed(c *gin.Context) {
	userID := c.GetString("userId")
	preKeyID := c.Param("id")

	query := `
		UPDATE prekeys
		SET is_used = true
		WHERE id = $1 AND user_id = $2
	`
	result, err := s.db.Exec(query, preKeyID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "pre-key not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "pre-key marked as used"})
}

// GetPreKeyCount returns the number of unused pre-keys for a user
func (s *Service) GetPreKeyCount(userID string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM prekeys WHERE user_id = $1 AND is_used = false`
	err := s.db.QueryRow(query, userID).Scan(&count)
	return count, err
}

// logKeyExchange logs a key exchange event for security auditing
func (s *Service) logKeyExchange(ctx context.Context, initiatorID, recipientID string) {
	// Store in Redis for recent activity tracking
	logEntry := map[string]interface{}{
		"initiator": initiatorID,
		"recipient": recipientID,
		"timestamp": time.Now().Unix(),
		"event":     "key_exchange",
	}
	logJSON, _ := json.Marshal(logEntry)
	s.redis.LPush(ctx, "key_exchange_log", logJSON)
	s.redis.LTrim(ctx, "key_exchange_log", 0, 9999) // Keep last 10k events
}
