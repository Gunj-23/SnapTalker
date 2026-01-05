# SnapTalker - Multi-Device Network Connection Guide

## ✅ SYSTEM STATUS

**Both servers are running successfully!**

- ✅ **Backend**: Running on `0.0.0.0:8080`
- ✅ **Frontend**: Running on `0.0.0.0:5174`
- ✅ **Firewall**: Ports 8080 and 5174 allowed
- ✅ **Network**: Available on LAN

---

## 🌐 CONNECTION URLs

### Your PC IP Address: `192.168.1.41`

### Access SnapTalker from ANY device on your network:

```
http://192.168.1.41:5174
```

---

## 📱 CONNECTING FROM OTHER DEVICES

### Step 1: Ensure Same Network
- All devices (PC, mobile, tablets) must be connected to the **SAME Wi-Fi network**
- Check network name on each device

### Step 2: Open Browser on Mobile/Tablet
1. Open Chrome, Safari, or any browser
2. Type: `http://192.168.1.41:5174`
3. Register or login

### Step 3: Test Connection
- Try searching for users
- Send a message
- Check online status (green dot)

---

## 🔥 TROUBLESHOOTING

### Problem: "Can't connect from mobile device"

**Solution 1: Check Network**
```powershell
# On your PC, verify IP address
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"}
```
- Make sure mobile is on same network
- Your PC IP should be `192.168.1.41`

**Solution 2: Firewall (Already Configured)**
- Firewall rules have been created for ports 8080 and 5174
- If still blocked, temporarily disable Windows Firewall:
  ```
  Settings → Windows Security → Firewall & network protection → Turn off
  ```

**Solution 3: Router AP Isolation**
- Some routers have "AP Isolation" or "Client Isolation" enabled
- This prevents devices from communicating with each other
- **Fix**: Login to router settings and disable "AP Isolation"

**Solution 4: Use Network IP (Not Localhost)**
- ❌ Wrong: `http://localhost:5174` (only works on PC)
- ✅ Correct: `http://192.168.1.41:5174` (works everywhere)

---

## 🧪 TESTING MULTI-DEVICE

### Test 1: Register Users
1. **On PC**: Open `http://localhost:5174`
   - Register as "User1"
2. **On Mobile**: Open `http://192.168.1.41:5174`
   - Register as "User2"

### Test 2: Search & Message
1. **User1** (PC): Search for "User2"
2. Click on User2 profile
3. Send message: "Hello from PC!"
4. **User2** (Mobile): Should receive instantly
5. Check online status (green dot)

### Test 3: Real-Time Features
- Online/offline status (green dot)
- WhatsApp tick marks (✓ → ✓✓ → blue ✓✓)
- Timestamps (Just now, 5m ago)
- Last seen status

---

## 📊 VERIFY CONNECTIONS

### Check Backend Logs
The backend window shows all connections:
```
[GIN] POST "/api/v1/users/heartbeat" from 192.168.1.41 (your PC)
[GIN] POST "/api/v1/users/heartbeat" from 192.168.1.38 (mobile device)
```

### Check Active Connections
```powershell
# See who's connected to backend
Get-NetTCPConnection -LocalPort 8080 | Select-Object RemoteAddress, State
```

---

## 🔄 RESTART SERVERS

### Restart Backend
```powershell
# Kill existing process
Get-NetTCPConnection -LocalPort 8080 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Start backend
cd d:\SnapTalker\backend-go\cmd\server
go run main.go migrations.go
```

### Restart Frontend
```powershell
# Kill existing process
Get-NetTCPConnection -LocalPort 5174 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Start frontend
cd d:\SnapTalker\frontend
npm run dev
```

---

## 🚀 QUICK START SCRIPT

Create `start_network.ps1`:

```powershell
# SnapTalker Network Startup Script

Write-Host "`n=== Starting SnapTalker for Network Access ===`n" -ForegroundColor Cyan

# Get IP address
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"} | Select-Object -First 1).IPAddress

# Kill existing processes
Write-Host "Stopping existing servers..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

# Start backend
Write-Host "Starting Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\SnapTalker\backend-go\cmd\server; go run main.go migrations.go"
Start-Sleep -Seconds 5

# Start frontend
Write-Host "Starting Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\SnapTalker\frontend; npm run dev"
Start-Sleep -Seconds 3

Write-Host "`n=== SnapTalker is Ready! ===`n" -ForegroundColor Green
Write-Host "Your IP: $ip" -ForegroundColor Cyan
Write-Host "`nAccess from any device on your network:" -ForegroundColor Yellow
Write-Host "  http://${ip}:5174" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host ""
```

---

## ✨ FEATURES WORKING ACROSS NETWORK

- ✅ User registration and login
- ✅ Real-time messaging
- ✅ Online/offline status (Redis-based)
- ✅ WhatsApp tick marks (⏱️ → ✓ → ✓✓ → blue ✓✓)
- ✅ Timestamps (Just now, 5m ago, 3:45 PM)
- ✅ Last seen tracking
- ✅ Message persistence (PostgreSQL)
- ✅ User search
- ✅ Profile management
- ✅ Conversation list
- ✅ Message delivery/read receipts

---

## 📝 IMPORTANT NOTES

1. **Same Network Required**: All devices must be on the same Wi-Fi network
2. **Firewall Configured**: Ports 8080 and 5174 are already allowed
3. **Use Network IP**: Always use `192.168.1.41` for network access (not localhost)
4. **Router Settings**: Ensure AP Isolation is disabled on your router
5. **Data Persistence**: All messages and users persist across restarts
6. **Online Status**: Uses Redis with 30-second TTL and 15-second heartbeat

---

## 🎯 EXPECTED BEHAVIOR

When you connect from multiple devices:

1. **Both devices appear online** (green dot indicator)
2. **Messages send instantly** (no delays)
3. **Tick marks progress**: Clock → Check → CheckCheck → Blue CheckCheck
4. **Timestamps show correctly**: "Just now", "5m ago", "Yesterday", "3:45 PM"
5. **Last seen updates**: "last seen 2m ago" when user goes offline
6. **Status expires**: After 30 seconds of no heartbeat, user shows offline

---

## 📞 SUPPORT

If you still face issues:

1. **Check backend logs** - Look for incoming requests from network IPs
2. **Test with curl**:
   ```bash
   curl http://192.168.1.41:8080/health
   ```
3. **Verify frontend API config** - Should use `window.location.hostname`
4. **Check CORS** - Backend allows all origins (see main.go)
5. **Try different browser** - Chrome, Safari, Firefox
6. **Clear cache** - Ctrl+Shift+Delete on browser

---

## 🎉 SUCCESS INDICATORS

You'll know it's working when you see:

- ✅ Backend logs show requests from different IPs (192.168.1.41, 192.168.1.38)
- ✅ Green dot appears for online users
- ✅ Messages send and receive instantly
- ✅ Heartbeat calls every 15 seconds in backend logs
- ✅ Online status checks every 10 seconds

**Your system is already configured and working! The backend logs show successful connections from 192.168.1.38 (your mobile device).**
