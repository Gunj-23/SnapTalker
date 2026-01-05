# Backend Deployment Guide with Database

## Option 1: Railway (Recommended - Easiest)

### Step 1: Deploy Backend to Railway

1. Go to https://railway.app
2. Sign in with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select **"Gunj-23/SnapTalker"**
5. Railway will detect it's a monorepo

### Step 2: Configure the Service

1. Click **"Add variables"** and configure:
   ```
   Root Directory: backend-go
   Start Command: go run ./cmd/server/main.go ./cmd/server/migrations.go
   ```

2. Add **PostgreSQL** database:
   - Click **"New"** → **"Database"** → **"Add PostgreSQL"**
   - Railway will automatically create `DATABASE_URL` variable

3. Add **Redis** cache:
   - Click **"New"** → **"Database"** → **"Add Redis"**
   - Railway will automatically create `REDIS_URL` variable

4. Add these environment variables manually:
   ```
   PORT=8080
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-256-bits
   MINIO_ENDPOINT=your-minio-endpoint (or use Cloudflare R2/AWS S3)
   MINIO_ACCESS_KEY=your-access-key
   MINIO_SECRET_KEY=your-secret-key
   MINIO_BUCKET=snaptalker
   MINIO_USE_SSL=true
   ENVIRONMENT=production
   ```

5. Click **"Deploy"**

### Step 3: Get Your Backend URL

After deployment, Railway will give you a URL like:
`https://snaptalker-production-xxxx.up.railway.app`

### Step 4: Update Vercel Frontend

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your SnapTalker project
3. Go to **Settings** → **Environment Variables**
4. Add/Update:
   ```
   VITE_API_URL = https://your-railway-backend-url.up.railway.app/api/v1
   ```
5. Go to **Deployments** → Click **"Redeploy"** on the latest deployment

---

## Option 2: Render.com (Also Free Tier)

### Step 1: Create PostgreSQL Database

1. Go to https://render.com
2. Click **"New"** → **"PostgreSQL"**
3. Name: `snaptalker-db`
4. Click **"Create Database"**
5. Copy the **Internal Database URL**

### Step 2: Create Redis Instance

1. Click **"New"** → **"Redis"**
2. Name: `snaptalker-redis`
3. Click **"Create Redis"**
4. Copy the **Internal Redis URL**

### Step 3: Deploy Backend Web Service

1. Click **"New"** → **"Web Service"**
2. Connect to **"Gunj-23/SnapTalker"**
3. Configure:
   - **Name**: snaptalker-backend
   - **Root Directory**: backend-go
   - **Environment**: Go
   - **Build Command**: `go build -o server ./cmd/server`
   - **Start Command**: `./server`

4. Add Environment Variables:
   ```
   PORT=8080
   DATABASE_URL=(paste your PostgreSQL Internal URL)
   REDIS_URL=(paste your Redis Internal URL)
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-256-bits
   ENVIRONMENT=production
   ```

5. Click **"Create Web Service"**

### Step 4: Update Vercel

Same as Railway - update `VITE_API_URL` in Vercel to your Render backend URL.

---

## Option 3: Quick Local Testing with Ngrok (Temporary)

If you just want to test quickly:

1. Make sure your local backend is running:
   ```powershell
   cd D:\SnapTalker\backend-go
   docker-compose up -d postgres redis minio
   go run ./cmd/server/main.go ./cmd/server/migrations.go
   ```

2. Install and run ngrok:
   ```powershell
   winget install ngrok
   ngrok http 8080
   ```

3. Copy the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)

4. Update Vercel environment variable:
   ```
   VITE_API_URL = https://abc123.ngrok.io/api/v1
   ```

---

## Database Migrations

The backend automatically runs migrations on startup in `migrations.go`:
- Creates `users` table
- Creates `pre_keys` table  
- Creates `messages` table
- Creates necessary indexes

No manual migration needed - just deploy and it handles everything!

---

## MinIO/Object Storage

For production, you have 3 options:

1. **Cloudflare R2** (Recommended - Free tier)
   - S3-compatible
   - No egress fees
   - https://dash.cloudflare.com/

2. **AWS S3**
   - Use actual S3 bucket
   - Update MINIO_ENDPOINT to S3 endpoint

3. **DigitalOcean Spaces**
   - S3-compatible
   - $5/month with 250GB

Update the MinIO environment variables accordingly.

---

## Recommended: Railway Setup

Railway is the easiest because:
- ✅ Free tier includes PostgreSQL + Redis
- ✅ Automatic DATABASE_URL configuration
- ✅ Easy GitHub integration
- ✅ Automatic HTTPS
- ✅ Good for Go apps

Total cost: **$0/month** on free tier (with $5 credit)

Deploy time: **5 minutes** ⚡
