package messaging

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/snaptalker/backend/pkg/storage"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // TODO: Implement proper origin checking
	},
}

// Service handles message routing and delivery
type Service struct {
	db      *storage.PostgresDB
	redis   *storage.RedisClient
	minio   *storage.MinIOClient
	clients map[string]*websocket.Conn // userID -> websocket connection
}

// NewService creates a new messaging service
func NewService(db *storage.PostgresDB, redis *storage.RedisClient, minio *storage.MinIOClient) *Service {
	return &Service{
		db:      db,
		redis:   redis,
		minio:   minio,
		clients: make(map[string]*websocket.Conn),
	}
}

// Message represents an encrypted message
type Message struct {
	ID               string    `json:"id"`
	SenderID         string    `json:"senderId"`
	RecipientID      string    `json:"recipientId"`
	EncryptedContent string    `json:"encryptedContent"`
	IV               string    `json:"iv"`
	MessageNumber    int       `json:"messageNumber"`
	Timestamp        time.Time `json:"timestamp"`
	Status           string    `json:"status"` // sent, delivered, read
	MediaURL         string    `json:"mediaUrl,omitempty"`
}

// SendMessageRequest represents a request to send a message
type SendMessageRequest struct {
	RecipientID      string `json:"recipientId" binding:"required"`
	EncryptedContent string `json:"encryptedContent" binding:"required"`
	IV               string `json:"iv" binding:"required"`
	MessageNumber    int    `json:"messageNumber" binding:"required"`
	MediaFile        []byte `json:"mediaFile,omitempty"`
}

// SendMessage handles sending an encrypted message
func (s *Service) SendMessage(c *gin.Context) {
	senderID := c.GetString("userId")
	if senderID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate message ID
	messageID := uuid.New().String()

	// Handle media upload if present
	var mediaURL string
	if len(req.MediaFile) > 0 {
		// Upload to MinIO
		objectName := fmt.Sprintf("media/%s/%s", senderID, messageID)
		url, err := s.minio.Upload(c.Request.Context(), objectName, req.MediaFile)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload media"})
			return
		}
		mediaURL = url
	}

	// Store message in database
	message := Message{
		ID:               messageID,
		SenderID:         senderID,
		RecipientID:      req.RecipientID,
		EncryptedContent: req.EncryptedContent,
		IV:               req.IV,
		MessageNumber:    req.MessageNumber,
		Timestamp:        time.Now(),
		Status:           "sent",
		MediaURL:         mediaURL,
	}

	query := `
		INSERT INTO messages (id, sender_id, recipient_id, encrypted_content, iv, message_number, timestamp, status, media_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := s.db.Exec(query, message.ID, message.SenderID, message.RecipientID,
		message.EncryptedContent, message.IV, message.MessageNumber, message.Timestamp, message.Status, message.MediaURL)
	if err != nil {
		log.Printf("Failed to store message from %s to %s: %v", senderID, req.RecipientID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store message", "details": err.Error()})
		return
	}

	// Deliver message via WebSocket if recipient is online
	s.deliverMessage(message)

	// Store in Redis for fast recent message access (if Redis is configured)
	if s.redis != nil {
		messageJSON, _ := json.Marshal(message)
		s.redis.LPush(c.Request.Context(), fmt.Sprintf("chat:%s:%s", senderID, req.RecipientID), messageJSON)
		s.redis.LTrim(c.Request.Context(), fmt.Sprintf("chat:%s:%s", senderID, req.RecipientID), 0, 99) // Keep last 100
	}

	c.JSON(http.StatusOK, message)
}

// Conversation represents a chat conversation
type Conversation struct {
	UserID      string    `json:"userId"`
	Username    string    `json:"username"`
	LastMessage string    `json:"lastMessage"`
	Timestamp   time.Time `json:"timestamp"`
	UnreadCount int       `json:"unreadCount"`
}

// GetConversations retrieves all conversations for a user
func (s *Service) GetConversations(c *gin.Context) {
	userID := c.GetString("userId")

	// Check if userId is present
	if userID == "" {
		log.Printf("GetConversations: userId is empty")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get all unique conversation partners with their last message
	query := `
		WITH conversation_messages AS (
			SELECT 
				CASE 
					WHEN sender_id = $1 THEN recipient_id
					ELSE sender_id
				END as other_user_id,
				encrypted_content,
				timestamp,
				sender_id,
				status,
				ROW_NUMBER() OVER (PARTITION BY 
					CASE 
						WHEN sender_id = $1 THEN recipient_id
						ELSE sender_id
					END 
					ORDER BY timestamp DESC
				) as rn
			FROM messages
			WHERE sender_id = $1 OR recipient_id = $1
		),
		unread_counts AS (
			SELECT 
				sender_id as other_user_id,
				COUNT(*) as unread_count
			FROM messages
			WHERE recipient_id = $1 AND status != 'read'
			GROUP BY sender_id
		)
		SELECT 
			cm.other_user_id,
			COALESCE(u.username, '') as username,
			cm.encrypted_content,
			cm.timestamp,
			COALESCE(uc.unread_count, 0) as unread_count
		FROM conversation_messages cm
		LEFT JOIN users u ON u.id = cm.other_user_id
		LEFT JOIN unread_counts uc ON uc.other_user_id = cm.other_user_id
		WHERE cm.rn = 1
		ORDER BY cm.timestamp DESC
	`

	rows, err := s.db.Query(query, userID)
	if err != nil {
		log.Printf("Failed to query conversations for user %s: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error", "details": err.Error()})
		return
	}
	defer rows.Close()

	var conversations []Conversation
	for rows.Next() {
		var conv Conversation
		err := rows.Scan(&conv.UserID, &conv.Username, &conv.LastMessage, &conv.Timestamp, &conv.UnreadCount)
		if err != nil {
			log.Printf("Failed to scan conversation: %v", err)
			continue
		}
		conversations = append(conversations, conv)
	}

	if conversations == nil {
		conversations = []Conversation{}
	}

	c.JSON(http.StatusOK, gin.H{
		"conversations": conversations,
		"count":         len(conversations),
	})
}

// GetMessages retrieves messages for a chat
func (s *Service) GetMessages(c *gin.Context) {
	userID := c.GetString("userId")
	chatID := c.Param("chatId")

	// Parse query parameters
	limit := c.DefaultQuery("limit", "50")
	offset := c.DefaultQuery("offset", "0")

	// Get messages from database
	query := `
		SELECT id, sender_id, recipient_id, encrypted_content, iv, message_number, timestamp, status, media_url
		FROM messages
		WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
		ORDER BY timestamp DESC
		LIMIT $3 OFFSET $4
	`
	rows, err := s.db.Query(query, userID, chatID, limit, offset)
	if err != nil {
		log.Printf("Failed to query messages for user %s and chat %s: %v", userID, chatID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error", "details": err.Error()})
		return
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var msg Message
		err := rows.Scan(&msg.ID, &msg.SenderID, &msg.RecipientID, &msg.EncryptedContent,
			&msg.IV, &msg.MessageNumber, &msg.Timestamp, &msg.Status, &msg.MediaURL)
		if err != nil {
			continue
		}
		messages = append(messages, msg)
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
		"count":    len(messages),
	})
}

// UpdateMessageStatus updates a message's delivery/read status
func (s *Service) UpdateMessageStatus(c *gin.Context) {
	userID := c.GetString("userId")
	messageID := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required,oneof=delivered read"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify user is the recipient of this message
	var recipientID string
	checkQuery := `SELECT recipient_id FROM messages WHERE id = $1`
	err := s.db.QueryRow(checkQuery, messageID).Scan(&recipientID)
	if err != nil {
		log.Printf("Failed to find message: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "message not found"})
		return
	}

	if recipientID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized to update this message"})
		return
	}

	// Update message status
	updateQuery := `UPDATE messages SET status = $1 WHERE id = $2`
	_, err = s.db.Exec(updateQuery, req.Status, messageID)
	if err != nil {
		log.Printf("Failed to update message status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update status"})
		return
	}

	// Notify sender via WebSocket
	s.notifyStatusUpdate(messageID, req.Status)

	c.JSON(http.StatusOK, gin.H{
		"messageId": messageID,
		"status":    req.Status,
		"updatedAt": time.Now(),
	})
}

// StreamMessages handles WebSocket connection for real-time messages
func (s *Service) StreamMessages(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Register client
	s.clients[userID] = conn
	defer delete(s.clients, userID)

	// Set user as online in Redis
	if s.redis != nil {
		s.redis.Set(c.Request.Context(), fmt.Sprintf("online:%s", userID), "true", 5*time.Minute)
	}

	// Send any pending messages
	s.sendPendingMessages(conn, userID)

	// Listen for messages
	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			break
		}

		// Handle incoming message
		s.handleWebSocketMessage(userID, msg)
	}

	// Set user as offline
	if s.redis != nil {
		s.redis.Delete(c.Request.Context(), fmt.Sprintf("online:%s", userID))
	}
}

// deliverMessage attempts to deliver a message to the recipient if online
func (s *Service) deliverMessage(msg Message) {
	if conn, ok := s.clients[msg.RecipientID]; ok {
		// Recipient is online, send via WebSocket
		conn.WriteJSON(msg)
	}
	// If offline, message is already stored in database for later retrieval
}

// sendPendingMessages sends any pending messages to a newly connected user
func (s *Service) sendPendingMessages(conn *websocket.Conn, userID string) {
	query := `
		SELECT id, sender_id, recipient_id, encrypted_content, iv, message_number, timestamp, status, media_url
		FROM messages
		WHERE recipient_id = $1 AND status = 'sent'
		ORDER BY timestamp ASC
	`
	rows, err := s.db.Query(query, userID)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var msg Message
		err := rows.Scan(&msg.ID, &msg.SenderID, &msg.RecipientID, &msg.EncryptedContent,
			&msg.IV, &msg.MessageNumber, &msg.Timestamp, &msg.Status, &msg.MediaURL)
		if err != nil {
			continue
		}
		conn.WriteJSON(msg)
	}
}

// handleWebSocketMessage processes messages received via WebSocket
func (s *Service) handleWebSocketMessage(userID string, msg Message) {
	// This would handle typing indicators, read receipts, etc.
	// For now, just acknowledge
}

// notifyStatusUpdate notifies the sender about message status changes
func (s *Service) notifyStatusUpdate(messageID, status string) {
	// Get sender ID from message
	var senderID string
	query := `SELECT sender_id FROM messages WHERE id = $1`
	s.db.QueryRow(query, messageID).Scan(&senderID)

	// Send status update if sender is online
	if conn, ok := s.clients[senderID]; ok {
		conn.WriteJSON(map[string]interface{}{
			"type":      "status_update",
			"messageId": messageID,
			"status":    status,
		})
	}
}
