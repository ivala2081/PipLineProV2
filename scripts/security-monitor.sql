-- ============================================================================
-- Security Monitoring Queries for PipLineProV2
-- ============================================================================
-- Run these queries daily or set up automated alerts
-- Usage: psql < scripts/security-monitor.sql
-- Or run in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. SUSPICIOUS LOGIN ACTIVITY
-- ============================================================================

-- Multiple failed login attempts from same IP (potential brute force)
SELECT
  ip_address,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt,
  ARRAY_AGG(DISTINCT error_message) as error_types
FROM login_attempts
WHERE success = false
  AND created_at > now() - interval '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 10
ORDER BY failed_attempts DESC;

-- Failed logins for same email (account targeting)
SELECT
  user_id,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt,
  ARRAY_AGG(DISTINCT ip_address) as ip_addresses
FROM login_attempts
WHERE success = false
  AND created_at > now() - interval '24 hours'
  AND user_id IS NOT NULL
GROUP BY user_id
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;

-- Successful logins from new/unusual locations
SELECT
  la.user_id,
  p.email,
  la.ip_address,
  la.created_at,
  la.device_id
FROM login_attempts la
JOIN profiles p ON la.user_id = p.id
WHERE la.success = true
  AND la.created_at > now() - interval '7 days'
ORDER BY la.created_at DESC
LIMIT 50;

-- ============================================================================
-- 2. GOD ROLE MONITORING
-- ============================================================================

-- Excessive god role activity (potential compromised account)
SELECT
  god_email,
  action,
  COUNT(*) as action_count,
  MAX(created_at) as last_action
FROM god_audit_log
WHERE created_at > now() - interval '24 hours'
GROUP BY god_email, action
HAVING COUNT(*) > 50  -- Adjust threshold as needed
ORDER BY action_count DESC;

-- God role activity outside business hours (9 AM - 6 PM)
SELECT *
FROM god_audit_log
WHERE created_at > now() - interval '7 days'
  AND (
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') < 9
    OR EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') > 18
  )
ORDER BY created_at DESC;

-- Recent system_role changes (critical security event)
SELECT *
FROM god_audit_log
WHERE action = 'CHANGE_SYSTEM_ROLE'
  AND created_at > now() - interval '30 days'
ORDER BY created_at DESC;

-- God users who haven't logged in recently (dormant accounts)
SELECT
  p.id,
  p.email,
  p.system_role,
  MAX(la.created_at) as last_login
FROM profiles p
LEFT JOIN login_attempts la ON p.id = la.user_id AND la.success = true
WHERE p.system_role = 'god'
GROUP BY p.id, p.email, p.system_role
HAVING MAX(la.created_at) < now() - interval '30 days' OR MAX(la.created_at) IS NULL
ORDER BY last_login DESC NULLS FIRST;

-- ============================================================================
-- 3. DATA INTEGRITY MONITORING
-- ============================================================================

-- Large or unusual transfers (potential fraud)
SELECT
  id,
  full_name,
  amount,
  currency,
  created_at,
  created_by
FROM transfers
WHERE amount > 100000  -- Adjust threshold
  AND created_at > now() - interval '24 hours'
ORDER BY amount DESC;

-- Bulk transfer operations (potential data exfiltration/manipulation)
SELECT
  created_by,
  DATE(created_at) as date,
  COUNT(*) as transfer_count,
  SUM(amount) as total_amount
FROM transfers
WHERE created_at > now() - interval '7 days'
GROUP BY created_by, DATE(created_at)
HAVING COUNT(*) > 100  -- Adjust threshold
ORDER BY transfer_count DESC;

-- Deleted transfers (unusual, should investigate)
-- Note: Requires implementing soft deletes if not already done
-- This is a placeholder - adjust based on your deletion tracking

-- ============================================================================
-- 4. ORGANIZATIONAL CHANGES
-- ============================================================================

-- New organizations created recently
SELECT
  o.*,
  p.email as created_by_email
FROM organizations o
LEFT JOIN god_audit_log gal ON gal.record_id = o.id AND gal.action = 'CREATE_ORGANIZATION'
LEFT JOIN profiles p ON gal.god_user_id = p.id
WHERE o.created_at > now() - interval '7 days'
ORDER BY o.created_at DESC;

-- Organization members added/removed recently
SELECT *
FROM god_audit_log
WHERE table_name = 'organization_members'
  AND action IN ('ADD_ORG_MEMBER', 'REMOVE_ORG_MEMBER')
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;

-- Organizations with many members added at once (potential bulk invite abuse)
SELECT
  organization_id,
  DATE(created_at) as date,
  COUNT(*) as members_added
FROM organization_members
WHERE created_at > now() - interval '7 days'
GROUP BY organization_id, DATE(created_at)
HAVING COUNT(*) > 10
ORDER BY members_added DESC;

-- ============================================================================
-- 5. SYSTEM HEALTH MONITORING
-- ============================================================================

-- Recent errors in application (if you have error logging table)
-- Placeholder - implement based on your error tracking

-- Active sessions count
SELECT COUNT(*) as active_sessions
FROM auth.sessions
WHERE expires_at > now();

-- Users with multiple active sessions (potential session hijacking)
SELECT
  user_id,
  COUNT(*) as session_count
FROM auth.sessions
WHERE expires_at > now()
GROUP BY user_id
HAVING COUNT(*) > 3
ORDER BY session_count DESC;

-- ============================================================================
-- 6. COMPLIANCE MONITORING
-- ============================================================================

-- Users who haven't logged in for 90+ days (dormant accounts)
SELECT
  p.id,
  p.email,
  p.display_name,
  MAX(la.created_at) as last_login,
  now() - MAX(la.created_at) as days_since_login
FROM profiles p
LEFT JOIN login_attempts la ON p.id = la.user_id AND la.success = true
WHERE p.system_role != 'god'  -- Exclude god accounts (monitored separately)
GROUP BY p.id, p.email, p.display_name
HAVING MAX(la.created_at) < now() - interval '90 days' OR MAX(la.created_at) IS NULL
ORDER BY days_since_login DESC NULLS FIRST;

-- ============================================================================
-- 7. SUMMARY DASHBOARD
-- ============================================================================

-- Daily security metrics
SELECT
  'Total Users' as metric,
  COUNT(*)::text as value
FROM profiles
WHERE system_role != 'god'

UNION ALL

SELECT
  'God Users',
  COUNT(*)::text
FROM profiles
WHERE system_role = 'god'

UNION ALL

SELECT
  'Failed Logins (24h)',
  COUNT(*)::text
FROM login_attempts
WHERE success = false
  AND created_at > now() - interval '24 hours'

UNION ALL

SELECT
  'Successful Logins (24h)',
  COUNT(*)::text
FROM login_attempts
WHERE success = true
  AND created_at > now() - interval '24 hours'

UNION ALL

SELECT
  'God Actions (24h)',
  COUNT(*)::text
FROM god_audit_log
WHERE created_at > now() - interval '24 hours'

UNION ALL

SELECT
  'Active Sessions',
  COUNT(*)::text
FROM auth.sessions
WHERE expires_at > now()

UNION ALL

SELECT
  'Organizations',
  COUNT(*)::text
FROM organizations

UNION ALL

SELECT
  'Transfers (24h)',
  COUNT(*)::text
FROM transfers
WHERE created_at > now() - interval '24 hours';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Adjust thresholds based on your normal traffic patterns
-- 2. Set up automated alerts using pg_cron or external monitoring
-- 3. Review these queries weekly and refine based on findings
-- 4. Document any suspicious patterns you discover
-- 5. Consider setting up views for frequently-used queries
-- ============================================================================
