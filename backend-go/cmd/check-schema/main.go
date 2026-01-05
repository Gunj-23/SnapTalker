package main

import (
	"fmt"
	"log"
	"os"

	"github.com/snaptalker/backend/pkg/storage"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	db, err := storage.NewPostgresDB(dbURL)
	if err != nil {
		log.Fatalf("failed to connect to db: %v", err)
	}
	defer db.Close()

	// Check messages table columns
	rows, err := db.Query(`
		SELECT column_name, data_type, is_nullable, COALESCE(column_default, '')
		FROM information_schema.columns
		WHERE table_name = 'messages'
		ORDER BY ordinal_position
	`)
	if err != nil {
		log.Fatalf("query failed: %v", err)
	}
	defer rows.Close()

	fmt.Println("MESSAGES TABLE SCHEMA:")
	fmt.Println("======================")
	for rows.Next() {
		var name, dataType, nullable, defaultVal string
		if err := rows.Scan(&name, &dataType, &nullable, &defaultVal); err != nil {
			log.Printf("scan error: %v", err)
			continue
		}
		fmt.Printf("%-20s %-15s nullable=%s default=%s\n", name, dataType, nullable, defaultVal)
	}
}
