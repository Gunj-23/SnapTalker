# Network Access & Encryption Guide

## ✅ Issue Resolved

The app now works on network devices without HTTPS, but with E2E encryption disabled in non-secure contexts.

## 🔒 Security Contexts

### Secure Context (Full Encryption) ✅
- `http://localhost:5174` - Full E2E encryption enabled
- `https://YOUR_IP:5174` - Full E2E encryption enabled (requires HTTPS setup)

### Non-Secure Context (Encryption Disabled) ⚠️
- `http://192.168.1.41:5174` - E2E encryption disabled
- `http://172.29.32.1:5174` - E2E encryption disabled

## Why This Happens

The Web Crypto API (used for E2E encryption) is only available in **secure contexts**:
- `localhost` (always secure)
- `https://` URLs (requires SSL certificate)
- NOT available on `http://IP_ADDRESS` from network

## Solutions

### Option 1: Use Localhost (Easiest)
✅ Access on the same computer via `http://localhost:5174`
- Full encryption enabled
- No setup required

### Option 2: Accept Disabled Encryption for Testing
✅ Access from other devices via `http://YOUR_IP:5174`
- Shows warning banner on registration
- E2E encryption disabled
- Messages sent without encryption
- Good for development/testing

### Option 3: Setup HTTPS (Production-Ready)
✅ Enable HTTPS for full encryption on network

**Using mkcert (Recommended):**
```powershell
# Install mkcert
choco install mkcert

# Install certificate authority
mkcert -install

# Generate certificates
cd d:\SnapTalker\frontend
mkcert -key-file cert/key.pem -cert-file cert/cert.pem localhost 127.0.0.1 192.168.1.41 172.29.32.1

# Update vite.config.js to use HTTPS
```

Then update `frontend/vite.config.js`:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        https: {
            key: fs.readFileSync('./cert/key.pem'),
            cert: fs.readFileSync('./cert/cert.pem'),
        },
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            }
        }
    }
})
```

## What Changed

### 1. Registration (Register.jsx)
- ✅ Checks if Web Crypto API is available
- ✅ If available: Generates real encryption keys
- ✅ If not available: Uses placeholder key and shows warning
- ✅ Registration succeeds either way

### 2. Encryption Context (EncryptionContext.jsx)
- ✅ Detects secure context on initialization
- ✅ Disables encryption if Web Crypto API unavailable
- ✅ Sets `encryptionEnabled` flag for app to check

### 3. Encryption Utils (encryption.js)
- ✅ Added `isCryptoAvailable()` check
- ✅ Throws clear error messages if crypto unavailable

## Warning Banner

When accessing from non-secure context, users see:
```
⚠️ Non-secure connection detected. E2E encryption disabled. 
For full security, access via localhost or HTTPS.
```

## Current Status

Both servers running:
- **Backend:** http://172.29.32.1:8080 ✓
- **Frontend:** http://172.29.32.1:5174 ✓

### Access URLs:

**This Computer (Full Encryption):**
- http://localhost:5174 ✅🔒

**Network Devices (No Encryption):**
- http://172.29.32.1:5174 ⚠️
- http://192.168.1.41:5174 ⚠️

## Testing

1. **On same computer:** Use `localhost:5174` for full encryption
2. **From phone/tablet:** Use `http://YOUR_IP:5174` - expect warning about disabled encryption
3. **Register account** - should work on both
4. **Send messages** - works but unencrypted on network devices

## Production Deployment

For production:
1. ✅ Use HTTPS with valid SSL certificate
2. ✅ Deploy on secure domain (e.g., https://snaptalker.com)
3. ✅ Full E2E encryption will be enabled
4. ✅ No warnings shown to users

---

**Note:** The current setup is perfect for development and testing. For production, always use HTTPS!
