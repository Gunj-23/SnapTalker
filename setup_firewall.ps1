# SnapTalker - Windows Firewall Configuration
# Run this script as Administrator to allow network access

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   SnapTalker Firewall Configuration Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click on PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Adding Windows Firewall rules..." -ForegroundColor Yellow
Write-Host ""

# Remove existing rules if they exist
Remove-NetFirewallRule -DisplayName "SnapTalker Frontend (Vite)" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "SnapTalker Backend (Go)" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "SnapTalker PostgreSQL" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "SnapTalker Redis" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "SnapTalker MinIO" -ErrorAction SilentlyContinue

# Add firewall rule for Frontend (Port 5173)
New-NetFirewallRule -DisplayName "SnapTalker Frontend (Vite)" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 5173 `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Allow inbound connections to SnapTalker frontend server on port 5173"

Write-Host "✓ Frontend (Port 5173) - Rule added" -ForegroundColor Green

# Add firewall rule for Backend (Port 8080)
New-NetFirewallRule -DisplayName "SnapTalker Backend (Go)" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 8080 `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Allow inbound connections to SnapTalker backend server on port 8080"

Write-Host "✓ Backend (Port 8080) - Rule added" -ForegroundColor Green

# Add firewall rule for PostgreSQL (Port 5432)
New-NetFirewallRule -DisplayName "SnapTalker PostgreSQL" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 5432 `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Allow inbound connections to PostgreSQL database on port 5432"

Write-Host "✓ PostgreSQL (Port 5432) - Rule added" -ForegroundColor Green

# Add firewall rule for Redis (Port 6379)
New-NetFirewallRule -DisplayName "SnapTalker Redis" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 6379 `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Allow inbound connections to Redis cache on port 6379"

Write-Host "✓ Redis (Port 6379) - Rule added" -ForegroundColor Green

# Add firewall rule for MinIO (Port 9000)
New-NetFirewallRule -DisplayName "SnapTalker MinIO" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 9000 `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Allow inbound connections to MinIO storage on port 9000"

Write-Host "✓ MinIO (Port 9000) - Rule added" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Firewall rules added successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*"} | Select-Object -First 1).IPAddress

Write-Host "Your network IP address: $localIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "Other devices can now access SnapTalker at:" -ForegroundColor Yellow
Write-Host "  Frontend: http://${localIP}:5173" -ForegroundColor Green
Write-Host "  Backend:  http://${localIP}:8080" -ForegroundColor Green
Write-Host ""
Write-Host "Make sure both devices are on the same Wi-Fi network!" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
