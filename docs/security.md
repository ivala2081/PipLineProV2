# Security model

**Status:** Living spec · reflects codebase as of `main` on 2026-04-24
**Scope:** RLS guarantees, PIN gating, rate limits, secrets, API keys, data isolation
**Related:** [auth/README.md](./auth/README.md), [data-model/README.md](./data-model/README.md), [api/README.md §8](./api/README.md#8-security--auth-rpcs)

> This doc consolidates the security posture of the app. Most of it is already in `auth/README.md` — this file is the **cross-cutting summary** plus threat model and gaps.

---

## 1. Trust boundary

The trust boundary is **Supabase's row-level security**. Every table has RLS enabled; every policy gates access by:
- `private.is_god()` — system super-admin bypass.
- `private.get_user_org_ids()` — user's org membership list.
- `private.is_org_admin(org_id)` — admin within a specific org.
- `private.has_role_permission(org_id, table, action)` — configurable defaults (migration 097).

**Everything above the RLS layer is UX — the RLS is the security.** Feature code role-checks are *defense-in-depth*, not the fence.

See [auth/README.md §2](./auth/README.md#2-rls-helpers-private-schema) for helper details.

## 2. Authentication

### 2.1 Method

Supabase Auth with email + password. No SSO, no magic links, no WebAuthn today.

### 2.2 JWT

Custom claim `user_role` injected via `custom_access_token_hook` ([006_create_access_token_hook.sql](../supabase/migrations/006_create_access_token_hook.sql)). **Must be enabled manually** in Supabase Dashboard → Auth → Hooks.

Token refresh: happens automatically via Supabase client. Also explicitly via `AuthProvider.refreshToken()` on org switch.

### 2.3 Sign-up

Closed by default. God admins create users via Supabase Dashboard or the invite flow ([auth/README.md §6](./auth/README.md#6-invite-flow)). Self-signup is blocked at the Supabase project config level.

### 2.4 Session management

`/session-management` page lists recent login attempts from `get_login_history` RPC ([077](../supabase/migrations/077_session_management_rpcs.sql)). Users can see their own attempts; gods see all.

## 3. Rate limiting

### 3.1 Login attempts

5 failed attempts per device in 15 minutes → `RATE_LIMITED`. Tracked in `login_attempts` ([023](../supabase/migrations/023_login_attempts_tracking.sql)).

Device ID = client-generated fingerprint ([src/lib/deviceFingerprinting.ts](../src/lib/deviceFingerprinting.ts)). **Trivially spoofable** — this is a friction layer, not a security primitive.

### 3.2 PIN verify

Same 5/15 threshold via `verify_org_pin` RPC ([112_bugfixes.sql BUG-13](../supabase/migrations/112_bugfixes.sql#L620-L664)). PIN failures write to `login_attempts` with `error_type = 'pin_verify_failed'`.

### 3.3 Edge Functions

`_shared/rateLimit.ts` provides per-caller rate limits for Edge Functions. Wraps `ai-chat`, `invite-member`, `send-credentials`, etc. Limits are per-function config.

## 4. Per-org PIN

`organization_pins` ([076](../supabase/migrations/076_organization_pins.sql)) stores bcrypt-hashed PINs. Used to gate:

- Transfers Settings CRUD (see [transfers.md §10](./features/transfers.md#10-pin-gate)).
- Daily Summary day-rate override.
- Other sensitive single-actions.

**RPCs:** `verify_org_pin`, `has_org_pin`, `set_org_pin` ([api/README.md §8.1–§8.3](./api/README.md#81-verify_org_pinp_organization_id-uuid-p_pin-text-p_device_id-text--boolean)).

PIN is **per-org**, not per-user. All members share it. Rotating requires `set_org_pin` call by an admin.

## 5. Data isolation (multi-tenancy)

Every business table has `organization_id` + RLS filtering. The pattern:

```sql
USING ((SELECT private.is_god()) OR organization_id IN (SELECT private.get_user_org_ids()))
```

See [data-model/README.md §2.2](./data-model/README.md#22-multi-tenancy) for the convention.

**Queries also filter explicitly** by `organization_id` — defense-in-depth. If RLS breaks, the query still restricts by org.

**Supabase client auth headers** carry the JWT on every request. The `anon` key without a JWT has **no RLS pass-through** — it cannot read any row with an `organization_id`.

## 6. Secrets management

### 6.1 Frontend (Vite env vars)

Only `VITE_*` vars are bundled:

| Var | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Public anon endpoint |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (safe to expose, RLS enforced server-side) |
| `VITE_TATUM_API_KEY` | **⚠ sensitive — should not be in frontend** |

`VITE_TATUM_API_KEY` is a gap — it lets the frontend call Tatum directly (see [accounting.md §12.3](./features/accounting.md#123-secret)). The `secure-api` Edge Function proxy was added to fix this but may not be fully adopted. Audit.

### 6.2 Edge Function secrets (server-side only)

Set via Supabase Dashboard → Edge Functions → Secrets:

| Secret | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | `ai-chat` |
| `TATUM_API_KEY` | `daily-wallet-snapshot`, `secure-api` |
| `GEMINI_API_KEY` | `secure-api` |
| `EXCHANGE_RATE_API_KEY` | `secure-api` |
| UniPayment client creds | `unipayment-proxy` |
| `SB_MANAGEMENT_TOKEN` | `manage-secrets` (god-only) |

**Rotation:** manual via `manage-secrets` Edge Function (god-only).

## 7. API keys for external callers

`org_api_keys` ([090_api_keys.sql](../supabase/migrations/090_api_keys.sql)). Admin-created hashed API keys that let external systems call the `api-gateway` Edge Function.

- Keys stored as SHA-256 hash (not plaintext).
- `validate_api_key(key_hash)` RPC resolves a key to an org + permissions.
- `touch_api_key_last_used(id)` — update last-used timestamp.

**Rotation:** manual — admin creates a new key, distributes it to the caller, deletes the old.

## 8. God role

A single system-wide super-admin role (`profiles.system_role = 'god'`). See [auth/README.md §1.1](./auth/README.md#11-system-roles).

- Cross-org access.
- Hidden from non-gods via RLS ([auth/README.md §5.4](./auth/README.md#54-god-visibility)).
- Creating / deleting orgs is god-only.
- Promoting/demoting requires SQL — no UI.

Used as a break-glass identity for developers / emergencies. Should be assigned to trusted humans only, audited, and revoked when no longer needed.

## 9. Threat model (brief)

### 9.1 What we protect against

- **Cross-org data leakage.** RLS + explicit `organization_id` filter.
- **Role escalation via JWT claim spoofing.** `user_role` is a JWT custom claim but Supabase signs the token server-side; JWT forgery requires the JWT secret. RLS doesn't actually read `user_role` in policy today — uses `private.is_god()` which re-queries `profiles`. So even a forged claim wouldn't grant god unless `profiles.system_role = 'god'`.
- **Brute force on login / PIN.** 5/15 rate limit.
- **Accidental writes by operation role.** RLS gates writes by role per-table.
- **XSS in user-supplied strings.** React auto-escapes. We don't use `dangerouslySetInnerHTML` anywhere.
- **SQL injection via RPC inputs.** All RPCs use parameterized inputs. Frontend queries also parameterized via Supabase client.

### 9.2 What we don't protect against

- **Compromised god account.** God has full access. If god creds leak, game over.
- **Device fingerprint spoofing.** Rate limit can be bypassed with a new device fingerprint. Mitigation: IP-based rate limit at the edge (not implemented).
- **Prompt injection in AI chat.** Two-layer tool filter mitigates exfiltration via admin-only tools, but an operation user can still craft prompts to extract their in-scope data in unexpected formats.
- **Shared browser sessions.** `localStorage('piplinepro-org')` persists across users on a shared machine. Sign-out clears it but users forget to sign out.
- **Tatum API key on frontend.** Any user who inspects the bundle can read `VITE_TATUM_API_KEY`.
- **Webhook signature verification.** Not currently implemented. A webhook consumer can't cryptographically verify the payload came from us.
- **DDoS at the edge.** Supabase's default protections apply; we don't run a WAF.

## 10. Password policy

Supabase Auth defaults:
- Min length 6 (configurable up to project setting).
- No complexity requirements enforced server-side.
- No password rotation.
- No forbidden-list (common passwords accepted).

The app displays no "password strength" meter.

## 11. Password reset

`supabase.auth.resetPasswordForEmail` with `redirectTo: /reset-password`. Standard Supabase flow.

## 12. Login attempts visibility

Users see their own via `get_login_history`. Gods see all via `get_security_metrics` summary.

No alert on suspicious activity (e.g. "login from new device" email). Add if risk profile grows.

## 13. Known gaps / open questions

- **No MFA / 2FA.** Single-factor password auth only. High-value gap for financial data.
- **`VITE_TATUM_API_KEY` in frontend bundle.** Migrate all Tatum calls through the `secure-api` proxy and remove this env var.
- **God promotion is SQL-only.** Audit trail: a god promoting another to god writes to `god_audit_log` via `protect_system_role_changes` trigger ([043](../supabase/migrations/043_god_audit_logging.sql)). Verify.
- **Rate-limit thresholds hardcoded.** 5 / 15 everywhere. Consider per-org tuning.
- **No "session revocation" admin UI.** If a token is leaked, the only remedy is rotating the user's password (which invalidates their refresh token). Admin can't remotely sign someone out.
- **No IP-level rate limiting.** Device-based rate limit is spoofable.
- **`login_attempts` has no retention.** Grows forever. Add a cleanup cron ([observability.md §1.5](./observability.md#15-retention)).
- **No brute-force protection on RPCs.** Aside from `verify_org_pin`, RPC calls aren't rate-limited. A compromised token could spam `get_monthly_summary` or similar.
- **No field-level encryption at rest.** Beyond Supabase's default database encryption, nothing is app-encrypted. PIN hashes are bcrypt (good); other sensitive fields (employee SSN, bank account numbers if stored) would be plaintext. Audit `hr_employees` and `hr_employee_documents` for PII scope.
- **No audit for data reads.** We log writes (audit tables). Read access is not logged. A user browsing arbitrary transfers isn't recorded.
- **Org-pin rotation is manual.** No expiry, no forced rotation.
- **Webhook secrets can't be rotated.** See [observability.md §5](./observability.md#5-webhooks).
- **No CORS hardening on Edge Functions.** Default allowlist is loose. Tighten per-function once origin list stabilizes.
- **`trusted_devices` is under-documented.** Added by migration 041 but usage pattern is unclear. Audit before relying.
