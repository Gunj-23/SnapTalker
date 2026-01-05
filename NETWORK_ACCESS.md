# Network Access Guide

## ✅ What's Been Configured

Both frontend and backend servers are now configured for network access:

### Backend Server
- Binds to `0.0.0.0:8080` (all network interfaces)
- Accessible from any device on the same network
- CORS enabled for cross-origin requests

### Frontend Server  
- Binds to `0.0.0.0:5173` (all network interfaces)
- Automatically detects hostname for API calls
- Works on localhost and network IP addresses

## 🚀 How to Start

### Option 1: Network Startup Script (Easiest)
```powershell
.\start_network.ps1
```

This displays your network IP and starts both servers in separate windows.

### Option 2: Manual Start
```powershell
# Terminal 1 - Backend
cd backend-go
go run cmd/server/main.go

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## 📱 Accessing from Other Devices

1. **Find your IP address:**
   - Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Look for IPv4 Address (e.g., 192.168.1.100)

2. **Connect devices to same WiFi network**

3. **Open browser on any device:**
   ```
   http://YOUR_IP:5173
   ```
   Example: `http://192.168.1.100:5173`

4. **Register and start chatting!**

## 🔍 Testing Network Access

### From This Computer:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080

### From Other Devices:
- Frontend: http://YOUR_IP:5173  
- Backend API: http://YOUR_IP:8080

## ✨ What Changed

1. **Backend (already configured):**
   - Server binds to `0.0.0.0:8080` instead of `localhost:8080`

2. **Frontend:**
   - Vite server configured with `host: '0.0.0.0'`
   - API calls use `window.location.hostname` to automatically detect the correct host
   - Works on both localhost and network IP

3. **Demo Data Removed:**
   - All mock conversations removed
   - All mock messages removed
   - Fresh start with real data only

## 📝 Notes

- **Firewall:** Windows may prompt to allow network access - click "Allow"
- **WiFi Only:** Devices must be on the same local network
- **Security:** Use only on trusted networks (home/office WiFi)
- **Production:** For internet deployment, use proper domain and HTTPS

## 🎯 Features Working Over Network

✅ User registration and login
✅ Search users by username/phone
✅ Start new conversations
✅ Send and receive messages
✅ End-to-end encryption
✅ Video/voice calls (WebRTC)
✅ All messaging features

Enjoy testing SnapTalker with your friends and family! 🎉
