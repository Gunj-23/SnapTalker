Write-Host "`n=== TEMPORARY FIX: Run Backend Locally ===" -ForegroundColor Cyan

Write-Host "`nSince Render backend is down, let's run it locally:" -ForegroundColor Yellow

Write-Host "`n1. Update local .env file" -ForegroundColor White
Write-Host "   Creating/updating backend-go/.env..." -ForegroundColor Gray

$envContent = @"
# Database
DATABASE_URL=postgresql://snaptalker_db_user:On6P9R6lRcTsQKwFUeMKoQyWTLbSA8w6@dpg-d5dm39shg0os73fbjirg-a.singapore-postgres.render.com/snaptalker_db

# JWT
JWT_SECRET=snaptalker-super-secret-jwt-key-for-production-2026-min-256-bits

# Server
PORT=8080
ENVIRONMENT=development

# Redis (optional - nil checks handle this)
REDIS_URL=

"@

$envContent | Out-File -FilePath "backend-go\.env" -Encoding UTF8 -NoNewline

Write-Host "   Created backend-go/.env" -ForegroundColor Green

Write-Host "`n2. Start the backend server:" -ForegroundColor White
Write-Host "   cd backend-go" -ForegroundColor Cyan
Write-Host "   go run cmd/server/main.go cmd/server/migrations.go" -ForegroundColor Cyan

Write-Host "`n3. Backend will be available at:" -ForegroundColor White
Write-Host "   http://localhost:8080" -ForegroundColor Green

Write-Host "`n4. Test forgot password:" -ForegroundColor White
Write-Host "   Go to http://localhost:5173 (Vite dev server)" -ForegroundColor Cyan
Write-Host "   The frontend will connect to local backend" -ForegroundColor Gray

Write-Host "`n=== Commands to run ===" -ForegroundColor Yellow
Write-Host @"

# Terminal 1 - Backend
cd backend-go
go run cmd/server/main.go cmd/server/migrations.go

# Terminal 2 - Frontend  
cd frontend
npm run dev

"@ -ForegroundColor Cyan

Write-Host "`nThen visit: http://localhost:5173" -ForegroundColor Green

Write-Host "`n=== To fix Render permanently ===" -ForegroundColor Yellow
Write-Host "You still need to update DATABASE_URL in Render dashboard" -ForegroundColor White
Write-Host "But this lets you test immediately!" -ForegroundColor Gray

Write-Host ""
