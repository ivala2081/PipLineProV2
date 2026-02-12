-- ──────────────────────────────────────────────────────────────
-- Migration 018: Automated daily wallet snapshots via pg_cron
-- ──────────────────────────────────────────────────────────────
--
-- Prerequisites (enable these in Dashboard → Database → Extensions):
--   1. pg_cron
--   2. pg_net
--
-- Also add these to Supabase Vault (Dashboard → Settings → Vault):
--   - supabase_url     → your project URL (e.g. https://xxx.supabase.co)
--   - service_role_key  → your service role key
-- ──────────────────────────────────────────────────────────────

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily snapshot at 00:00 UTC
-- Calls the existing daily-wallet-snapshot Edge Function
SELECT cron.schedule(
  'daily-wallet-snapshot',
  '0 0 * * *',
  $$
  SELECT extensions.http_post(
    url    := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/daily-wallet-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body   := '{}'::jsonb
  );
  $$
);
