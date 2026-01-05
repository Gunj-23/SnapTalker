package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/snaptalker/backend/pkg/storage"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Get database URL
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	log.Printf("Connecting to database...")

	// Connect to database
	db, err := storage.NewPostgresDB(dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("✅ Connected successfully!")
	log.Println("Creating tables...")

	// Create users table
	_, err = db.Exec(`
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
		log.Fatalf("Failed to create users table: %v", err)
	}
	log.Println("✅ users table created")

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
		log.Fatalf("Failed to create pre_keys table: %v", err)
	}
	log.Println("✅ pre_keys table created")

	// Create messages table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS messages (
			id TEXT PRIMARY KEY,
			sender_id TEXT NOT NULL REFERENCES users(id),
			recipient_id TEXT NOT NULL REFERENCES users(id),
			content TEXT NOT NULL,
			content_type TEXT DEFAULT 'text',
			encrypted BOOLEAN DEFAULT TRUE,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			status TEXT DEFAULT 'sent',
			message_type TEXT DEFAULT 'one_to_one'
		)
	`)
	if err != nil {
		log.Fatalf("Failed to create messages table: %v", err)
	}
	log.Println("✅ messages table created")

	// Create key_bundles table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS key_bundles (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id),
			identity_key TEXT NOT NULL,
			signed_prekey_id INTEGER NOT NULL,
			signed_prekey TEXT NOT NULL,
			signed_prekey_signature TEXT NOT NULL,
			one_time_prekey TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Fatalf("Failed to create key_bundles table: %v", err)
	}
	log.Println("✅ key_bundles table created")

	// Create indexes
	log.Println("Creating indexes...")

	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, timestamp DESC)",
		"CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, timestamp DESC)",
		"CREATE INDEX IF NOT EXISTS idx_pre_keys_user ON pre_keys(user_id, used)",
		"CREATE INDEX IF NOT EXISTS idx_key_bundles_user ON key_bundles(user_id)",
	}

	for _, indexSQL := range indexes {
		if _, err := db.Exec(indexSQL); err != nil {
			log.Printf("Warning: Failed to create index: %v", err)
		}
	}

	log.Println("✅ Indexes created")
	log.Println("\n🎉 Database setup complete!")
	log.Println("All tables and indexes have been created successfully.")
}
