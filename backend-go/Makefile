.PHONY: help build run test clean docker-up docker-down migrate

# Default target
help:
	@echo "Available targets:"
	@echo "  make build        - Build the Go application"
	@echo "  make run          - Run the application"
	@echo "  make test         - Run tests"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make docker-up    - Start Docker containers"
	@echo "  make docker-down  - Stop Docker containers"
	@echo "  make migrate      - Run database migrations"
	@echo "  make dev          - Run in development mode"

# Build the application
build:
	go build -o bin/server cmd/server/main.go

# Run the application
run:
	go run cmd/server/main.go

# Run tests
test:
	go test -v ./...

# Clean build artifacts
clean:
	rm -rf bin/
	go clean

# Start Docker containers
docker-up:
	docker-compose up -d

# Stop Docker containers
docker-down:
	docker-compose down

# Start Docker containers with logs
docker-logs:
	docker-compose up

# Run database migrations
migrate:
	@echo "Running database migrations..."
	go run cmd/migrate/main.go

# Development mode with hot reload
dev:
	air

# Install dependencies
deps:
	go mod download
	go mod verify

# Tidy dependencies
tidy:
	go mod tidy

# Format code
fmt:
	go fmt ./...

# Lint code
lint:
	golangci-lint run

# Generate API documentation
docs:
	swag init -g cmd/server/main.go

# Build Docker image
docker-build:
	docker build -t snaptalker-backend:latest .

# Push Docker image
docker-push:
	docker push snaptalker-backend:latest

# Run all checks (format, lint, test)
check: fmt lint test

# Full setup (deps, build, test)
setup: deps build test
