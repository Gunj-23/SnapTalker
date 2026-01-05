Write-Host "`n=== HOW TO UPDATE ENVIRONMENT VARIABLES IN RENDER ===" -ForegroundColor Cyan

Write-Host "`nDetailed Step-by-Step:" -ForegroundColor Yellow

Write-Host "`n1. Go to: https://dashboard.render.com/" -ForegroundColor White
Write-Host "   Log in if needed" -ForegroundColor Gray

Write-Host "`n2. You should see a list of your services" -ForegroundColor White
Write-Host "   Look for: snaptalker-backend (Web Service)" -ForegroundColor Cyan

Write-Host "`n3. Click on the service name" -ForegroundColor White

Write-Host "`n4. In the left sidebar, you should see:" -ForegroundColor White
Write-Host "   - Events" -ForegroundColor Gray
Write-Host "   - Logs" -ForegroundColor Gray
Write-Host "   - Shell" -ForegroundColor Gray
Write-Host "   - Metrics" -ForegroundColor Gray
Write-Host "   - Settings <-- Click this one!" -ForegroundColor Green
Write-Host "   - Environment <-- Or this one!" -ForegroundColor Green

Write-Host "`n5. Click 'Environment' (might be under Settings)" -ForegroundColor White

Write-Host "`n6. You'll see a list of environment variables:" -ForegroundColor White
Write-Host "   - DATABASE_URL" -ForegroundColor Cyan
Write-Host "   - JWT_SECRET" -ForegroundColor Cyan
Write-Host "   - ENVIRONMENT" -ForegroundColor Cyan
Write-Host "   - PORT" -ForegroundColor Cyan

Write-Host "`n7. Click the pencil/edit icon next to DATABASE_URL" -ForegroundColor White

Write-Host "`n8. Replace the value with:" -ForegroundColor White
Write-Host "   postgresql://snaptalker_db_user:On6P9R6lRcTsQKwFUeMKoQyWTLbSA8w6@dpg-d5dm39shg0os73fbjirg-a.singapore-postgres.render.com/snaptalker_db" -ForegroundColor Green

Write-Host "`n9. Click 'Save Changes' at the bottom" -ForegroundColor White

Write-Host "`n=== IF YOU DON'T SEE 'Environment' TAB ===" -ForegroundColor Yellow

Write-Host "`nAlternative: Go to Settings and scroll down" -ForegroundColor White
Write-Host "You should see 'Environment Variables' section" -ForegroundColor Gray

Write-Host "`n=== IF STILL CAN'T FIND IT ===" -ForegroundColor Yellow

Write-Host "`nOption A: Delete and recreate service" -ForegroundColor White
Write-Host "  1. Go to Settings → scroll to bottom" -ForegroundColor Gray
Write-Host "  2. Click 'Delete Web Service'" -ForegroundColor Gray
Write-Host "  3. Create new service with correct DATABASE_URL" -ForegroundColor Gray

Write-Host "`nOption B: Use Render Blueprint (Infrastructure as Code)" -ForegroundColor White
Write-Host "  I'll update the render.yaml and create a NEW service" -ForegroundColor Gray

Write-Host "`n=== SCREENSHOT GUIDE ===" -ForegroundColor Cyan
Write-Host "The Render UI should look like this:" -ForegroundColor White
Write-Host "  Dashboard → [Your Service] → Left Sidebar → 'Environment' or 'Settings'" -ForegroundColor Gray

Write-Host "`nWhich option do you want to try?" -ForegroundColor Yellow
Write-Host "  1. Keep looking for Environment tab (check Settings)" -ForegroundColor White
Write-Host "  2. Delete service and recreate with correct config" -ForegroundColor White
Write-Host "  3. Create a new service using render.yaml blueprint" -ForegroundColor White

Write-Host ""
