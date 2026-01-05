#!/bin/sh
# Railway Deployment Script with Prisma

echo "Starting SnapTalker Backend Deployment..."

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma db push --accept-data-loss

# Generate Prisma Client
echo "Generating Prisma Client..."
go run github.com/steebchen/prisma-client-go generate

# Build the application
echo "Building Go application..."
go build -o server ./cmd/server

echo "Deployment complete!"
