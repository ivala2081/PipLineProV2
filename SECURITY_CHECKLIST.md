# 🔒 Pre-Production Security Checklist - PipLineProV2

Use this checklist before deploying to production to ensure all security measures are in place.

---

## ✅ Critical Security (Must Complete)

### Configuration

- [ ] **CORS configured** to specific domain(s), NOT wildcard `*`
  - File: `supabase/functions/_shared/cors.ts`
  - Set `ALLOWED_ORIGINS` in Supabase Edge Function secrets
  - Verify: Check Edge Function logs for origin validation

- [ ] **All API keys moved** to Supabase Edge Function secrets
  - ✅ Tatum API Key (in Edge Functions, not client)
  - ✅ Gemini API Key (in Edge Functions, not client)
  - ✅ Exchange Rate API Key (in Edge Functions, not client)
  - ✅ Resend API Key (for emails)
  - File: Check `.env.example` - should NOT contain `VITE_TATUM_API_KEY`, etc.

- [ ] **Environment variables** properly set
  - Production `.env` has correct `VITE_SUPABASE_URL`
  - Production `.env` has correct `VITE_SUPABASE_ANON_KEY`
  - Production `.env` has hCaptcha site key
  - Verify: All `VITE_*` vars are public-safe (no secrets)

- [ ] **Vite configuration** secured
  - File: `vite.config.ts`
  - ✅ `host: '127.0.0.1'` (localhost only in dev)
  - ✅ `allowedHosts` restricted (not `true`)
  - ✅ Source maps disabled in production (`sourcemap: false`)
  - ✅ Console.logs removed in production build

### Authentication & Authorization

- [ ] **RLS enabled** on all tables
  - Run: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;`
  - Should return NO results

- [ ] **God role audit logging** active
  - Migration 043 applied: `043_god_audit_logging.sql`
  - Test: Perform god action, check `god_audit_log` table
  - Verify triggers fire on organization/member changes

- [ ] **Login attempt tracking** verified
  - Table: `login_attempts`
  - Test: Failed login creates log entry
  - Test: Successful login creates log entry

- [ ] **Session timeout** configured
  - Supabase default: 1 hour (acceptable)
  - Or custom in: Settings → Authentication

- [ ] **Password policy** enforced
  - Minimum 8 characters (default)
  - Consider: Adding complexity requirements

### Data Protection

- [ ] **Database backups** enabled and tested
  - Supabase PITR enabled (Point-in-Time Recovery)
  - Daily automated backups configured
  - Backup script tested: `./scripts/backup-database.sh`
  - **CRITICAL:** Test restore procedure!

- [ ] **Backup restoration** tested
  - Create test Supabase project
  - Restore latest backup successfully
  - Verify data integrity

- [ ] **Sensitive data** not in logs
  - Review application logs
  - No passwords, API keys, or PII in logs
  - Production console.logs removed (via Vite terser)

### Monitoring

- [ ] **Security dashboard** accessible to god admins
  - Route: `/security`
  - Test: God user can access
  - Test: Non-god user denied access
  - Verify metrics display correctly

- [ ] **Security monitoring queries** set up
  - File: `scripts/security-monitor.sql`
  - Schedule: Run daily (via cron or manual)
  - Alerts configured for suspicious activity

- [ ] **Error tracking** enabled
  - Consider: Sentry, LogRocket, or similar
  - Capture and alert on errors

- [ ] **Uptime monitoring** enabled
  - External service (UptimeRobot, Pingdom, etc.)
  - Alert on downtime

---

## 🟡 Important (Strongly Recommended)

### Incident Response

- [ ] **Incident response plan** documented
  - File: `SECURITY_INCIDENT_RESPONSE.md`
  - Team reviewed and trained
  - Emergency contacts updated

- [ ] **Emergency contact list** current
  - Update section in `SECURITY_INCIDENT_RESPONSE.md`
  - All god admins have phone numbers listed
  - Test contact methods

- [ ] **Backup god admin** account created
  - At least 2 god users
  - Separate email/device for recovery
  - MFA enabled (when implemented)

- [ ] **API key rotation** procedure documented
  - Process for rotating Tatum, Gemini, etc.
  - Documented in `SECURITY_INCIDENT_RESPONSE.md`
  - Test rotation without downtime

### Network Security

- [ ] **HTTPS enforced** (SSL/TLS)
  - Production URL uses `https://`
  - HTTP redirects to HTTPS
  - Verify SSL certificate valid

- [ ] **Security headers** configured
  - Content-Security-Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - Configure via hosting provider or Cloudflare

- [ ] **Rate limiting** enabled
  - Supabase Auth rate limiting ON
  - API rate limiting configured
  - Edge Function timeout limits set

### Code Security

- [ ] **Dependency vulnerabilities** checked
  - Run: `npm audit`
  - Should show 0 vulnerabilities
  - Update vulnerable packages

- [ ] **Code review** completed
  - Security-focused review done
  - No hardcoded credentials
  - Input validation in place

- [ ] **Automated security scans** set up
  - GitHub Dependabot enabled
  - Snyk or similar integrated
  - Weekly scan schedule

---

## 🔵 Nice to Have (Future Improvements)

### Advanced Security

- [ ] **Multi-Factor Authentication (MFA)** for god users
  - Consider: Supabase MFA feature
  - Priority: High for god accounts

- [ ] **IP allowlisting** for god accounts
  - Restrict god access to known IPs
  - Configure via Supabase or WAF

- [ ] **Penetration testing** completed
  - Professional security audit
  - Fix identified vulnerabilities

- [ ] **Security training** for team
  - OWASP Top 10 awareness
  - Phishing prevention
  - Incident response drill

### Compliance

- [ ] **Privacy policy** published
  - User-facing document
  - Complies with applicable laws

- [ ] **Terms of service** published
  - Liability limitations
  - User responsibilities

- [ ] **GDPR compliance** (if EU users)
  - Data export mechanism
  - Data deletion process
  - Privacy by design

- [ ] **Data retention policy** defined
  - How long to keep data
  - Deletion procedures
  - Backup retention limits

---

## 🔄 Regular Maintenance (Post-Launch)

### Weekly Tasks

- [ ] Review `god_audit_log` for unusual activity
- [ ] Check failed login attempts
- [ ] Verify backups completed successfully

### Monthly Tasks

- [ ] Review security monitoring queries
- [ ] Test backup restoration
- [ ] Check dependency vulnerabilities
- [ ] Review and update firewall rules

### Quarterly Tasks

- [ ] Security audit / penetration test
- [ ] Review and update this checklist
- [ ] Incident response drill
- [ ] Access review (remove dormant accounts)
- [ ] Update security documentation

### Annually

- [ ] Comprehensive security review
- [ ] Update compliance documentation
- [ ] Review and renew SSL certificates
- [ ] Security training for new team members

---

## 📋 Deployment Checklist Summary

Before going live, ensure:

1. ✅ All **Critical Security** items complete
2. ✅ Most **Important** items complete
3. ✅ Backups tested and working
4. ✅ Incident response plan ready
5. ✅ Team trained on security procedures
6. ✅ Monitoring and alerts configured
7. ✅ Emergency contacts updated
8. ✅ Production environment variables verified

---

## 🚀 Post-Deployment Verification

Within 24 hours of launch:

- [ ] Verify CORS working (only allowed origins)
- [ ] Test login flow (success and failure)
- [ ] Check god_audit_log table populating
- [ ] Verify backups running automatically
- [ ] Test security dashboard loads
- [ ] Monitor error rates
- [ ] Check uptime monitoring alerts
- [ ] Verify SSL certificate valid

---

## 📞 Support & Resources

- **Supabase Docs:** https://supabase.com/docs
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Security Incident Response:** `SECURITY_INCIDENT_RESPONSE.md`
- **Backup Scripts:** `scripts/README.md`
- **Security Monitoring:** `scripts/security-monitor.sql`

---

**Last Updated:** 2026-02-15
**Review Schedule:** Before each major deployment
**Document Owner:** Security Team
