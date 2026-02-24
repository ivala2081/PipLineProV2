-- ============================================================================
-- 070: Schedule cleanup cron jobs
-- ============================================================================
-- Enables pg_cron and schedules daily cleanup of stale login_attempts and
-- captcha_challenges rows. Requires Supabase Pro plan.
--
-- cleanup_old_login_attempts()  — deletes rows older than 90 days (from 023)
-- cleanup_old_captcha_challenges() — deletes rows older than 30 days (from 024)
-- ============================================================================

-- 1. Enable pg_cron extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage so cron can call public functions
GRANT USAGE ON SCHEMA cron TO postgres;

-- 2. Schedule cleanup_old_login_attempts daily at 03:00 UTC
SELECT cron.schedule(
  'cleanup-login-attempts',      -- job name
  '0 3 * * *',                   -- every day at 03:00 UTC
  $$SELECT public.cleanup_old_login_attempts()$$
);

-- 3. Schedule cleanup_old_captcha_challenges daily at 03:05 UTC
SELECT cron.schedule(
  'cleanup-captcha-challenges',  -- job name
  '5 3 * * *',                   -- every day at 03:05 UTC
  $$SELECT public.cleanup_old_captcha_challenges()$$
);

-- ============================================================================
-- Verify (run manually after applying):
--   SELECT * FROM cron.job;
-- ============================================================================
