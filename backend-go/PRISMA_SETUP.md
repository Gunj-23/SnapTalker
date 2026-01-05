# SnapTalker Backend with Prisma

This backend uses Prisma with Go (prisma-client-go).

## Setup Prisma

1. Install Prisma CLI:
```bash
npm install -D prisma
```

2. Set your DATABASE_URL:
```bash
# For Railway:
export DATABASE_URL="postgresql://postgres:uVhpxqAUoJlOTwDSmbyVZxKlqHHnXlSi@trolley.proxy.rlwy.net:56616/railway"

# For local:
export DATABASE_URL="postgresql://postgres:password@localhost:5432/snaptalker?sslmode=disable"
```

3. Generate Prisma Client for Go:
```bash
cd backend-go
go run github.com/steebchen/prisma-client-go generate
```

4. Push schema to database:
```bash
npx prisma db push
```

5. Run migrations (optional for version control):
```bash
npx prisma migrate dev --name init
```

## Deploy with Prisma

Your Prisma schema is already configured in `backend-go/prisma/schema.prisma`.

The schema includes:
- ✅ Users table with encryption keys
- ✅ Messages table for encrypted messages
- ✅ KeyBundle table for Signal Protocol keys

## Generate Prisma Client

Run this command to generate the Go Prisma client:
```bash
cd backend-go
go run github.com/steebchen/prisma-client-go generate
```

This creates the client code in `backend-go/prisma/db/`
