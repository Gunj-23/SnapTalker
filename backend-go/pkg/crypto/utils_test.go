package crypto

import (
	"testing"
)

func TestGenerateRandomBytes(t *testing.T) {
	tests := []struct {
		name string
		size int
	}{
		{"16 bytes", 16},
		{"32 bytes", 32},
		{"64 bytes", 64},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bytes, err := GenerateRandomBytes(tt.size)
			if err != nil {
				t.Errorf("GenerateRandomBytes() error = %v", err)
				return
			}
			if len(bytes) != tt.size {
				t.Errorf("GenerateRandomBytes() length = %v, want %v", len(bytes), tt.size)
			}
		})
	}
}

func TestGenerateSalt(t *testing.T) {
	salt, err := GenerateSalt()
	if err != nil {
		t.Errorf("GenerateSalt() error = %v", err)
		return
	}
	if len(salt) != 32 {
		t.Errorf("GenerateSalt() length = %v, want 32", len(salt))
	}
}

func TestEncryptDecryptAESGCM(t *testing.T) {
	key, _ := GenerateRandomBytes(32)
	plaintext := []byte("Hello, SnapTalker!")

	ciphertext, nonce, err := EncryptAESGCM(key, plaintext)
	if err != nil {
		t.Errorf("EncryptAESGCM() error = %v", err)
		return
	}

	decrypted, err := DecryptAESGCM(key, ciphertext, nonce)
	if err != nil {
		t.Errorf("DecryptAESGCM() error = %v", err)
		return
	}

	if string(decrypted) != string(plaintext) {
		t.Errorf("Decrypted text = %v, want %v", string(decrypted), string(plaintext))
	}
}

func TestDeriveKey(t *testing.T) {
	password := "test-password"
	salt, _ := GenerateSalt()

	key1 := DeriveKey(password, salt, 10000, 32)
	key2 := DeriveKey(password, salt, 10000, 32)

	if len(key1) != 32 {
		t.Errorf("DeriveKey() length = %v, want 32", len(key1))
	}

	if string(key1) != string(key2) {
		t.Error("DeriveKey() should produce same key for same inputs")
	}
}

func TestHKDF(t *testing.T) {
	ikm, _ := GenerateRandomBytes(32)
	salt, _ := GenerateSalt()
	info := []byte("test-info")

	key, err := HKDF(ikm, salt, info, 32)
	if err != nil {
		t.Errorf("HKDF() error = %v", err)
		return
	}

	if len(key) != 32 {
		t.Errorf("HKDF() length = %v, want 32", len(key))
	}
}

func TestHash(t *testing.T) {
	data := []byte("test data")
	hash := Hash(data)

	if len(hash) != 32 {
		t.Errorf("Hash() length = %v, want 32", len(hash))
	}

	// Same input should produce same hash
	hash2 := Hash(data)
	if string(hash) != string(hash2) {
		t.Error("Hash() should produce same output for same input")
	}
}

func TestEncryptDecryptWithPassword(t *testing.T) {
	password := "test-password-123"
	plaintext := []byte("Secure message")

	encrypted, err := EncryptWithPassword(password, plaintext)
	if err != nil {
		t.Errorf("EncryptWithPassword() error = %v", err)
		return
	}

	decrypted, err := DecryptWithPassword(password, encrypted)
	if err != nil {
		t.Errorf("DecryptWithPassword() error = %v", err)
		return
	}

	if string(decrypted) != string(plaintext) {
		t.Errorf("Decrypted = %v, want %v", string(decrypted), string(plaintext))
	}
}

func TestEncryptWithWrongPassword(t *testing.T) {
	password := "correct-password"
	wrongPassword := "wrong-password"
	plaintext := []byte("Secure message")

	encrypted, _ := EncryptWithPassword(password, plaintext)

	_, err := DecryptWithPassword(wrongPassword, encrypted)
	if err == nil {
		t.Error("DecryptWithPassword() should fail with wrong password")
	}
}

func TestSecureCompare(t *testing.T) {
	a := []byte("test")
	b := []byte("test")
	c := []byte("different")

	if !SecureCompare(a, b) {
		t.Error("SecureCompare() should return true for equal slices")
	}

	if SecureCompare(a, c) {
		t.Error("SecureCompare() should return false for different slices")
	}
}

// Benchmarks

func BenchmarkGenerateRandomBytes(b *testing.B) {
	for i := 0; i < b.N; i++ {
		GenerateRandomBytes(32)
	}
}

func BenchmarkEncryptAESGCM(b *testing.B) {
	key, _ := GenerateRandomBytes(32)
	plaintext := []byte("Benchmark test data")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		EncryptAESGCM(key, plaintext)
	}
}

func BenchmarkDecryptAESGCM(b *testing.B) {
	key, _ := GenerateRandomBytes(32)
	plaintext := []byte("Benchmark test data")
	ciphertext, nonce, _ := EncryptAESGCM(key, plaintext)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		DecryptAESGCM(key, ciphertext, nonce)
	}
}

func BenchmarkDeriveKey(b *testing.B) {
	password := "test-password"
	salt, _ := GenerateSalt()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		DeriveKey(password, salt, 10000, 32)
	}
}

func BenchmarkHKDF(b *testing.B) {
	ikm, _ := GenerateRandomBytes(32)
	salt, _ := GenerateSalt()
	info := []byte("test-info")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		HKDF(ikm, salt, info, 32)
	}
}
