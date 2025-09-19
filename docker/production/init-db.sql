-- Production Database Initialization Script

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Set timezone
SET timezone = 'UTC';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_date_psp ON transactions (transaction_date, psp);
CREATE INDEX IF NOT EXISTS idx_transaction_psp_amount ON transactions (psp, amount);
CREATE INDEX IF NOT EXISTS idx_transaction_date_amount ON transactions (transaction_date, amount);
CREATE INDEX IF NOT EXISTS idx_transaction_created_at ON transactions (created_at);
CREATE INDEX IF NOT EXISTS idx_psp_track_date_psp ON psp_track (date, psp);

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_transaction_client_search ON transactions USING gin(to_tsvector('english', client_name));
CREATE INDEX IF NOT EXISTS idx_transaction_psp_search ON transactions USING gin(to_tsvector('english', psp));

-- Create partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transaction_active ON transactions (transaction_date) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_transaction_recent ON transactions (created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

-- Analyze tables for query optimization
ANALYZE;
