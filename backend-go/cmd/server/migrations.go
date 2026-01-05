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

	if tableExists {
		// Check if it has the old receiver_id column
		var hasReceiverID bool
		db.QueryRow("SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'receiver_id')").Scan(&hasReceiverID)

		if hasReceiverID {
			log.Println("Migrating old schema: renaming receiver_id to recipient_id...")
			// Drop old table and recreate with new schema
			db.Exec("DROP TABLE IF EXISTS messages")
		}
	}

	// Create messages table with new schema
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS messages (
			id TEXT PRIMARY KEY,
			sender_id TEXT NOT NULL,
			recipient_id TEXT NOT NULL,
			encrypted_content TEXT NOT NULL,
			iv TEXT NOT NULL,
			message_number INTEGER NOT NULL,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			status TEXT DEFAULT 'sent',
			media_url TEXT
		)
	`)
	if err != nil {
		log.Printf("Failed to create messages table: %v", err)
		return err
	}

	// Create indexes
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON messages(sender_id, recipient_id)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC)`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_pre_keys_user_id ON pre_keys(user_id)`)

	// Add password reset columns to users table
	db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`)
	db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL`)

	log.Println("Database migrations completed successfully")
	return nil
}
