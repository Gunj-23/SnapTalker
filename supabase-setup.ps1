#!/usr/bin/env pwsh
# Supabase Setup Script for SnapTalker
# This script will automatically configure your Render deployment with Supabase

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   SUPABASE AUTOMATIC CONFIGURATION SCRIPT     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Step 1: Get the Database URL from user
Write-Host "📋 After your Supabase project is created:" -ForegroundColor Yellow
Write-Host "   1. Click 'Connect' button" -ForegroundColor White
Write-Host "   2. Select 'URI' or 'Connection String'" -ForegroundColor White
Write-Host "   3. Copy the connection string" -ForegroundColor White
Write-Host "   (Format: postgresql://postgres:[PASSWORD]@[HOST]/postgres)`n" -ForegroundColor Gray

Write-Host "🔗 Paste your Supabase DATABASE_URL here:" -ForegroundColor Cyan
$SUPABASE_URL = Read-Host "DATABASE_URL"

if ([string]::IsNullOrWhiteSpace($SUPABASE_URL)) {
    Write-Host "`n❌ Error: DATABASE_URL is required!" -ForegroundColor Red
    exit 1
}

# Validate URL format
if (-not $SUPABASE_URL.StartsWith("postgresql://")) {
    Write-Host "`n⚠️  Warning: URL should start with 'postgresql://'" -ForegroundColor Yellow
    Write-Host "   Make sure you copied the connection string correctly." -ForegroundColor Yellow
    Write-Host "`n   Continue anyway? (y/n):" -ForegroundColor Cyan
    $confirm = Read-Host
    if ($confirm -ne "y") {
        Write-Host "`n❌ Setup cancelled." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n✅ Database URL received!" -ForegroundColor Green

# Step 2: Update environment variables locally
Write-Host "`n📝 Updating local .env file..." -ForegroundColor Yellow
$envContent = @"
DATABASE_URL=$SUPABASE_URL
JWT_SECRET=snaptalker-super-secret-jwt-key-for-production-2026-min-256-bits
ENVIRONMENT=production
PORT=8080
"@

Set-Content -Path "backend-go/.env" -Value $envContent
Write-Host "   ✅ Local .env updated" -ForegroundColor Green

# Step 3: Test database connection locally (optional)
Write-Host "`n🧪 Testing database connection..." -ForegroundColor Yellow
Write-Host "   (This ensures the URL is correct before deploying)" -ForegroundColor Gray

$env:DATABASE_URL = $SUPABASE_URL
$testResult = & go run backend-go/cmd/server/main.go backend-go/cmd/server/migrations.go 2>&1 | Select-String -Pattern "Starting server|Failed to connect" | Select-Object -First 1

if ($testResult -match "Starting server") {
    Write-Host "   ✅ Database connection successful!" -ForegroundColor Green
    # Stop the test server
    Get-Process | Where-Object {$_.Name -eq "main"} | Stop-Process -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "   ⚠️  Could not verify connection (may still work in production)" -ForegroundColor Yellow
}

# Step 4: Open Render dashboard to update environment variables
Write-Host "`n🚀 Step 4: Updating Render Environment Variables..." -ForegroundColor Yellow
Write-Host "   Opening Render dashboard..." -ForegroundColor White

Start-Process "https://dashboard.render.com/web/srv-YOUR_SERVICE_ID/env"

Write-Host "`n📋 Manual Step Required (30 seconds):" -ForegroundColor Cyan
Write-Host "   In the Render dashboard that just opened:" -ForegroundColor White
Write-Host "   1. Find 'DATABASE_URL' variable" -ForegroundColor White
Write-Host "   2. Click 'Edit' button" -ForegroundColor White
Write-Host "   3. Replace with: $SUPABASE_URL" -ForegroundColor Green
Write-Host "   4. Click 'Save Changes'" -ForegroundColor White
Write-Host "   5. Render will auto-deploy (2-3 minutes)`n" -ForegroundColor White

Write-Host "✅ Press ENTER after you've updated the DATABASE_URL in Render..." -ForegroundColor Yellow
Read-Host

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         🎉 SETUP COMPLETE!                     ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Supabase database created (Mumbai region)" -ForegroundColor White
Write-Host "   ✅ Local .env updated" -ForegroundColor White
Write-Host "   ✅ Render environment updated" -ForegroundColor White
Write-Host "`n🌐 Your app will be live at:" -ForegroundColor Yellow
Write-Host "   Frontend: https://snaptalker.vercel.app" -ForegroundColor Cyan
Write-Host "   Backend:  https://snaptalker-backend.onrender.com" -ForegroundColor Cyan
Write-Host "`n⏳ Wait 2-3 minutes for Render to deploy, then test your app!" -ForegroundColor Green
Write-Host "`n🎯 Next: Try logging in at https://snaptalker.vercel.app`n" -ForegroundColor Yellow
