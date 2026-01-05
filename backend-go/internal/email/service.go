package email

import (
	"fmt"
	"net/smtp"
	"os"
)

type Service struct {
	smtpHost     string
	smtpPort     string
	smtpUsername string
	smtpPassword string
	fromEmail    string
}

func NewService() *Service {
	return &Service{
		smtpHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		smtpPort:     getEnv("SMTP_PORT", "587"),
		smtpUsername: getEnv("SMTP_USERNAME", ""),
		smtpPassword: getEnv("SMTP_PASSWORD", ""),
		fromEmail:    getEnv("FROM_EMAIL", "noreply@snaptalker.com"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func (s *Service) SendOTP(toEmail, otp string) error {
	if s.smtpUsername == "" || s.smtpPassword == "" {
		// Email not configured - return OTP in console for development
		fmt.Printf("\n=== EMAIL NOT CONFIGURED ===\n")
		fmt.Printf("Would send OTP to: %s\n", toEmail)
		fmt.Printf("OTP Code: %s\n", otp)
		fmt.Printf("============================\n\n")
		return nil
	}

	// Email subject and body
	subject := "SnapTalker - Password Reset OTP"
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #FF9933 0%%, #138808 100%%); padding: 20px; border-radius: 10px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .otp-code { font-size: 32px; font-weight: bold; color: #FF9933; text-align: center; padding: 20px; background: #f9f9f9; border-radius: 10px; margin: 20px 0; letter-spacing: 8px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🇮🇳 SnapTalker</h1>
        </div>
        <h2>Password Reset Request</h2>
        <p>नमस्ते! We received a request to reset your password.</p>
        <p>Your OTP (One-Time Password) is:</p>
        <div class="otp-code">%s</div>
        <p><strong>This OTP will expire in 1 hour.</strong></p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <div class="footer">
            <p>Made with love in India | भारत में बनाया गया 🇮🇳</p>
            <p>This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>
`, otp)

	// Compose message
	message := []byte(fmt.Sprintf(
		"From: %s\r\n"+
			"To: %s\r\n"+
			"Subject: %s\r\n"+
			"MIME-Version: 1.0\r\n"+
			"Content-Type: text/html; charset=UTF-8\r\n"+
			"\r\n"+
			"%s\r\n",
		s.fromEmail, toEmail, subject, body,
	))

	// SMTP authentication
	auth := smtp.PlainAuth("", s.smtpUsername, s.smtpPassword, s.smtpHost)

	// Send email
	err := smtp.SendMail(
		s.smtpHost+":"+s.smtpPort,
		auth,
		s.fromEmail,
		[]string{toEmail},
		message,
	)

	if err != nil {
		fmt.Printf("Failed to send email to %s: %v\n", toEmail, err)
		return err
	}

	fmt.Printf("Email sent successfully to %s\n", toEmail)
	return nil
}
