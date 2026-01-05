Write-Host "`n=== HOW TO GET SMTP CREDENTIALS FOR EMAIL ===" -ForegroundColor Cyan

Write-Host "`n=== OPTION 1: Gmail (Recommended for Testing) ===" -ForegroundColor Yellow

Write-Host "`nStep 1: Enable 2-Step Verification" -ForegroundColor White
Write-Host "  1. Go to: https://myaccount.google.com/security" -ForegroundColor Cyan
Write-Host "  2. Find '2-Step Verification' and turn it ON" -ForegroundColor Gray
Write-Host "  3. Follow the setup process" -ForegroundColor Gray

Write-Host "`nStep 2: Generate App Password" -ForegroundColor White
Write-Host "  1. Go to: https://myaccount.google.com/apppasswords" -ForegroundColor Cyan
Write-Host "     (or search for 'App passwords' in Google Account settings)" -ForegroundColor Gray
Write-Host "  2. Select app: 'Mail'" -ForegroundColor Gray
Write-Host "  3. Select device: 'Other (Custom name)'" -ForegroundColor Gray
Write-Host "  4. Enter name: 'SnapTalker'" -ForegroundColor Gray
Write-Host "  5. Click 'Generate'" -ForegroundColor Gray
Write-Host "  6. Copy the 16-character password (spaces don't matter)" -ForegroundColor Green

Write-Host "`nStep 3: Update .env file" -ForegroundColor White
Write-Host @"
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USERNAME=your-email@gmail.com
  SMTP_PASSWORD=abcd efgh ijkl mnop  (the app password you copied)
  FROM_EMAIL=your-email@gmail.com
"@ -ForegroundColor Cyan

Write-Host "`n=== OPTION 2: Other Email Providers ===" -ForegroundColor Yellow

Write-Host "`nOutlook/Hotmail:" -ForegroundColor White
Write-Host "  SMTP_HOST=smtp.office365.com" -ForegroundColor Cyan
Write-Host "  SMTP_PORT=587" -ForegroundColor Cyan
Write-Host "  Use your Outlook email and password" -ForegroundColor Gray

Write-Host "`nYahoo Mail:" -ForegroundColor White
Write-Host "  SMTP_HOST=smtp.mail.yahoo.com" -ForegroundColor Cyan
Write-Host "  SMTP_PORT=587" -ForegroundColor Cyan
Write-Host "  Generate App Password at: https://login.yahoo.com/account/security" -ForegroundColor Gray

Write-Host "`n=== OPTION 3: Professional Email Services ===" -ForegroundColor Yellow

Write-Host "`nSendGrid (Free: 100 emails/day):" -ForegroundColor White
Write-Host "  1. Sign up: https://signup.sendgrid.com/" -ForegroundColor Cyan
Write-Host "  2. Create API Key" -ForegroundColor Gray
Write-Host "  3. Use SMTP Relay:" -ForegroundColor Gray
Write-Host "     SMTP_HOST=smtp.sendgrid.net" -ForegroundColor Cyan
Write-Host "     SMTP_PORT=587" -ForegroundColor Cyan
Write-Host "     SMTP_USERNAME=apikey" -ForegroundColor Cyan
Write-Host "     SMTP_PASSWORD=<your-sendgrid-api-key>" -ForegroundColor Cyan

Write-Host "`nMailgun (Free: 5000 emails/month):" -ForegroundColor White
Write-Host "  1. Sign up: https://signup.mailgun.com/" -ForegroundColor Cyan
Write-Host "  2. Get SMTP credentials from dashboard" -ForegroundColor Gray

Write-Host "`nResend (Free: 3000 emails/month):" -ForegroundColor White
Write-Host "  1. Sign up: https://resend.com/" -ForegroundColor Cyan
Write-Host "  2. Modern, developer-friendly" -ForegroundColor Gray

Write-Host "`n=== QUICK SETUP WITH GMAIL ===" -ForegroundColor Green

Write-Host "`n1. Go to App Passwords directly:" -ForegroundColor White
Write-Host "   https://myaccount.google.com/apppasswords" -ForegroundColor Cyan

Write-Host "`n2. If you see 'App passwords not available':" -ForegroundColor Yellow
Write-Host "   - Turn on 2-Step Verification first" -ForegroundColor Gray
Write-Host "   - Wait a few minutes" -ForegroundColor Gray
Write-Host "   - Try again" -ForegroundColor Gray

Write-Host "`n3. Once you have the app password:" -ForegroundColor White
$exampleEnv = @"

# Add these lines to backend-go/.env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=gunj@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
FROM_EMAIL=gunj@gmail.com

"@
Write-Host $exampleEnv -ForegroundColor Cyan

Write-Host "4. Restart the backend server" -ForegroundColor White

Write-Host "`n=== TESTING ===" -ForegroundColor Yellow
Write-Host "`nAfter adding SMTP config:" -ForegroundColor White
Write-Host "  1. Restart backend server" -ForegroundColor Gray
Write-Host "  2. Try forgot password feature" -ForegroundColor Gray
Write-Host "  3. Check your email inbox for OTP" -ForegroundColor Gray
Write-Host "  4. If no email, check backend console for errors" -ForegroundColor Gray

Write-Host "`nWithout SMTP config (Development):" -ForegroundColor White
Write-Host "  OTP will be printed in backend terminal" -ForegroundColor Green
Write-Host "  You can still test the feature!" -ForegroundColor Green

Write-Host "`n=== SECURITY NOTES ===" -ForegroundColor Red
Write-Host "  - Never commit .env file to Git!" -ForegroundColor Yellow
Write-Host "  - .env is already in .gitignore" -ForegroundColor Green
Write-Host "  - For production, add SMTP vars to Render dashboard" -ForegroundColor Yellow

Write-Host ""
