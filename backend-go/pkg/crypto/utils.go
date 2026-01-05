package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"

	"golang.org/x/crypto/hkdf"
	"golang.org/x/crypto/pbkdf2"
)

// GenerateRandomBytes generates cryptographically secure random bytes
func GenerateRandomBytes(n int) ([]byte, error) {
	bytes := make([]byte, n)
	if _, err := rand.Read(bytes); err != nil {
		return nil, err
	}
	return bytes, nil
}

// GenerateSalt generates a random salt for key derivation
func GenerateSalt() ([]byte, error) {
	return GenerateRandomBytes(32)
}

// DeriveKey derives a key from a password using PBKDF2
func DeriveKey(password string, salt []byte, iterations int, keyLen int) []byte {
	return pbkdf2.Key([]byte(password), salt, iterations, keyLen, sha256.New)
}

// HKDF performs HMAC-based Key Derivation Function
func HKDF(inputKeyMaterial, salt, info []byte, length int) ([]byte, error) {
	hash := sha256.New
	hkdf := hkdf.New(hash, inputKeyMaterial, salt, info)
	key := make([]byte, length)
	if _, err := io.ReadFull(hkdf, key); err != nil {
		return nil, err
	}
	return key, nil
}

// EncryptAESGCM encrypts data using AES-GCM
func EncryptAESGCM(key, plaintext []byte) (ciphertext, nonce []byte, err error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, err
	}

	nonce = make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, nil, err
	}

	ciphertext = gcm.Seal(nil, nonce, plaintext, nil)
	return ciphertext, nonce, nil
}

// DecryptAESGCM decrypts data using AES-GCM
func DecryptAESGCM(key, ciphertext, nonce []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
}

// Hash computes SHA-256 hash of data
func Hash(data []byte) []byte {
	hash := sha256.Sum256(data)
	return hash[:]
}

// HashString computes SHA-256 hash and returns hex string
func HashString(data string) string {
	hash := Hash([]byte(data))
	return hex.EncodeToString(hash)
}

// EncryptWithPassword encrypts data with a password
func EncryptWithPassword(password string, plaintext []byte) (string, error) {
	salt, err := GenerateSalt()
	if err != nil {
		return "", err
	}

	key := DeriveKey(password, salt, 100000, 32)
	ciphertext, nonce, err := EncryptAESGCM(key, plaintext)
	if err != nil {
		return "", err
	}

	// Combine salt + nonce + ciphertext
	combined := append(salt, nonce...)
	combined = append(combined, ciphertext...)

	return base64.StdEncoding.EncodeToString(combined), nil
}

// DecryptWithPassword decrypts data with a password
func DecryptWithPassword(password string, encrypted string) ([]byte, error) {
	combined, err := base64.StdEncoding.DecodeString(encrypted)
	if err != nil {
		return nil, err
	}

	if len(combined) < 32+12 {
		return nil, fmt.Errorf("invalid encrypted data")
	}

	salt := combined[:32]
	nonce := combined[32:44]
	ciphertext := combined[44:]

	key := DeriveKey(password, salt, 100000, 32)
	plaintext, err := DecryptAESGCM(key, ciphertext, nonce)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
}

// GenerateNonce generates a random nonce for encryption
func GenerateNonce(size int) ([]byte, error) {
	nonce := make([]byte, size)
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return nonce, nil
}

// SecureCompare performs constant-time comparison of two byte slices
func SecureCompare(a, b []byte) bool {
	if len(a) != len(b) {
		return false
	}
	var result byte
	for i := 0; i < len(a); i++ {
		result |= a[i] ^ b[i]
	}
	return result == 0
}
