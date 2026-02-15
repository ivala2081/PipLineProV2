# 🚨 Security Incident Response Plan - PipLineProV2

## Overview

This document outlines the response procedures for security incidents in PipLineProV2. Follow these steps in order when a breach or security issue is suspected.

---

## 🔴 Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| **P0 - Critical** | Active breach, data exposure, system compromise | Immediate |
| **P1 - High** | Vulnerability discovered, potential exploit | Within 1 hour |
| **P2 - Medium** | Security misconfiguration, suspicious activity | Within 4 hours |
| **P3 - Low** | Security improvement needed, minor issue | Within 24 hours |

---

## 🚨 Phase 1: IMMEDIATE ACTIONS (Within 5 minutes)

### If you suspect a breach:

#### 1. **Disable Compromised Accounts**

```sql
-- In Supabase SQL Editor
-- Disable specific user
UPDATE auth.users
SET banned_until = now() + interval '24 hours'
WHERE email = 'compromised@email.com';

-- Or disable by user ID
UPDATE auth.users
SET banned_until = now() + interval '24 hours'
WHERE id = 'user-uuid-here';
```

#### 2. **Revoke All Sessions** (if widespread compromise suspected)

```sql
-- Force logout ALL users (use with caution!)
DELETE FROM auth.sessions;

-- Or just for specific user
DELETE FROM auth.sessions WHERE user_id = 'user-uuid-here';
```

#### 3. **Rotate API Keys IMMEDIATELY**

**Supabase Dashboard:**
- Go to Settings → API
- Regenerate Project API keys
- Update `.env` files in all environments

**Third-party APIs:**
```bash
# Regenerate these in their respective dashboards:
- Tatum API Key
- Gemini API Key
- Exchange Rate API Key
- Resend API Key (for emails)
```

**Update Edge Function Secrets:**
```bash
supabase secrets set TATUM_API_KEY=new-key
supabase secrets set GEMINI_API_KEY=new-key
supabase secrets set EXCHANGE_RATE_API_KEY=new-key
supabase secrets set RESEND_API_KEY=new-key
```

#### 4. **Enable Maintenance Mode** (if needed)

Create a maintenance page and redirect all traffic temporarily while investigating.

---

## 🔍 Phase 2: INVESTIGATION (Within 1 hour)

### 1. Check God Audit Log

```sql
-- Review god role activity in last 24 hours
SELECT *
FROM god_audit_log
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC;

-- Look for suspicious patterns
SELECT
  god_email,
  action,
  COUNT(*) as action_count
FROM god_audit_log
WHERE created_at > now() - interval '24 hours'
GROUP BY god_email, action
ORDER BY action_count DESC;
```

### 2. Review Login Attempts

```sql
-- Failed login attempts in last 24 hours
SELECT *
FROM login_attempts
WHERE created_at > now() - interval '24 hours'
  AND success = false
ORDER BY created_at DESC;

-- Suspicious patterns (many failures from same IP)
SELECT
  ip_address,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt
FROM login_attempts
WHERE success = false
  AND created_at > now() - interval '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 10
ORDER BY failed_attempts DESC;

-- Successful logins from new IPs
SELECT
  la.*,
  p.email
FROM login_attempts la
JOIN profiles p ON la.user_id = p.id
WHERE la.success = true
  AND la.created_at > now() - interval '24 hours'
ORDER BY la.created_at DESC;
```

### 3. Check for Data Exfiltration

```sql
-- Look for bulk exports or unusual queries
-- Check recent transfers (look for patterns)
SELECT
  DATE(created_at) as date,
  created_by,
  COUNT(*) as transfer_count,
  SUM(amount) as total_amount
FROM transfers
WHERE created_at > now() - interval '24 hours'
GROUP BY DATE(created_at), created_by
ORDER BY transfer_count DESC;

-- Check for unusual wallet activity
SELECT *
FROM wallet_snapshots
WHERE created_at > now() - interval '24 hours'
ORDER BY total_usd DESC;
```

### 4. Review Application Logs

```bash
# Check Supabase Edge Function logs
supabase functions logs secure-api --tail 100

# Look for unusual patterns:
# - High error rates
# - Unexpected IPs
# - Strange request patterns
# - Failed authentication attempts
```

### 5. Check Database Changes

```sql
-- Recent profile changes
SELECT *
FROM profiles
WHERE updated_at > now() - interval '24 hours'
ORDER BY updated_at DESC;

-- Recent organization changes
SELECT *
FROM organizations
WHERE updated_at > now() - interval '24 hours'
ORDER BY updated_at DESC;

-- New organization members added
SELECT *
FROM organization_members
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

---

## 🛡️ Phase 3: CONTAINMENT (Within 4 hours)

### 1. Patch the Vulnerability

- Identify the entry point
- Deploy fix to production
- Verify fix is effective

### 2. Restore from Backup (if data corruption detected)

```bash
# List available backups
ls -lh backups/

# Restore from backup (⚠️ THIS OVERWRITES DATA!)
./scripts/restore-database.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz
```

### 3. Block Malicious IPs (if applicable)

In Supabase Dashboard or via Cloudflare/WAF:
- Add IP addresses to blocklist
- Configure rate limiting
- Enable additional security measures

### 4. Force Password Reset (if credentials compromised)

```sql
-- For affected users, invalidate sessions and require password reset
-- This forces them to use the password reset flow

-- First, log them out
DELETE FROM auth.sessions WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('user1@example.com', 'user2@example.com')
);

-- Then send password reset emails via application or Supabase dashboard
```

---

## 📋 Phase 4: RECOVERY (Within 24 hours)

### 1. Verify System Integrity

```bash
# Run database integrity checks
npm run test

# Verify all services are operational
# - Check Edge Functions
# - Test authentication flow
# - Verify API integrations
```

### 2. Monitor for Continued Activity

- Watch logs for 48 hours
- Set up alerts for suspicious patterns
- Review god_audit_log daily

### 3. Update Security Measures

- Implement additional controls
- Update firewall rules
- Enhance monitoring

### 4. Communication

**Internal:**
- Notify all god admins
- Document incident details
- Schedule post-mortem meeting

**External (if required):**
- Notify affected users (if PII exposed)
- Comply with legal requirements (GDPR breach notification)
- Update status page

---

## 📊 Phase 5: POST-INCIDENT (Within 7 days)

### 1. Incident Report Template

```markdown
# Security Incident Report

**Date:** YYYY-MM-DD
**Severity:** P0/P1/P2/P3
**Detected by:** Name/System
**Status:** Resolved/Ongoing

## Summary
Brief description of the incident

## Timeline
- HH:MM - Incident detected
- HH:MM - Initial response actions taken
- HH:MM - Root cause identified
- HH:MM - Incident resolved

## Root Cause
What caused the incident?

## Impact
- Users affected: X
- Data exposed: Yes/No
- System downtime: X hours
- Financial impact: $X

## Actions Taken
1. Action 1
2. Action 2
3. ...

## Preventive Measures
1. Measure 1
2. Measure 2
3. ...

## Lessons Learned
- Lesson 1
- Lesson 2
```

### 2. Update Security Procedures

- Document new attack vectors discovered
- Update this response plan
- Enhance monitoring/alerting
- Implement additional safeguards

### 3. Training

- Review incident with team
- Update security training materials
- Conduct tabletop exercises

---

## 📞 Emergency Contacts

Update this section with your team's contact information:

| Role | Name | Email | Phone |
|------|------|-------|-------|
| God Admin 1 | [Name] | [email] | [phone] |
| God Admin 2 | [Name] | [email] | [phone] |
| Dev Lead | [Name] | [email] | [phone] |
| Supabase Support | Support | support@supabase.com | - |

---

## 🔒 Prevention Checklist

**Regular Security Practices:**

- [ ] Weekly review of god_audit_log
- [ ] Daily review of failed login attempts
- [ ] Monthly password rotation for service accounts
- [ ] Quarterly security audit
- [ ] Automated backup verification (weekly)
- [ ] Dependency vulnerability scans (automated)
- [ ] Security training for new team members
- [ ] Incident response drill (quarterly)

---

## 📚 Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Incident Response Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf)

---

**Last Updated:** 2026-02-15
**Document Owner:** Security Team
**Review Schedule:** Quarterly
