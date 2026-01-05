# SnapTalker Backend (Go)

## Overview

High-performance backend for SnapTalker messaging platform, written in Go with gRPC and WebSocket support.

## Architecture

```
backend-go/
├── cmd/
│   └── server/          # Main application entry point
│       └── main.go
├── internal/
│   ├── signal/          # Signal Protocol key exchange
│   ├── messaging/       # Message routing and delivery
│   ├── calls/           # WebRTC signaling server
│   └── auth/            # Authentication & authorization
├── pkg/
│   ├── crypto/          # Cryptographic utilities
│   └── storage/         # Database abstraction layer
├── api/
│   └── proto/           # gRPC protocol definitions
└── config/              # Configuration files
```

## Requirements

- Go 1.21 or higher
- PostgreSQL 15+
- Redis 7+
- MinIO (for object storage)

## Installation

### 1. Install Go
```bash
# Windows (using Chocolatey)
choco install golang

# Or download from https://go.dev/dl/
```

### 2. Install Dependencies
```bash
cd backend-go
go mod download
```

### 3. Set up Database
```bash
# PostgreSQL
psql -U postgres -c "CREATE DATABASE snaptalker;"

# Run migrations
go run cmd/migrate/main.go
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 5. Run Server
```bash
go run cmd/server/main.go
```

## API Endpoints

### Signal Server (Key Exchange)
- `POST /api/v1/keys/upload` - Upload pre-key bundle
- `GET /api/v1/keys/bundle/:userId` - Fetch contact's bundle
- `POST /api/v1/keys/signed-prekey` - Rotate signed pre-key
- `DELETE /api/v1/keys/prekey/:id` - Mark one-time key as used

### Message Server
- `POST /api/v1/messages/send` - Send encrypted message
- `GET /api/v1/messages/:chatId` - Fetch messages
- `PUT /api/v1/messages/:id/status` - Update delivery status
- `WS /api/v1/messages/stream` - WebSocket for real-time

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login with credentials
- `POST /api/v1/auth/verify` - Verify OTP
- `POST /api/v1/auth/refresh` - Refresh JWT token

### WebRTC Signaling
- `WS /api/v1/calls/signal` - WebRTC signaling WebSocket
- `POST /api/v1/calls/ice` - Exchange ICE candidates
- `POST /api/v1/calls/offer` - Send call offer
- `POST /api/v1/calls/answer` - Send call answer

## gRPC Services

### MessageService
```protobuf
service MessageService {
  rpc SendMessage(SendMessageRequest) returns (SendMessageResponse);
  rpc GetMessages(GetMessagesRequest) returns (stream Message);
  rpc MarkDelivered(MarkDeliveredRequest) returns (Empty);
}
```

### KeyExchangeService
```protobuf
service KeyExchangeService {
  rpc UploadKeyBundle(UploadKeyBundleRequest) returns (Empty);
  rpc GetKeyBundle(GetKeyBundleRequest) returns (KeyBundle);
  rpc RotateSignedPreKey(RotateSignedPreKeyRequest) returns (Empty);
}
```

## Database Schema

### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    identity_key_public TEXT NOT NULL,
    signed_prekey_public TEXT NOT NULL,
    signed_prekey_signature TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### prekeys
```sql
CREATE TABLE prekeys (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    prekey_id INTEGER NOT NULL,
    public_key TEXT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, prekey_id)
);
```

### messages
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    sender_id UUID REFERENCES users(id),
    recipient_id UUID REFERENCES users(id),
    encrypted_content TEXT NOT NULL,
    iv TEXT NOT NULL,
    message_number INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent',
    INDEX idx_recipient_timestamp (recipient_id, timestamp)
);
```

## Performance

- **Target**: 1M messages/second
- **Latency**: <50ms p99
- **Concurrent Users**: 10M+

## Security

- TLS 1.3 for all connections
- JWT for authentication
- Rate limiting per user
- DDoS protection
- SQL injection prevention
- XSS protection

## Testing

```bash
# Unit tests
go test ./...

# Integration tests
go test -tags=integration ./...

# Load tests
go test -bench=. ./...
```

## Deployment

### Docker
```bash
docker build -t snaptalker-backend .
docker run -p 8080:8080 snaptalker-backend
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

## Monitoring

- Prometheus metrics on `/metrics`
- Health check on `/health`
- Grafana dashboards in `monitoring/`

## License

MIT License - See LICENSE file for details.
