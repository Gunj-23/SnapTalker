package storage

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

// PostgresDB wraps a PostgreSQL database connection
type PostgresDB struct {
	*sql.DB
}

// NewPostgresDB creates a new PostgreSQL database connection
func NewPostgresDB(connectionString string) (*PostgresDB, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	return &PostgresDB{db}, nil
}

// Begin starts a new transaction
func (db *PostgresDB) Begin() (*sql.Tx, error) {
	return db.DB.Begin()
}

// Ping checks if the database is alive
func (db *PostgresDB) Ping() error {
	return db.DB.Ping()
}

// Close closes the database connection
func (db *PostgresDB) Close() error {
	return db.DB.Close()
}

// Exec executes a query without returning rows
func (db *PostgresDB) Exec(query string, args ...interface{}) (sql.Result, error) {
	return db.DB.Exec(query, args...)
}

// Query executes a query that returns rows
func (db *PostgresDB) Query(query string, args ...interface{}) (*sql.Rows, error) {
	return db.DB.Query(query, args...)
}

// QueryRow executes a query that returns a single row
func (db *PostgresDB) QueryRow(query string, args ...interface{}) *sql.Row {
	return db.DB.QueryRow(query, args...)
}

// QueryContext executes a query with context
func (db *PostgresDB) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	return db.DB.QueryContext(ctx, query, args...)
}

// InitSchema initializes the database schema
func (db *PostgresDB) InitSchema() error {
	schema := `
	-- Users table
	CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY,
		username VARCHAR(50) UNIQUE NOT NULL,
		phone VARCHAR(20) UNIQUE NOT NULL,
		email VARCHAR(255) UNIQUE,
		password_hash TEXT NOT NULL,
		identity_key TEXT NOT NULL,
		signed_prekey_id INTEGER NOT NULL,
		signed_prekey TEXT NOT NULL,
		signed_prekey_signature TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT NOW(),
		updated_at TIMESTAMP DEFAULT NOW()
	);

	-- Pre-keys table
	CREATE TABLE IF NOT EXISTS prekeys (
		id SERIAL PRIMARY KEY,
		user_id UUID REFERENCES users(id) ON DELETE CASCADE,
		prekey_id INTEGER NOT NULL,
		public_key TEXT NOT NULL,
		is_used BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT NOW(),
		UNIQUE(user_id, prekey_id)
	);

	-- Messages table
	CREATE TABLE IF NOT EXISTS messages (
		id UUID PRIMARY KEY,
		sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
		recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
		encrypted_content TEXT NOT NULL,
		iv TEXT NOT NULL,
		message_number INTEGER NOT NULL,
		timestamp TIMESTAMP DEFAULT NOW(),
		status VARCHAR(20) DEFAULT 'sent',
		media_url TEXT,
		CONSTRAINT valid_status CHECK (status IN ('sent', 'delivered', 'read'))
	);

	-- Chats table
	CREATE TABLE IF NOT EXISTS chats (
		id UUID PRIMARY KEY,
		type VARCHAR(20) NOT NULL,
		encrypted_name TEXT,
		created_by UUID REFERENCES users(id),
		created_at TIMESTAMP DEFAULT NOW(),
		CONSTRAINT valid_chat_type CHECK (type IN ('direct', 'group'))
	);

	-- Chat members table
	CREATE TABLE IF NOT EXISTS chat_members (
		id SERIAL PRIMARY KEY,
		chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
		user_id UUID REFERENCES users(id) ON DELETE CASCADE,
		joined_at TIMESTAMP DEFAULT NOW(),
		role VARCHAR(20) DEFAULT 'member',
		UNIQUE(chat_id, user_id),
		CONSTRAINT valid_role CHECK (role IN ('admin', 'member'))
	);

	-- Devices table (for multi-device support)
	CREATE TABLE IF NOT EXISTS devices (
		id UUID PRIMARY KEY,
		user_id UUID REFERENCES users(id) ON DELETE CASCADE,
		device_name VARCHAR(100) NOT NULL,
		platform VARCHAR(20) NOT NULL,
		identity_key TEXT NOT NULL,
		last_seen TIMESTAMP DEFAULT NOW(),
		created_at TIMESTAMP DEFAULT NOW()
	);

	-- Create indexes for performance
	CREATE INDEX IF NOT EXISTS idx_messages_recipient_timestamp ON messages(recipient_id, timestamp DESC);
	CREATE INDEX IF NOT EXISTS idx_messages_sender_timestamp ON messages(sender_id, timestamp DESC);
	CREATE INDEX IF NOT EXISTS idx_prekeys_user_unused ON prekeys(user_id, is_used) WHERE is_used = false;
	CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
	CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
	`

	_, err := db.Exec(schema)
	return err
}
