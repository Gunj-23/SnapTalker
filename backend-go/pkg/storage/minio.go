package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// MinIOClient wraps a MinIO client
type MinIOClient struct {
	client     *minio.Client
	bucketName string
}

// MinIOConfig holds MinIO configuration
type MinIOConfig struct {
	Endpoint   string
	AccessKey  string
	SecretKey  string
	BucketName string
	UseSSL     bool
}

// NewMinIOClient creates a new MinIO client
func NewMinIOClient(config MinIOConfig) (*MinIOClient, error) {
	// Initialize MinIO client
	client, err := minio.New(config.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(config.AccessKey, config.SecretKey, ""),
		Secure: config.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	// Check if bucket exists, create if not
	ctx := context.Background()
	exists, err := client.BucketExists(ctx, config.BucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to check bucket: %w", err)
	}

	if !exists {
		err = client.MakeBucket(ctx, config.BucketName, minio.MakeBucketOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create bucket: %w", err)
		}
	}

	return &MinIOClient{
		client:     client,
		bucketName: config.BucketName,
	}, nil
}

// Upload uploads a file to MinIO
func (m *MinIOClient) Upload(ctx context.Context, objectName string, data []byte) (string, error) {
	reader := bytes.NewReader(data)
	_, err := m.client.PutObject(ctx, m.bucketName, objectName, reader, int64(len(data)), minio.PutObjectOptions{
		ContentType: "application/octet-stream",
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload object: %w", err)
	}

	// Return the URL
	url := fmt.Sprintf("https://%s/%s/%s", m.client.EndpointURL().Host, m.bucketName, objectName)
	return url, nil
}

// Download downloads a file from MinIO
func (m *MinIOClient) Download(ctx context.Context, objectName string) ([]byte, error) {
	object, err := m.client.GetObject(ctx, m.bucketName, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get object: %w", err)
	}
	defer object.Close()

	data, err := io.ReadAll(object)
	if err != nil {
		return nil, fmt.Errorf("failed to read object: %w", err)
	}

	return data, nil
}

// Delete deletes a file from MinIO
func (m *MinIOClient) Delete(ctx context.Context, objectName string) error {
	err := m.client.RemoveObject(ctx, m.bucketName, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete object: %w", err)
	}
	return nil
}

// GetPresignedURL generates a presigned URL for temporary access
func (m *MinIOClient) GetPresignedURL(ctx context.Context, objectName string, expiry int) (string, error) {
	url, err := m.client.PresignedGetObject(ctx, m.bucketName, objectName, time.Duration(expiry)*time.Second, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}
	return url.String(), nil
}
