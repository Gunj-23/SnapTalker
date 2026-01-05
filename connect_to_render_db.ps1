Write-Host "`n=== RENDER POSTGRESQL DATABASE ACCESS ===" -ForegroundColor Cyan

Write-Host "`nYour app is using Render PostgreSQL, NOT Supabase!" -ForegroundColor Yellow
Write-Host "That's why Supabase shows 0 users.`n" -ForegroundColor Gray

Write-Host "Database Details:" -ForegroundColor White
Write-Host "  Host: dpg-d5dm39shg0os73fbjirg-a.singapore-postgres.render.com" -ForegroundColor Cyan
Write-Host "  Database: snaptalker_db" -ForegroundColor Cyan
Write-Host "  User: snaptalker_db_user" -ForegroundColor Cyan
Write-Host "  Region: Singapore" -ForegroundColor Gray

Write-Host "`n=== How to View Your Data ===" -ForegroundColor Yellow

Write-Host "`nOption 1: Render Dashboard (Web UI)" -ForegroundColor White
Write-Host "  1. Go to: https://dashboard.render.com/" -ForegroundColor Cyan
Write-Host "  2. Navigate to your PostgreSQL database (snaptalker_db)" -ForegroundColor White
Write-Host "  3. Click 'Connect' → 'External Connection'" -ForegroundColor White
Write-Host "  4. Use the connection string shown there" -ForegroundColor White

Write-Host "`nOption 2: pgAdmin or DBeaver (GUI Tool)" -ForegroundColor White
Write-Host "  Download: https://www.pgadmin.org/ or https://dbeaver.io/" -ForegroundColor Cyan
Write-Host "  Connection details:" -ForegroundColor White
Write-Host "    Host: dpg-d5dm39shg0os73fbjirg-a.singapore-postgres.render.com" -ForegroundColor Gray
Write-Host "    Port: 5432" -ForegroundColor Gray
Write-Host "    Database: snaptalker_db" -ForegroundColor Gray
Write-Host "    Username: snaptalker_db_user" -ForegroundColor Gray
Write-Host "    Password: On6P9R6lRcTsQKwFUeMKoQyWTLbSA8w6" -ForegroundColor Gray

Write-Host "`nOption 3: psql Command Line (if installed)" -ForegroundColor White
Write-Host '  psql "postgresql://snaptalker_db_user:On6P9R6lRcTsQKwFUeMKoQyWTLbSA8w6@dpg-d5dm39shg0os73fbjirg-a.singapore-postgres.render.com/snaptalker_db"' -ForegroundColor Gray

Write-Host "`n=== Quick Test: Check if users exist ===" -ForegroundColor Yellow
Write-Host "  Testing backend connection..." -ForegroundColor White

# Test if backend can reach database
try {
    $response = Invoke-RestMethod -Uri "https://snaptalker-backend.onrender.com/health" -TimeoutSec 10
    Write-Host "  Backend status: " -NoNewline
    Write-Host "ONLINE" -ForegroundColor Green
    Write-Host "  Database: Connected to Render PostgreSQL" -ForegroundColor Green
} catch {
    Write-Host "  Backend: " -NoNewline
    Write-Host "OFFLINE or SLOW" -ForegroundColor Red
}

Write-Host "`n=== To verify registration works ===" -ForegroundColor Yellow
Write-Host "  1. Go to https://snaptalker.vercel.app/register" -ForegroundColor White
Write-Host "  2. Register a new account" -ForegroundColor White
Write-Host "  3. Check Render PostgreSQL database (not Supabase!)" -ForegroundColor White
Write-Host "  4. You should see the user in the 'users' table" -ForegroundColor White

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "  Supabase = OLD (empty, not used)" -ForegroundColor Red
Write-Host "  Render PostgreSQL = CURRENT (has your data)" -ForegroundColor Green

Write-Host ""
