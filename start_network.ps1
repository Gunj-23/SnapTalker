# SnapTalker Network Startup Script
# This script starts both backend and frontend servers accessible on your local network

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "      SnapTalker Network Server Startup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*"} | Select-Object -First 1).IPAddress

if (-not $localIP) {
    Write-Host "Warning: Could not detect network IP address" -ForegroundColor Yellow
    $localIP = "localhost"
}

Write-Host "Network IP Address: $localIP" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Yellow
Write-Host "  Frontend (This PC):      http://localhost:5173" -ForegroundColor White
Write-Host "  Frontend (Network):      http://${localIP}:5173" -ForegroundColor Green
Write-Host "  Backend API (This PC):   http://localhost:8080" -ForegroundColor White
Write-Host "  Backend API (Network):   http://${localIP}:8080" -ForegroundColor Green
Write-Host ""
Write-Host "Share the Frontend (Network) URL with others on your network!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Start backend server
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend-go'; Write-Host 'Backend Server Running on port 8080' -ForegroundColor Green; go run ./cmd/server/main.go ./cmd/server/migrations.go"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend server
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; Write-Host 'Frontend Server Running on port 5173' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "Both servers are starting in separate windows..." -ForegroundColor Green
Write-Host "You can close this window once both servers are running." -ForegroundColor Gray
Write-Host ""
Write-Host "To stop the servers, close the terminal windows or press Ctrl+C in each." -ForegroundColor Gray
