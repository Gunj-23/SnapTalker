Write-Host "`n=== RENDER DEPLOYMENT FAILED - DATABASE CONNECTION ===" -ForegroundColor Red

Write-Host "`nProblem: Backend can't connect to database" -ForegroundColor Yellow
Write-Host "The DATABASE_URL environment variable is using OLD Supabase URL`n" -ForegroundColor Gray

Write-Host "=== IMMEDIATE FIX ===" -ForegroundColor Cyan
Write-Host "`nYou MUST update the DATABASE_URL in Render Dashboard:" -ForegroundColor White

Write-Host "`n1. Go to Render Dashboard:" -ForegroundColor Yellow
Write-Host "   https://dashboard.render.com/" -ForegroundColor Cyan

Write-Host "`n2. Find your backend service: snaptalker-backend" -ForegroundColor Yellow

Write-Host "`n3. Go to: Environment" -ForegroundColor Yellow

Write-Host "`n4. Update DATABASE_URL to:" -ForegroundColor Yellow
Write-Host "   postgresql://snaptalker_db_user:On6P9R6lRcTsQKwFUeMKoQyWTLbSA8w6@dpg-d5dm39shg0os73fbjirg-a.singapore-postgres.render.com/snaptalker_db" -ForegroundColor Green

Write-Host "`n5. Click 'Save Changes'" -ForegroundColor Yellow

Write-Host "`n6. Render will automatically redeploy" -ForegroundColor Yellow

Write-Host "`n=== ALTERNATIVE: Use Internal Connection (Faster) ===" -ForegroundColor Cyan
Write-Host "`nIf both backend and database are on Render:" -ForegroundColor White
Write-Host "   Use the INTERNAL connection string from Render database dashboard" -ForegroundColor Gray
Write-Host "   It will be faster and more reliable than external connection" -ForegroundColor Gray

Write-Host "`nTo get internal connection string:" -ForegroundColor Yellow
Write-Host "   1. Go to your PostgreSQL database in Render dashboard" -ForegroundColor White
Write-Host "   2. Click 'Info' or 'Connect'" -ForegroundColor White
Write-Host "   3. Copy the INTERNAL connection string" -ForegroundColor White
Write-Host "   4. Use that instead of the external one" -ForegroundColor White

Write-Host "`n=== Why render.yaml doesn't work ===" -ForegroundColor Cyan
Write-Host "render.yaml is only used for INITIAL deployment." -ForegroundColor Gray
Write-Host "After that, environment variables are managed in the dashboard." -ForegroundColor Gray
Write-Host "Changes to render.yaml won't update existing services!" -ForegroundColor Red

Write-Host "`n=== Current Status ===" -ForegroundColor Cyan
Write-Host "Backend: " -NoNewline
Write-Host "FAILING (can't connect to database)" -ForegroundColor Red
Write-Host "Database: " -NoNewline
Write-Host "ONLINE (but unreachable from backend)" -ForegroundColor Yellow
Write-Host "Frontend: " -NoNewline
Write-Host "ONLINE (but can't use backend)" -ForegroundColor Yellow

Write-Host "`n=== After fixing DATABASE_URL ===" -ForegroundColor Green
Write-Host "Wait 2-3 minutes for Render to redeploy" -ForegroundColor White
Write-Host "Then test: https://snaptalker-backend.onrender.com/health" -ForegroundColor Cyan

Write-Host ""
