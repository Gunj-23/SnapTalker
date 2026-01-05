# Automated Vercel Environment Variables Setup Script

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Automated Vercel Setup Script                 ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Environment variables
$VITE_API_URL = "https://snaptalker.vercel.app/api/v1"
$DATABASE_URL = "prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19qdXFNbHJsZ1BQVWs1dHdrYmtkOHQiLCJhcGlfa2V5IjoiMDFLRTZCNjJYR1JZQ0dSU0gwWFAwQlM1R0EiLCJ0ZW5hbnRfaWQiOiJkYTBmZTRiNDlhNTVhYThiMzYwOGYxYjBkZGNhMjZlZjIyYWY3MzczZjgyZmE1MDY2NjYwOTBiMTBhODg4NWUyIiwiaW50ZXJuYWxfc2VjcmV0IjoiMjRjOTUzOGMtMTA2OS00ZDJjLWJiMzgtYjg2ZjUzMmU3NDIyIn0.aUpYXNeQDqAx9-yhdmxtjOpufQTpQ0h92ZgaPEYsk4U"
$JWT_SECRET = "snaptalker-super-secret-jwt-key-for-production-2026-min-256-bits"
$ENVIRONMENT = "production"

Write-Host "Adding environment variables to Vercel...`n" -ForegroundColor Yellow

# Add VITE_API_URL
Write-Host "→ Adding VITE_API_URL..." -ForegroundColor White
echo $VITE_API_URL | vercel env add VITE_API_URL production
echo $VITE_API_URL | vercel env add VITE_API_URL preview
echo $VITE_API_URL | vercel env add VITE_API_URL development

# Add DATABASE_URL
Write-Host "→ Adding DATABASE_URL..." -ForegroundColor White
echo $DATABASE_URL | vercel env add DATABASE_URL production
echo $DATABASE_URL | vercel env add DATABASE_URL preview  
echo $DATABASE_URL | vercel env add DATABASE_URL development

# Add JWT_SECRET
Write-Host "→ Adding JWT_SECRET..." -ForegroundColor White
echo $JWT_SECRET | vercel env add JWT_SECRET production
echo $JWT_SECRET | vercel env add JWT_SECRET preview
echo $JWT_SECRET | vercel env add JWT_SECRET development

# Add ENVIRONMENT
Write-Host "→ Adding ENVIRONMENT..." -ForegroundColor White
echo $ENVIRONMENT | vercel env add ENVIRONMENT production
echo $ENVIRONMENT | vercel env add ENVIRONMENT preview
echo $ENVIRONMENT | vercel env add ENVIRONMENT development

Write-Host "`n✅ All environment variables added!" -ForegroundColor Green
Write-Host "`nTriggering redeploy..." -ForegroundColor Yellow

# Redeploy
vercel --prod

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ✅ Setup Complete!                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Your app is deploying at: https://snaptalker.vercel.app" -ForegroundColor Cyan
Write-Host "`nWait 2-3 minutes for deployment to complete...`n" -ForegroundColor Yellow
