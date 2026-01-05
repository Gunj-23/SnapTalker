package calls

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/snaptalker/backend/pkg/storage"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Service handles WebRTC signaling
type Service struct {
	redis   *storage.RedisClient
	clients map[string]*websocket.Conn // userID -> websocket connection
}

// NewService creates a new calls service
func NewService(redis *storage.RedisClient) *Service {
	return &Service{
		redis:   redis,
		clients: make(map[string]*websocket.Conn),
	}
}

// SignalMessage represents a WebRTC signaling message
type SignalMessage struct {
	Type      string                 `json:"type"`      // offer, answer, ice-candidate, call, accept, reject, end
	From      string                 `json:"from"`      // Sender user ID
	To        string                 `json:"to"`        // Recipient user ID
	Data      map[string]interface{} `json:"data"`      // SDP, ICE candidate, etc.
	CallID    string                 `json:"callId"`    // Unique call identifier
	Timestamp int64                  `json:"timestamp"` // Unix timestamp
}

// SignalingWebSocket handles WebRTC signaling via WebSocket
func (s *Service) SignalingWebSocket(c *gin.Context) {
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

	// Listen for signaling messages
	for {
		var msg SignalMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			break
		}

		// Set sender ID
		msg.From = userID

		// Route message to recipient
		s.routeSignalMessage(msg)
	}
}

// ExchangeICECandidates handles ICE candidate exchange
func (s *Service) ExchangeICECandidates(c *gin.Context) {
	userID := c.GetString("userId")
	
	var req struct {
		To        string                 `json:"to" binding:"required"`
		CallID    string                 `json:"callId" binding:"required"`
		Candidate map[string]interface{} `json:"candidate" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msg := SignalMessage{
		Type:   "ice-candidate",
		From:   userID,
		To:     req.To,
		CallID: req.CallID,
		Data:   map[string]interface{}{"candidate": req.Candidate},
	}

	s.routeSignalMessage(msg)
	c.JSON(http.StatusOK, gin.H{"message": "ICE candidate sent"})
}

// SendOffer sends a call offer
func (s *Service) SendOffer(c *gin.Context) {
	userID := c.GetString("userId")
	
	var req struct {
		To     string                 `json:"to" binding:"required"`
		CallID string                 `json:"callId" binding:"required"`
		SDP    map[string]interface{} `json:"sdp" binding:"required"`
		Type   string                 `json:"type"` // audio, video, screen
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msg := SignalMessage{
		Type:   "offer",
		From:   userID,
		To:     req.To,
		CallID: req.CallID,
		Data: map[string]interface{}{
			"sdp":      req.SDP,
			"callType": req.Type,
		},
	}

	s.routeSignalMessage(msg)
	
	// Store call info in Redis for tracking
	callInfo := map[string]string{
		"caller":   userID,
		"callee":   req.To,
		"callType": req.Type,
		"status":   "ringing",
	}
	callJSON, _ := json.Marshal(callInfo)
	if s.redis != nil {
		s.redis.Set(c.Request.Context(), fmt.Sprintf("call:%s", req.CallID), callJSON, 5*time.Minute)
	}

	c.JSON(http.StatusOK, gin.H{"message": "offer sent"})
}

// SendAnswer sends a call answer
func (s *Service) SendAnswer(c *gin.Context) {
	userID := c.GetString("userId")
	
	var req struct {
		To     string                 `json:"to" binding:"required"`
		CallID string                 `json:"callId" binding:"required"`
		SDP    map[string]interface{} `json:"sdp" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msg := SignalMessage{
		Type:   "answer",
		From:   userID,
		To:     req.To,
		CallID: req.CallID,
		Data:   map[string]interface{}{"sdp": req.SDP},
	}

	s.routeSignalMessage(msg)
	
	// Update call status in Redis
	callKey := fmt.Sprintf("call:%s", req.CallID)
	if s.redis != nil {
		s.redis.Set(c.Request.Context(), callKey+":status", "connected", 2*time.Hour)
	}

	c.JSON(http.StatusOK, gin.H{"message": "answer sent"})
}

// routeSignalMessage routes a signaling message to the recipient
func (s *Service) routeSignalMessage(msg SignalMessage) {
	if conn, ok := s.clients[msg.To]; ok {
		// Recipient is online, send via WebSocket
		conn.WriteJSON(msg)
	} else {
		// Recipient is offline, could store for later or send push notification
		// For now, just log it
		fmt.Printf("User %s is offline, cannot deliver %s message\n", msg.To, msg.Type)
	}
}
