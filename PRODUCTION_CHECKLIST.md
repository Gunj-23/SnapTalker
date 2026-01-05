# Production Deployment Checklist

## ✅ Environment Variables to Add in Vercel

### For All Environments (Production, Preview, Development):

**DATABASE_URL**
```
prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
```

**JWT_SECRET**
```
your-super-secret-jwt-key-change-in-production-min-256-bits-long
```

**VITE_API_URL**
```
https://snaptalker.vercel.app/api/v1
```

**ENVIRONMENT**
```
production
```

**PORT** (optional, Vercel auto-assigns)
```
8080
```

### Optional (if using):

**REDIS_URL** (for caching - optional)
```
redis://your-redis-url
```

**MINIO_ENDPOINT** (for media storage - optional)
```
your-storage-endpoint
```

## 🔧 Configuration Files Updated

- ✅ `frontend/src/services/api.js` - HTTPS support, protocol detection
- ✅ `backend-go/cmd/server/main.go` - Production CORS, optional services
- ✅ `frontend/vite.config.js` - Build optimization
- ✅ `frontend/.env.production` - Production environment variables
- ✅ `vercel.json` - Vercel routing configuration

## 🚀 Deployment Steps

1. **Commit Changes**:
```bash
git add .
git commit -m "Fix production issues: HTTPS, CORS, and optional services"
git push
```

2. **Update Vercel Environment Variables**:
   - Go to: https://vercel.com/gunj-23s-projects/snaptalker/settings/environment-variables
   - Add all required variables listed above
   - Make sure to select all: Production, Preview, Development

3. **Redeploy**:
   - Go to Deployments tab
   - Click "Redeploy" on the latest deployment
   - Or Vercel will auto-deploy on git push

## 🐛 Issues Fixed

### Mixed Content Error (HTTPS/HTTP)
- ❌ Was: `http://snaptalker.vercel.app:8080/api/v1` 
- ✅ Now: `https://snaptalker.vercel.app/api/v1`

### CORS Configuration
- ❌ Was: Allowing all origins in production
- ✅ Now: Only allows `https://snaptalker.vercel.app` in production

### Optional Services
- ❌ Was: Redis and MinIO required
- ✅ Now: Optional (app works without them)

### Protocol Detection
- ❌ Was: Hardcoded HTTP
- ✅ Now: Auto-detects HTTPS in production

## 🧪 Testing

After deployment, test:
1. ✅ Register a new account
2. ✅ Login with credentials
3. ✅ Check browser console for errors
4. ✅ Verify API calls use HTTPS
5. ✅ Test messaging functionality

## 🔒 Security Improvements

- HTTPS enforced in production
- CORS restricted to specific origins
- Sourcemaps disabled in production
- Environment variables properly managed
- JWT secret required

## 📝 Notes

- Backend and frontend now share same domain (no CORS issues)
- No need for separate backend deployment
- Vercel handles routing automatically
- Database is on Prisma Cloud
- All traffic is HTTPS automatically
