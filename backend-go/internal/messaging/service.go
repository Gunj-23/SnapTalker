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
	db           *storage.PostgresDB
	redis        *storage.RedisClient
	minio        *storage.MinIOClient
	clients      map[string]*websocket.Conn // userID -> websocket connection
	typingStatus map[string]map[string]bool // userID -> map[recipientID]isTyping
}

// NewService creates a new messaging service
func NewService(db *storage.PostgresDB, redis *storage.RedisClient, minio *storage.MinIOClient) *Service {
	return &Service{
		db:           db,
		redis:        redis,
		minio:        minio,
		clients:      make(map[string]*websocket.Conn),
		typingStatus: make(map[string]map[string]bool),
	}
}

// Reaction represents a message reaction
type Reaction struct {
	ID        string    `json:"id"`
	MessageID string    `json:"messageId"`
	UserID    string    `json:"userId"`
	Username  string    `json:"username"`
	Emoji     string    `json:"emoji"`
	CreatedAt time.Time `json:"createdAt"`
}

// Message represents an encrypted message
type Message struct {
	ID             string     `json:"id"`
	SenderID       string     `json:"senderId"`
	RecipientID    string     `json:"recipientId"`
	Content        string     `json:"content"`
	ContentType    string     `json:"contentType"`
	Encrypted      bool       `json:"encrypted"`
	Timestamp      time.Time  `json:"timestamp"`
	Status         string     `json:"status"`
	MessageType    string     `json:"messageType"`
	ReplyToID      *string    `json:"replyToId,omitempty"`
	ReplyToContent *string    `json:"replyToContent,omitempty"`
	Reactions      []Reaction `json:"reactions,omitempty"`
}

// SendMessageRequest represents a request to send a message
type SendMessageRequest struct {
	RecipientID string  `json:"recipientId" binding:"required"`
	Content     string  `json:"content" binding:"required"`
	ContentType string  `json:"contentType"`
	Encrypted   bool    `json:"encrypted"`
	MessageType string  `json:"messageType"`
	ReplyToID   *string `json:"replyToId,omitempty"`
	MediaFile   []byte  `json:"mediaFile,omitempty"`
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

	// TODO: Handle media upload if present (MinIO integration)
	// if len(req.MediaFile) > 0 {
	//     objectName := fmt.Sprintf("media/%s/%s", senderID, messageID)
	//     url, err := s.minio.Upload(c.Request.Context(), objectName, req.MediaFile)
	//     if err != nil {
	//         c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload media"})
	//         return
	//     }
	// }

	// Store message in database
	contentType := req.ContentType
	if contentType == "" {
		contentType = "text"
	}
	encrypted := req.Encrypted
	messageType := req.MessageType
	if messageType == "" {
		messageType = "one_to_one"
	}

	message := Message{
		ID:          messageID,
		SenderID:    senderID,
		RecipientID: req.RecipientID,
		Content:     req.Content,
		ContentType: contentType,
		Encrypted:   encrypted,
		Timestamp:   time.Now(),
		Status:      "sent",
		MessageType: messageType,
		ReplyToID:   req.ReplyToID,
	}

	// Get reply content if replying to a message
	var replyToContent *string
	if req.ReplyToID != nil {
		var content string
		replyQuery := `SELECT content FROM messages WHERE id = $1`
		if err := s.db.QueryRow(replyQuery, *req.ReplyToID).Scan(&content); err == nil {
			replyToContent = &content
			message.ReplyToContent = replyToContent
		}
	}

	query := `
		INSERT INTO messages (id, sender_id, recipient_id, content, content_type, encrypted, timestamp, status, message_type, reply_to_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := s.db.Exec(query, message.ID, message.SenderID, message.RecipientID,
		message.Content, message.ContentType, message.Encrypted, message.Timestamp, message.Status, message.MessageType, message.ReplyToID)
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
				content,
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
				cm.content,
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
		SELECT m.id, m.sender_id, m.recipient_id, m.content, m.content_type, m.encrypted, 
		       m.timestamp, m.status, m.message_type, m.reply_to_id,
		       r.content as reply_content
		FROM messages m
		LEFT JOIN messages r ON m.reply_to_id = r.id
		WHERE (m.sender_id = $1 AND m.recipient_id = $2) OR (m.sender_id = $2 AND m.recipient_id = $1)
		ORDER BY m.timestamp DESC
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
		var replyToID, replyContent *string
		err := rows.Scan(&msg.ID, &msg.SenderID, &msg.RecipientID, &msg.Content,
			&msg.ContentType, &msg.Encrypted, &msg.Timestamp, &msg.Status, &msg.MessageType,
			&replyToID, &replyContent)
		if err != nil {
			continue
		}
		msg.ReplyToID = replyToID
		msg.ReplyToContent = replyContent
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

	// Broadcast user online status
	s.broadcastUserStatus(userID, true)

	// Set user as online in Redis
	if s.redis != nil {
		s.redis.Set(c.Request.Context(), fmt.Sprintf("online:%s", userID), "true", 5*time.Minute)
	}

	// Send any pending messages
	s.sendPendingMessages(conn, userID)

	// Keep connection alive with pings
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := conn.WriteJSON(map[string]string{"type": "ping"}); err != nil {
					return
				}
			}
		}
	}()

	// Listen for messages
	for {
		var wsMsg map[string]interface{}
		err := conn.ReadJSON(&wsMsg)
		if err != nil {
			break
		}

		// Handle different message types
		msgType, ok := wsMsg["type"].(string)
		if !ok {
			continue
		}

		switch msgType {
		case "message_read":
			// Handle read receipt
			if messageID, ok := wsMsg["messageId"].(string); ok {
				s.notifyStatusUpdate(messageID, "read")
			}
		case "typing":
			// Handle typing indicator
			if recipientID, ok := wsMsg["recipientId"].(string); ok {
				isTyping := true
				if val, exists := wsMsg["isTyping"].(bool); exists {
					isTyping = val
				}
				s.handleTypingIndicator(userID, recipientID, isTyping)
			}
		case "heartbeat":
			// Update last seen timestamp
			s.updateLastSeen(userID)
			if s.redis != nil {
				s.redis.Set(c.Request.Context(), fmt.Sprintf("online:%s", userID), "true", 90*time.Second)
			}
		case "pong":
			// Handle ping response
			continue
		}
	}

	// Set user as offline and broadcast
	if s.redis != nil {
		s.redis.Delete(c.Request.Context(), fmt.Sprintf("online:%s", userID))
	}
	// Update last seen in database
	s.updateLastSeen(userID)
	s.broadcastUserStatus(userID, false)

	// Clear typing status
	delete(s.typingStatus, userID)
}

// deliverMessage attempts to deliver a message to the recipient if online
func (s *Service) deliverMessage(msg Message) {
	if conn, ok := s.clients[msg.RecipientID]; ok {
		// Recipient is online, send via WebSocket
		notification := map[string]interface{}{
			"type":        "new_message",
			"id":          msg.ID,
			"senderId":    msg.SenderID,
			"recipientId": msg.RecipientID,
			"content":     msg.Content,
			"timestamp":   msg.Timestamp,
			"encrypted":   msg.Encrypted,
			"status":      "delivered",
		}
		conn.WriteJSON(notification)

		// Notify sender that message was delivered
		if senderConn, ok := s.clients[msg.SenderID]; ok {
			statusUpdate := map[string]interface{}{
				"type":      "status_update",
				"messageId": msg.ID,
				"status":    "delivered",
			}
			senderConn.WriteJSON(statusUpdate)
		}
	}
	// If offline, message is already stored in database for later retrieval
}

// sendPendingMessages sends any pending messages to a newly connected user
func (s *Service) sendPendingMessages(conn *websocket.Conn, userID string) {
	query := `
		SELECT id, sender_id, recipient_id, content, content_type, encrypted, timestamp, status, message_type
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
		err := rows.Scan(&msg.ID, &msg.SenderID, &msg.RecipientID, &msg.Content,
			&msg.ContentType, &msg.Encrypted, &msg.Timestamp, &msg.Status, &msg.MessageType)
		if err != nil {
			continue
		}
		conn.WriteJSON(msg)
	}
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

// broadcastUserStatus notifies all relevant users about online/offline status
func (s *Service) broadcastUserStatus(userID string, online bool) {
	// Get all users who have conversations with this user
	query := `
		SELECT DISTINCT 
			CASE 
				WHEN sender_id = $1 THEN recipient_id
				ELSE sender_id
			END as other_user_id
		FROM messages
		WHERE sender_id = $1 OR recipient_id = $1
	`
	rows, err := s.db.Query(query, userID)
	if err != nil {
		return
	}
	defer rows.Close()

	statusType := "user_offline"
	if online {
		statusType = "user_online"
	}

	notification := map[string]interface{}{
		"type":   statusType,
		"userId": userID,
	}

	if !online {
		// Get last seen from database
		var lastSeen time.Time
		query := `SELECT last_seen FROM users WHERE id = $1`
		s.db.QueryRow(query, userID).Scan(&lastSeen)
		notification["lastSeen"] = lastSeen
	}

	for rows.Next() {
		var otherUserID string
		if err := rows.Scan(&otherUserID); err != nil {
			continue
		}

		// Notify if the other user is online
		if conn, ok := s.clients[otherUserID]; ok {
			conn.WriteJSON(notification)
		}
	}
}

// handleTypingIndicator broadcasts typing status to recipient
func (s *Service) handleTypingIndicator(userID, recipientID string, isTyping bool) {
	// Initialize typing status map for user if not exists
	if s.typingStatus[userID] == nil {
		s.typingStatus[userID] = make(map[string]bool)
	}
	s.typingStatus[userID][recipientID] = isTyping

	// Notify recipient if online
	if conn, ok := s.clients[recipientID]; ok {
		notification := map[string]interface{}{
			"type":     "typing",
			"userId":   userID,
			"isTyping": isTyping,
		}
		conn.WriteJSON(notification)
	}
}

// updateLastSeen updates user's last seen timestamp in database
func (s *Service) updateLastSeen(userID string) {
	query := `UPDATE users SET last_seen = $1 WHERE id = $2`
	_, err := s.db.Exec(query, time.Now(), userID)
	if err != nil {
		log.Printf("Failed to update last seen for user %s: %v", userID, err)
	}
}

// AddReactionRequest represents a request to add a reaction to a message
type AddReactionRequest struct {
	MessageID string `json:"messageId" binding:"required"`
	Emoji     string `json:"emoji" binding:"required"`
}

// AddReaction adds a reaction to a message
func (s *Service) AddReaction(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req AddReactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate reaction ID
	reactionID := uuid.New().String()

	// Check if user already reacted to this message
	var existingID string
	checkQuery := `SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2`
	err := s.db.QueryRow(checkQuery, req.MessageID, userID).Scan(&existingID)

	if err == nil {
		// Update existing reaction
		updateQuery := `UPDATE message_reactions SET emoji = $1 WHERE id = $2`
		_, err = s.db.Exec(updateQuery, req.Emoji, existingID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update reaction"})
			return
		}
		reactionID = existingID
	} else {
		// Insert new reaction
		insertQuery := `INSERT INTO message_reactions (id, message_id, user_id, emoji, created_at) VALUES ($1, $2, $3, $4, $5)`
		_, err = s.db.Exec(insertQuery, reactionID, req.MessageID, userID, req.Emoji, time.Now())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add reaction"})
			return
		}
	}

	// Get username for notification
	var username string
	s.db.QueryRow(`SELECT username FROM users WHERE id = $1`, userID).Scan(&username)

	// Broadcast reaction to other users via WebSocket
	s.broadcastReaction(req.MessageID, userID, username, req.Emoji, "add")

	c.JSON(http.StatusOK, gin.H{
		"id":        reactionID,
		"messageId": req.MessageID,
		"emoji":     req.Emoji,
	})
}

// RemoveReaction removes a reaction from a message
func (s *Service) RemoveReaction(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	messageID := c.Param("messageId")
	if messageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "messageId required"})
		return
	}

	// Delete reaction
	deleteQuery := `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2`
	_, err := s.db.Exec(deleteQuery, messageID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove reaction"})
		return
	}

	// Get username for notification
	var username string
	s.db.QueryRow(`SELECT username FROM users WHERE id = $1`, userID).Scan(&username)

	// Broadcast reaction removal
	s.broadcastReaction(messageID, userID, username, "", "remove")

	c.JSON(http.StatusOK, gin.H{"message": "reaction removed"})
}

// GetMessageReactions gets all reactions for a message
func (s *Service) GetMessageReactions(c *gin.Context) {
	messageID := c.Param("messageId")
	if messageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "messageId required"})
		return
	}

	query := `
		SELECT r.id, r.message_id, r.user_id, u.username, r.emoji, r.created_at
		FROM message_reactions r
		JOIN users u ON r.user_id = u.id
		WHERE r.message_id = $1
		ORDER BY r.created_at ASC
	`
	rows, err := s.db.Query(query, messageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get reactions"})
		return
	}
	defer rows.Close()

	reactions := []Reaction{}
	for rows.Next() {
		var r Reaction
		err := rows.Scan(&r.ID, &r.MessageID, &r.UserID, &r.Username, &r.Emoji, &r.CreatedAt)
		if err != nil {
			continue
		}
		reactions = append(reactions, r)
	}

	c.JSON(http.StatusOK, gin.H{"reactions": reactions})
}

// broadcastReaction notifies users about reaction changes
func (s *Service) broadcastReaction(messageID, userID, username, emoji, action string) {
	// Get message details to find sender and recipient
	var senderID, recipientID string
	query := `SELECT sender_id, recipient_id FROM messages WHERE id = $1`
	s.db.QueryRow(query, messageID).Scan(&senderID, &recipientID)

	notification := map[string]interface{}{
		"type":      "reaction",
		"action":    action,
		"messageId": messageID,
		"userId":    userID,
		"username":  username,
		"emoji":     emoji,
	}

	// Notify sender if different from reactor
	if senderID != userID {
		if conn, ok := s.clients[senderID]; ok {
			conn.WriteJSON(notification)
		}
	}

	// Notify recipient if different from reactor
	if recipientID != userID {
		if conn, ok := s.clients[recipientID]; ok {
			conn.WriteJSON(notification)
		}
	}
}
