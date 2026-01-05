-- SnapTalker Database Schema with ROW-LEVEL SECURITY
-- Maximum Privacy: Each user can ONLY access their own data
-- Run this in Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    identity_key TEXT,
    signed_prekey_id INTEGER DEFAULT 0,
    signed_prekey TEXT,
    signed_prekey_signature TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create pre_keys table
CREATE TABLE IF NOT EXISTS pre_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    key_id INTEGER NOT NULL,
    public_key TEXT NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, key_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id),
    recipient_id TEXT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text',
    encrypted BOOLEAN DEFAULT TRUE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'sent',
    message_type TEXT DEFAULT 'one_to_one'
);

-- Create key_bundles table
CREATE TABLE IF NOT EXISTS key_bundles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    identity_key TEXT NOT NULL,
    signed_prekey_id INTEGER NOT NULL,
    signed_prekey TEXT NOT NULL,
    signed_prekey_signature TEXT NOT NULL,
    one_time_prekey TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pre_keys_user ON pre_keys(user_id, used);
CREATE INDEX IF NOT EXISTS idx_key_bundles_user ON key_bundles(user_id);

-- ============================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================
-- This ensures complete data isolation between users
-- Each user can ONLY access their own data

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_bundles ENABLE ROW LEVEL SECURITY;

-- Users table policies: Users can only see/update their own profile
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (id = current_setting('app.current_user_id', true));

-- Pre-keys policies: Users can only access their own encryption keys
CREATE POLICY "Users can view their own pre-keys"
    ON pre_keys FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own pre-keys"
    ON pre_keys FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own pre-keys"
    ON pre_keys FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true));

-- Messages policies: Users can only see messages they sent or received
CREATE POLICY "Users can view their own messages"
    ON messages FOR SELECT
    USING (
        sender_id = current_setting('app.current_user_id', true) OR
        recipient_id = current_setting('app.current_user_id', true)
    );

CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (sender_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their sent messages"
    ON messages FOR UPDATE
    USING (sender_id = current_setting('app.current_user_id', true));

-- Key bundles policies: Users can only access their own key bundles
CREATE POLICY "Users can view their own key bundles"
    ON key_bundles FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own key bundles"
    ON key_bundles FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own key bundles"
    ON key_bundles FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true));

-- ============================================
-- PRIVACY VERIFICATION
-- ============================================
-- This will show that RLS is enabled on all tables

-- ============================================
-- PRIVACY VERIFICATION
-- ============================================
-- This will show that RLS is enabled on all tables

SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS_ENABLED"
FROM pg_tables 
WHERE tablename IN ('users', 'pre_keys', 'messages', 'key_bundles')
ORDER BY tablename;

-- Verify tables created
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'pre_keys', COUNT(*) FROM pre_keys
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'key_bundles', COUNT(*) FROM key_bundles;
