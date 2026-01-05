# GitHub Repository Setup Guide

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Fill in the repository details:
   - **Repository name**: `snaptalker` (or your preferred name)
   - **Description**: `End-to-end encrypted messaging platform with Signal Protocol - Built with React and Go`
   - **Visibility**: Choose **Public** or **Private**
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
3. Click "Create repository"

## Step 2: Push Code to GitHub

After creating the repository, run these commands in PowerShell:

```powershell
cd D:\SnapTalker

# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/snaptalker.git

# Push the code to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel (Frontend)

### Option A: Using Vercel Dashboard (Recommended)

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add Environment Variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-backend-url.com/api/v1` (update this after deploying backend)

6. Click "Deploy"

### Option B: Using Vercel CLI

```powershell
# Install Vercel CLI globally
npm install -g vercel

# Navigate to frontend directory
cd D:\SnapTalker\frontend

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## Step 4: Deploy Backend (Choose One)

### Option A: Railway.app

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Configure:
   - **Root Directory**: `backend-go`
   - **Start Command**: `go run ./cmd/server/main.go ./cmd/server/migrations.go`
5. Add environment variables from `backend-go/.env.example`
6. Add PostgreSQL, Redis plugins
7. Deploy!

### Option B: Render.com

1. Go to https://render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: snaptalker-backend
   - **Environment**: Go
   - **Root Directory**: backend-go
   - **Build Command**: `go build -o server ./cmd/server`
   - **Start Command**: `./server`
5. Add environment variables
6. Add PostgreSQL and Redis databases
7. Deploy!

### Option C: DigitalOcean App Platform

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App" → Choose GitHub
3. Select your repository
4. Configure service:
   - **Type**: Web Service
   - **Source Directory**: backend-go
   - **Run Command**: `go run ./cmd/server/main.go ./cmd/server/migrations.go`
5. Add databases (PostgreSQL, Redis)
6. Deploy!

## Step 5: Update Frontend with Backend URL

After deploying the backend, update the environment variable in Vercel:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Update `VITE_API_URL` with your backend URL
4. Redeploy the frontend

## Step 6: Configure Custom Domain (Optional)

### For Vercel (Frontend):
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### For Backend:
1. Follow your hosting provider's instructions
2. Add your custom domain
3. Update DNS records

## Troubleshooting

### Common Issues:

**Build fails on Vercel:**
- Make sure Root Directory is set to `frontend`
- Check that all dependencies are in `package.json`

**Backend connection fails:**
- Verify CORS settings in backend
- Check that VITE_API_URL is correct
- Ensure backend is running and accessible

**Database connection errors:**
- Check DATABASE_URL environment variable
- Ensure database service is running
- Verify credentials

## Support

For issues, check:
- [GitHub Issues](https://github.com/YOUR_USERNAME/snaptalker/issues)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)

---

**Ready to deploy!** 🚀
