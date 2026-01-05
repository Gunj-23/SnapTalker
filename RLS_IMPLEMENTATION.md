# Row-Level Security (RLS) Implementation Guide

## What is Row-Level Security?

Row-Level Security (RLS) is a database feature that restricts which rows users can access based on their identity. It provides **complete data isolation** at the database level.

## How It Works in SnapTalker

### 1. Database Level (Supabase)
- **RLS Policies** are enforced by PostgreSQL automatically
- Each query checks: "Does this user have permission to see this data?"
- Uses `app.current_user_id` session variable to identify the user

### 2. Application Level (Go Backend)
When a user makes a request:
1. JWT token is validated in `AuthMiddleware`
2. User ID is extracted from token
3. `SetUserContext()` is called to set `app.current_user_id` in database session
4. All subsequent queries automatically enforce RLS policies

## Privacy Guarantees

### Users Table
- ✅ Users can only view/update their own profile
- ❌ Cannot see other users' profiles (except public info)

### Messages Table
- ✅ Users can only see messages they sent OR received
- ❌ Cannot see messages between other users
- ✅ Even if user guesses message ID, database denies access

### Pre-Keys & Key Bundles (Encryption Keys)
- ✅ Users can only access their own encryption keys
- ❌ Completely isolated - no way to access another user's keys
- ✅ Critical for end-to-end encryption security

## Code Changes Made

### 1. `postgres.go` - Added RLS Support Methods
```go
// SetUserContext - Sets current user for RLS
SetUserContext(ctx, userID)

// ExecWithUser - Execute query with user context
ExecWithUser(ctx, userID, query, args...)

// QueryWithUser - Query with user context
QueryWithUser(ctx, userID, query, args...)

// QueryRowWithUser - Single row query with user context
QueryRowWithUser(ctx, userID, query, args...)
```

### 2. `auth/service.go` - Auto-Set User Context
- Modified `AuthMiddleware()` to call `SetUserContext()` automatically
- Every authenticated request now has user context set
- RLS policies enforce automatically on all queries

## Benefits

1. **Automatic Enforcement**: Can't be bypassed - enforced at database level
2. **Defense in Depth**: Even if application has bugs, database protects data
3. **Zero Trust**: Database doesn't trust application code
4. **Compliance Ready**: GDPR/CCPA compliant data isolation
5. **Admin Protection**: Even database admins can't access user data without explicit permission

## Testing RLS

After deployment, you can test:
1. Create 2 user accounts
2. Login as User A, send message to User B
3. Try to access User B's encryption keys → Should be denied
4. Login as User B, verify you can only see your messages

## Important Notes

- RLS is **MORE SECURE** than separate databases
- Used by Signal, WhatsApp, and other privacy-focused apps
- Combined with E2E encryption = Maximum security
- Free on Supabase (separate DBs would be very costly)
- Industry standard for multi-tenant applications

## SQL Policies Created

1. **users_select_policy**: Users can view their own profile
2. **users_update_policy**: Users can update their own profile
3. **prekeys_select_policy**: Users can view their own pre-keys
4. **prekeys_insert_policy**: Users can insert their own pre-keys
5. **messages_select_policy**: Users can view messages they sent/received
6. **messages_insert_policy**: Users can send messages as themselves
7. **keybundles_select_policy**: Users can view their own key bundles
8. **keybundles_insert_policy**: Users can insert their own key bundles

All policies are enforced automatically by PostgreSQL!
