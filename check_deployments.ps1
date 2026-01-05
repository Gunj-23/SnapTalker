Write-Host "`n=== DEPLOYMENT STATUS CHECK ===" -ForegroundColor Cyan
Write-Host "`nGitHub Repository: https://github.com/Gunj-23/SnapTalker" -ForegroundColor White

Write-Host "`n=== Latest Commits ===" -ForegroundColor Yellow
git log --oneline -3

Write-Host "`n=== Vercel Setup ===" -ForegroundColor Cyan
Write-Host "  Frontend URL: https://snaptalker.vercel.app" -ForegroundColor White
Write-Host "  Vercel Dashboard: https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host "`n  To connect/reconnect Vercel:" -ForegroundColor Yellow
Write-Host "    1. Go to https://vercel.com/new" -ForegroundColor White
Write-Host "    2. Import from GitHub: Gunj-23/SnapTalker" -ForegroundColor White
Write-Host "    3. Root Directory: frontend" -ForegroundColor White
Write-Host "    4. Framework: Vite" -ForegroundColor White
Write-Host "    5. Environment Variables:" -ForegroundColor White
Write-Host "       VITE_API_URL=https://snaptalker-backend.onrender.com/api/v1" -ForegroundColor Cyan

Write-Host "`n=== Render Setup ===" -ForegroundColor Cyan
Write-Host "  Backend URL: https://snaptalker-backend.onrender.com" -ForegroundColor White
Write-Host "  Render Dashboard: https://dashboard.render.com/" -ForegroundColor Gray
Write-Host "`n  To connect/reconnect Render:" -ForegroundColor Yellow
Write-Host "    1. Go to https://dashboard.render.com/select-repo" -ForegroundColor White
Write-Host "    2. Connect GitHub repo: Gunj-23/SnapTalker" -ForegroundColor White
Write-Host "    3. Select: Web Service" -ForegroundColor White
Write-Host "    4. Settings:" -ForegroundColor White
Write-Host "       Name: snaptalker-backend" -ForegroundColor Cyan
Write-Host "       Region: Oregon (US West)" -ForegroundColor Cyan
Write-Host "       Branch: main" -ForegroundColor Cyan
Write-Host "       Root Directory: backend-go" -ForegroundColor Cyan
Write-Host "       Runtime: Go" -ForegroundColor Cyan
Write-Host "       Build Command: go build -o server ./cmd/server" -ForegroundColor Cyan
Write-Host "       Start Command: ./server" -ForegroundColor Cyan
Write-Host "    5. Environment Variables (from Render Dashboard):" -ForegroundColor White
Write-Host "       DATABASE_URL=<Your Render PostgreSQL URL>" -ForegroundColor Cyan
Write-Host "       JWT_SECRET=snaptalker-super-secret-jwt-key-for-production-2026-min-256-bits" -ForegroundColor Cyan
Write-Host "       ENVIRONMENT=production" -ForegroundColor Cyan
Write-Host "       PORT=8080" -ForegroundColor Cyan
Write-Host "    6. Enable: Auto-Deploy" -ForegroundColor White

Write-Host "`n=== Database (Render PostgreSQL) ===" -ForegroundColor Cyan
Write-Host "  Connection: postgresql://snaptalker_db_user:***@dpg-d5dm39shg0os73fbjirg-a.singapore-postgres.render.com/snaptalker_db" -ForegroundColor White
Write-Host "  Region: Singapore" -ForegroundColor Gray

Write-Host "`n=== Test Deployments ===" -ForegroundColor Yellow
Write-Host "  Testing backend..." -ForegroundColor White
try {
    $backend = Invoke-WebRequest -Uri "https://snaptalker-backend.onrender.com/health" -TimeoutSec 10 -UseBasicParsing
    Write-Host "  Backend: " -NoNewline -ForegroundColor White
    Write-Host "ONLINE" -ForegroundColor Green
} catch {
    Write-Host "  Backend: " -NoNewline -ForegroundColor White
    Write-Host "OFFLINE or SLOW (Render may be spinning up)" -ForegroundColor Red
}

Write-Host "`n  Testing frontend..." -ForegroundColor White
try {
    $frontend = Invoke-WebRequest -Uri "https://snaptalker.vercel.app" -TimeoutSec 10 -UseBasicParsing
    Write-Host "  Frontend: " -NoNewline -ForegroundColor White
    Write-Host "ONLINE" -ForegroundColor Green
} catch {
    Write-Host "  Frontend: " -NoNewline -ForegroundColor White
    Write-Host "OFFLINE" -ForegroundColor Red
}

Write-Host "`n=== Manual Deployment Trigger ===" -ForegroundColor Cyan
Write-Host "  If auto-deploy isn't working:" -ForegroundColor Yellow
Write-Host "    Vercel: Run 'npm run deploy' in frontend folder" -ForegroundColor White
Write-Host "    Render: Go to dashboard and click 'Manual Deploy' > 'Deploy latest commit'" -ForegroundColor White

Write-Host "`n=== Recent Changes ===" -ForegroundColor Cyan
Write-Host "  Latest: Fix API URL for production - point to Render backend" -ForegroundColor White
Write-Host "  Commit: 758bed7" -ForegroundColor Gray
Write-Host "`n  These changes need to be deployed to see them live!" -ForegroundColor Yellow

Write-Host ""
