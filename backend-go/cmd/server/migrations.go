package main

import (
	"log"

	"github.com/snaptalker/backend/pkg/storage"
)

func runMigrations(db *storage.PostgresDB) error {
	log.Println("Running database migrations...")

	// Create users table
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL UNIQUE,
			phone TEXT NOT NULL UNIQUE,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			identity_key TEXT,
			signed_prekey_id INTEGER DEFAULT 0,
			signed_prekey TEXT,
			signed_prekey_signature TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Printf("Failed to create users table: %v", err)
		return err
	}

	// Create pre_keys table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS pre_keys (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id),
			key_id INTEGER NOT NULL,
			public_key TEXT NOT NULL,
			used BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, key_id)
		)
	`)
	if err != nil {
		log.Printf("Failed to create pre_keys table: %v", err)
		return err
	}

	// Check if messages table exists and has old schema
	var tableExists bool
	err = db.QueryRow("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages')").Scan(&tableExists)
	if err != nil {
		return err
	}

	if !tableExists {
		// Create messages table with production schema
		_, err = db.Exec(`
			CREATE TABLE IF NOT EXISTS messages (
				id TEXT PRIMARY KEY,
				sender_id TEXT NOT NULL,
				recipient_id TEXT NOT NULL,
				content TEXT NOT NULL,
				content_type TEXT DEFAULT 'text',
				encrypted BOOLEAN DEFAULT TRUE,
				timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				status TEXT DEFAULT 'sent',
				message_type TEXT DEFAULT 'one_to_one'
			)
		`)
		if err != nil {
			log.Printf("Failed to create messages table: %v", err)
			return err
		}
	}

	// Create indexes
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON messages(sender_id, recipient_id)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_pre_keys_user_id ON pre_keys(user_id)`)

	// Add password reset columns to users table
	db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`)
	db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL`)

	// Add last_seen column for online/offline tracking
	db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP`)

	// Create message reactions table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS message_reactions (
			id TEXT PRIMARY KEY,
			message_id TEXT NOT NULL,
			user_id TEXT NOT NULL REFERENCES users(id),
			emoji TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(message_id, user_id)
		)
	`)
	if err != nil {
		log.Printf("Failed to create message_reactions table: %v", err)
		return err
	}

	// Create indexes for reactions
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON message_reactions(message_id)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON message_reactions(user_id)`)

	log.Println("Database migrations completed successfully")
	return nil
}
