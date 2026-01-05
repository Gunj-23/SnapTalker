# Quick Backend Deployment to Render.com

## Automatic Deployment Steps:

### 1. Go to Render.com
Visit: https://render.com

### 2. Sign In with GitHub
Click "Get Started" and connect your GitHub account

### 3. Create New Web Service
- Click "New +" → "Web Service"
- Select "Build and deploy from a Git repository"
- Click "Connect account" to link GitHub
- Select your repository: **Gunj-23/SnapTalker**
- Click "Connect"

### 4. Configure Service
Render will auto-detect the `render.yaml` file. Just set:

**Basic Settings:**
- Name: `snaptalker-backend`
- Region: Oregon (US West)
- Branch: `main`
- Root Directory: `backend-go`
- Environment: `Go`
- Build Command: `go build -o server ./cmd/server`
- Start Command: `./server`

**Environment Variables** (Add these):
```
DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19qdXFNbHJsZ1BQVWs1dHdrYmtkOHQiLCJhcGlfa2V5IjoiMDFLRTZCNjJYR1JZQ0dSU0gwWFAwQlM1R0EiLCJ0ZW5hbnRfaWQiOiJkYTBmZTRiNDlhNTVhYThiMzYwOGYxYjBkZGNhMjZlZjIyYWY3MzczZjgyZmE1MDY2NjYwOTBiMTBhODg4NWUyIiwiaW50ZXJuYWxfc2VjcmV0IjoiMjRjOTUzOGMtMTA2OS00ZDJjLWJiMzgtYjg2ZjUzMmU3NDIyIn0.aUpYXNeQDqAx9-yhdmxtjOpufQTpQ0h92ZgaPEYsk4U

JWT_SECRET=snaptalker-super-secret-jwt-key-for-production-2026-min-256-bits

ENVIRONMENT=production

PORT=8080
```

### 5. Deploy
Click "Create Web Service"

Render will:
- ✅ Build your Go backend
- ✅ Deploy it on a free instance
- ✅ Give you a URL like: `https://snaptalker-backend.onrender.com`

### 6. Update Vercel Frontend
After backend is deployed:

**Go to Vercel:**
https://vercel.com/gunj-23s-projects/snaptalker/settings/environment-variables

**Update VITE_API_URL to your Render backend URL:**
```
VITE_API_URL=https://snaptalker-backend.onrender.com/api/v1
```

Then redeploy your frontend.

## Why Render Instead of Vercel for Backend?

✅ **Render.com Benefits:**
- Supports full Go web servers (Gin framework)
- Free tier available
- Automatic deployments from GitHub
- Built-in environment variables
- Proper HTTP method support (POST, PUT, DELETE)
- Health checks included

❌ **Vercel Go Limitation:**
- Only supports serverless functions
- No full web server support
- Limited HTTP methods
- Not suitable for Gin/Echo frameworks

## Estimated Time: 5-10 minutes

The backend will auto-deploy from GitHub whenever you push changes!
