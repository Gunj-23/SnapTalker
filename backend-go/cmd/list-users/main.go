package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
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

	rows, err := db.Query(`SELECT id, username, phone, email, created_at FROM users ORDER BY created_at DESC LIMIT 200`)
	if err != nil {
		log.Fatalf("query failed: %v", err)
	}
	defer rows.Close()

	fmt.Printf("%-36s  %-20s  %-15s  %-30s  %-20s\n", "id", "username", "phone", "email", "created_at")
	fmt.Println("---------------------------------------------------------------------------------------------------------------------------------")

	for rows.Next() {
		var id, username, phone, email sql.NullString
		var createdAt time.Time
		if err := rows.Scan(&id, &username, &phone, &email, &createdAt); err != nil {
			log.Printf("scan error: %v", err)
			continue
		}
		fmt.Printf("%-36s  %-20s  %-15s  %-30s  %-20s\n",
			id.String, username.String, phone.String, email.String, createdAt.Format(time.RFC3339))
	}

	if err := rows.Err(); err != nil {
		log.Fatalf("rows error: %v", err)
	}
}
