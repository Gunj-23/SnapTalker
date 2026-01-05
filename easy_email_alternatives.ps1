Write-Host "`n=== ALTERNATIVE: Use Free SMTP Services ===" -ForegroundColor Cyan

Write-Host "`nGmail App Passwords not working? Here are easier alternatives:" -ForegroundColor Yellow

Write-Host "`n=== OPTION 1: Brevo (Formerly Sendinblue) - EASIEST ===" -ForegroundColor Green

Write-Host "`n1. Sign up (Free - 300 emails/day):" -ForegroundColor White
Write-Host "   https://app.brevo.com/account/register" -ForegroundColor Cyan

Write-Host "`n2. After signing up:" -ForegroundColor White
Write-Host "   - Go to: Settings → SMTP & API" -ForegroundColor Gray
Write-Host "   - Click 'Generate a new SMTP key'" -ForegroundColor Gray
Write-Host "   - Copy the credentials shown" -ForegroundColor Gray

Write-Host "`n3. Use these settings:" -ForegroundColor White
Write-Host @"
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USERNAME=<your-email-from-brevo>
   SMTP_PASSWORD=<smtp-key-from-brevo>
   FROM_EMAIL=<your-verified-email>
"@ -ForegroundColor Cyan

Write-Host "`n=== OPTION 2: Mailtrap (BEST for Testing) ===" -ForegroundColor Green

Write-Host "`n1. Sign up (Free):" -ForegroundColor White
Write-Host "   https://mailtrap.io/register/signup" -ForegroundColor Cyan

Write-Host "`n2. After signing up:" -ForegroundColor White
Write-Host "   - You'll see 'My Inbox' automatically" -ForegroundColor Gray
Write-Host "   - Click 'Show Credentials'" -ForegroundColor Gray
Write-Host "   - Copy the SMTP settings" -ForegroundColor Gray

Write-Host "`n3. Settings (will be shown in dashboard):" -ForegroundColor White
Write-Host @"
   SMTP_HOST=sandbox.smtp.mailtrap.io
   SMTP_PORT=587
   SMTP_USERNAME=<from-mailtrap-dashboard>
   SMTP_PASSWORD=<from-mailtrap-dashboard>
   FROM_EMAIL=test@snaptalker.com
"@ -ForegroundColor Cyan

Write-Host "   Benefits: Emails go to Mailtrap inbox (not real email)" -ForegroundColor Green
Write-Host "   Perfect for testing!" -ForegroundColor Green

Write-Host "`n=== OPTION 3: Resend (Modern & Simple) ===" -ForegroundColor Green

Write-Host "`n1. Sign up (Free - 3000 emails/month):" -ForegroundColor White
Write-Host "   https://resend.com/signup" -ForegroundColor Cyan

Write-Host "`n2. Get API key from dashboard" -ForegroundColor White
Write-Host "   (They use API, not SMTP)" -ForegroundColor Gray

Write-Host "`n=== EASIEST: Just Test Without Email ===" -ForegroundColor Yellow

Write-Host "`nYou don't need email for testing!" -ForegroundColor Green
Write-Host "The OTP will print in the backend console." -ForegroundColor White

Write-Host "`nHere's how:" -ForegroundColor White
Write-Host "  1. Don't add any SMTP settings to .env" -ForegroundColor Gray
Write-Host "  2. Start backend server" -ForegroundColor Gray
Write-Host "  3. Try forgot password on frontend" -ForegroundColor Gray
Write-Host "  4. Look at backend terminal - OTP will be printed there!" -ForegroundColor Green
Write-Host "  5. Copy the OTP and use it in the frontend" -ForegroundColor Gray

Write-Host "`n=== MY RECOMMENDATION ===" -ForegroundColor Cyan

Write-Host "`nFor Development/Testing:" -ForegroundColor Yellow
Write-Host "  Use Mailtrap (easiest, catches all emails)" -ForegroundColor Green
Write-Host "  OR just use console output (no setup needed!)" -ForegroundColor Green

Write-Host "`nFor Production:" -ForegroundColor Yellow
Write-Host "  Use Brevo (free 300 emails/day, reliable)" -ForegroundColor Green
Write-Host "  OR Resend (modern, developer-friendly)" -ForegroundColor Green

Write-Host "`n=== QUICK SETUP: MAILTRAP (2 MINUTES) ===" -ForegroundColor Green

Write-Host "`n1. Go to: https://mailtrap.io/register/signup" -ForegroundColor Cyan
Write-Host "2. Sign up with email/Google/GitHub" -ForegroundColor White
Write-Host "3. You'll see 'My Inbox' with SMTP credentials" -ForegroundColor White
Write-Host "4. Click 'Show Credentials' and copy them" -ForegroundColor White
Write-Host "5. Add to backend-go/.env:" -ForegroundColor White

$mailtrapExample = @"

SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USERNAME=<your-username>
SMTP_PASSWORD=<your-password>
FROM_EMAIL=test@snaptalker.com

"@
Write-Host $mailtrapExample -ForegroundColor Cyan

Write-Host "6. Restart backend" -ForegroundColor White
Write-Host "7. All emails will appear in Mailtrap inbox (not real email)" -ForegroundColor Green

Write-Host "`n=== OR SKIP EMAIL SETUP ENTIRELY ===" -ForegroundColor Yellow
Write-Host "`nJust run without SMTP config - OTP prints to console!" -ForegroundColor Green
Write-Host "Check the backend terminal after clicking 'Send OTP'" -ForegroundColor White

Write-Host ""
