# Railway Database Configuration

## PostgreSQL Database

Your Railway PostgreSQL database is now configured!

### Connection Details:

**Connection URL:**
```
postgresql://postgres:uVhpxqAUoJlOTwDSmbyVZxKlqHHnXlSi@trolley.proxy.rlwy.net:56616/railway
```

**Direct psql command:**
```bash
PGPASSWORD=uVhpxqAUoJlOTwDSmbyVZxKlqHHnXlSi psql -h trolley.proxy.rlwy.net -U postgres -p 56616 -d railway
```

**Railway CLI command:**
```bash
railway connect Postgres
```

## Environment Variables for Railway

In your Railway backend service, add this environment variable:

```
DATABASE_URL=postgresql://postgres:uVhpxqAUoJlOTwDSmbyVZxKlqHHnXlSi@trolley.proxy.rlwy.net:56616/railway
```

Railway should have automatically added this, but if not, add it manually in:
**Service Settings → Variables → DATABASE_URL**

## Database Tables

The backend automatically creates these tables on startup:
- ✅ `users` - User accounts with encryption keys
- ✅ `pre_keys` - Signal Protocol pre-keys for E2E encryption
- ✅ `messages` - Encrypted messages

Check `backend-go/cmd/server/migrations.go` for the schema.

## Verify Database Connection

Once your backend is deployed, check the logs in Railway:
- Look for: `"Running database migrations..."`
- Should see: `"Database migrations completed successfully"`

## Local Development

For local development, keep using Docker:
```powershell
cd backend-go
docker-compose up -d postgres redis minio
```

And use local DATABASE_URL in your `.env` file:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/snaptalker?sslmode=disable
```

## Security Notes

⚠️ **Important:**
- Never commit the actual `.env` file with real credentials to Git
- The `.env.example` file is safe to commit (without real passwords)
- Railway automatically injects DATABASE_URL in production
- Use different databases for development and production
