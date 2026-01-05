# Deploy SnapTalker Backend to Vercel

## Prerequisites
You have your Prisma project created at https://cloud.prisma.io

## Step 1: Set Up Prisma Data Platform

1. Go to https://cloud.prisma.io
2. Create a new project (you already did this!)
3. Select **"PostgreSQL"** as your database
4. Copy the **Connection String** (it will look like):
   ```
   prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
   ```

## Step 2: Update Your Database Connection

Prisma Data Platform gives you a connection pooling URL. 

In your Prisma project dashboard:
- Copy the **Direct Database URL** (for migrations)
- Copy the **Accelerate URL** (for application runtime)

## Step 3: Deploy Backend to Vercel

### Option A: Deploy from GitHub (Easiest)

1. Go to https://vercel.com/new
2. Import your repository: **Gunj-23/SnapTalker**
3. Select **"Other"** as framework
4. Configure:
   - **Project Name**: snaptalker-backend
   - **Root Directory**: Leave empty (Vercel will use the config)
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty

5. Add Environment Variables:
   ```
   DATABASE_URL=<your-prisma-accelerate-url>
   DIRECT_URL=<your-direct-database-url>
   JWT_SECRET=your-super-secret-key-min-256-bits
   PORT=8080
   ENVIRONMENT=production
   ```

6. Deploy!

### Option B: Use Vercel CLI

```powershell
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to project root
cd D:\SnapTalker

# Deploy
vercel --prod
```

When prompted:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **snaptalker**
- Directory? **./** (root)

## Step 4: Run Prisma Migrations

After deploying, run migrations against your Prisma database:

```powershell
# Set the direct database URL
$env:DATABASE_URL="<your-direct-database-url-from-prisma>"

# Run migrations
cd backend-go
npx prisma db push
```

## Step 5: Update Frontend

In Vercel dashboard for your **frontend**:
1. Go to Settings → Environment Variables
2. Update:
   ```
   VITE_API_URL=https://snaptalker-backend.vercel.app/api/v1
   ```
3. Redeploy the frontend

## Alternative: Use Supabase (Free PostgreSQL)

If Prisma Data Platform doesn't fit your needs:

1. Go to https://supabase.com
2. Create a new project
3. Get the **PostgreSQL connection string** from Project Settings → Database
4. Use this as your DATABASE_URL
5. Deploy backend to Vercel with this URL

## Benefits of This Setup:

✅ **Vercel Backend**: Free tier, HTTPS automatically, serverless  
✅ **Prisma Database**: Connection pooling, optimized queries  
✅ **Vercel Frontend**: Already deployed with HTTPS  
✅ **Everything on Vercel**: Single platform, easy management  

## Notes:

- Vercel has generous free tier for hobby projects
- Prisma Accelerate provides connection pooling (good for serverless)
- Your Railway database can still be used if you prefer
- All services get HTTPS automatically

Would you like to:
1. Deploy to Vercel with Prisma Cloud database? 
2. Deploy to Vercel with your Railway database?
3. Use a different platform like Supabase?
