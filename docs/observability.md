# Observability

**Status:** Living spec · reflects codebase as of `main` on 2026-04-24
**Scope:** Audit logs, presence tracking, error handling, alerts
**Related:** [auth/README.md §9](./auth/README.md#9-audit-logging), [data-model/README.md](./data-model/README.md), [api/README.md §10](./api/README.md#10-audit--activity-log-rpcs)

> We have **three audit log tables**, one alerting system, and per-user presence tracking. No structured app logs, no APM, no Sentry. Visibility is post-hoc: you query the audit tables after the fact.

---

## 1. Audit logs

### 1.1 Three tables

| Table | What | Who reads |
|---|---|---|
| `god_audit_log` | Org / member CRUD by gods (create org, add/remove members, role changes) | God only |
| `transfer_audit_log` | Every `transfers` INSERT / UPDATE / DELETE with JSONB before/after | Org admins (via `get_org_audit_log` RPC) |
| `org_audit_log` | Multi-table org-scoped audit (lookup CRUD, PSP changes, etc.) | Org admins (via `get_org_activity_log` RPC) |

### 1.2 Trigger coverage

| Trigger function | Target tables | Writes to |
|---|---|---|
| `audit_organization_changes` | `organizations` | `god_audit_log` |
| `audit_org_member_changes` | `organization_members` | `god_audit_log` |
| `handle_transfer_audit_insert/update` | `transfers` | `transfer_audit_log` |
| `audit_org_table_change` | Multiple (payment_methods, transfer_types, psps, etc.) | `org_audit_log` |

Latest definitions:
- Org/god audit: [112_bugfixes.sql §BUG-06](../supabase/migrations/112_bugfixes.sql#L527-L609) (fixes DELETE triggers returning NEW instead of OLD).
- Transfer audit: [118_extend_audit_logging.sql](../supabase/migrations/118_extend_audit_logging.sql).
- Activity log: [132_fix_audit_log_action_mapping.sql](../supabase/migrations/132_fix_audit_log_action_mapping.sql) (latest action label mapping).

### 1.3 Auto-entry skip rule

When a trigger creates an auto-generated row (IB payment → accounting entry, PSP settlement → accounting entry), the audit logger **skips** the auto-created row. The source event is already audited; the derived entry would double-count. Implemented in [131:93+](../supabase/migrations/131_psp_settlement_accounting_integration.sql#L93) and [130](../supabase/migrations/130_accounting_ib_integration.sql).

### 1.4 RPCs for reading

See [api/README.md §10](./api/README.md#10-audit--activity-log-rpcs). Summary:

- `get_org_audit_log(org, filters, limit, offset)` — transfers audit, joined with actor profile.
- `get_org_audit_log_count(...)` — paired count.
- `get_org_activity_log(...)` — cross-table activity.
- `get_org_activity_log_count(...)`, `get_org_activity_log_stats(...)` — count + top-actors / top-tables statistics.

### 1.5 Retention

**None.** All audit tables grow forever. On a growing org this bloats storage and slows queries. Consider:
- `DROP rows WHERE created_at < now() - interval '2 years'` as a scheduled job.
- Or archive to cold storage (S3 + parquet) if long-term retention matters.

## 2. Security metrics dashboard

Route: `/security` → [src/pages/security-dashboard.tsx](../src/pages/security-dashboard.tsx).

God-only. Calls `get_security_metrics()` RPC ([049_get_security_metrics.sql](../supabase/migrations/049_get_security_metrics.sql)) which returns:

- Total registered users
- Login attempts in last 24h (success + fail counts)
- Failed-attempt rate
- RLS-enabled table count
- Active policies count
- Audit row count

Updated every minute when open. No historical chart today.

## 3. Presence tracking

Simple "who's online" indicator.

Source: [`src/lib/presenceService.ts`](../src/lib/presenceService.ts) calls `update_last_seen()` RPC ([042_presence_tracking.sql:20](../supabase/migrations/042_presence_tracking.sql#L20)) every ~30 seconds while the app is open.

`profiles.last_seen_at` is the timestamp column. An OnlineCount UI component reads `WHERE last_seen_at > now() - interval '2 minutes'` to show the active-users badge.

**Caveats:**
- Breaks if the tab is backgrounded (browser throttles timers).
- No distinction between "actively clicking" and "tab open idle."

## 4. Velocity alerts

Migration 087 introduced a threshold-based alerting system.

### 4.1 Table: `org_alerts`

Rows created by `check_transfer_velocity()` trigger on `transfers` INSERT when:
- A customer name transfers > N times in M minutes.
- (Other thresholds — check current impl.)

### 4.2 RPC: `acknowledge_alert(alert_id)`

Admin dismisses an alert. Flips `acknowledged_at` / `acknowledged_by`.

### 4.3 UI

[src/hooks/useAlerts.ts](../src/hooks/useAlerts.ts) subscribes to unacknowledged alerts. Admins see a bell icon with count in the app header.

**Status:** experimental. Verify thresholds are tuned before treating this as production.

## 5. Webhooks

Migration 088 / 089 — outbound webhook system.

### 5.1 Tables

- `org_webhooks` — per-org webhook URL + event filter config.
- `webhook_delivery_log` — attempt history (URL, status, response).

### 5.2 Trigger

`fire_transfer_webhooks()` on `transfers` INSERT enqueues delivery jobs.

### 5.3 Delivery

[`supabase/functions/deliver-webhook`](../supabase/functions/deliver-webhook) Edge Function sends the HTTP POST, writes the result to `webhook_delivery_log`.

**Retention gap:** delivery log grows forever. Add a cleanup job.

## 6. Frontend error handling

### 6.1 Error boundaries

[`src/components/ErrorBoundary.tsx`](../src/components/ErrorBoundary.tsx) — standard React error boundary with a `SectionErrorBoundary` variant for sub-sections. Used in:

- Top-level app routes (root error boundary).
- Feature tabs (`<SectionErrorBoundary sectionName="Accounting Ledger">`).

Catches rendering errors. Shows a "Something went wrong" UI with retry. **Does not** catch async errors — those need try/catch or React Query's error states.

### 6.2 Toast on error

Mutations bubble errors up. Feature code catches and shows via `useToast` (feature-level). No central error toast pattern.

### 6.3 No Sentry / Bugsnag / similar

Intentional (simplicity) or gap (depending on scale). Adding Sentry would be low-effort — wrap `console.error` + `window.onerror` + React error boundary `componentDidCatch`.

## 7. Backend error handling

### 7.1 Edge Functions

Each function returns structured JSON errors with HTTP status codes. No centralized logging — errors land in the Supabase Dashboard Function logs.

### 7.2 RPCs

Use `RAISE EXCEPTION '<message>'` for failures. Frontend catches via the `error` field on the rpc response.

Canonical error strings:
- `'Access denied'` — RLS / permission check failed.
- `'UNAUTHORIZED'` — user-scoped check failed (e.g. `get_login_history` for someone else's user_id).
- `'RATE_LIMITED'` — device rate limit hit.
- `'Permission denied'` — permission-config RPCs.

Frontend detects these by `String.includes` — fragile. See [§8](#8-known-gaps).

## 8. Known gaps

- **No structured app logs.** `console.log` / `console.warn` are the only logs. No aggregation, no search, no retention.
- **No APM / tracing.** No Datadog, Sentry, Honeycomb, or similar. Problem triage is query-the-audit-tables.
- **No uptime monitoring.** If the app or an Edge Function is down, we find out from user reports.
- **No dead-letter queue for webhooks.** Failed deliveries re-try within Edge Function logic but no DLQ after max attempts.
- **`check_transfer_velocity` thresholds hardcoded.** Not per-org configurable.
- **Audit tables no retention.** See [§1.5](#15-retention).
- **Error codes as magic strings.** `RAISE EXCEPTION 'RATE_LIMITED'` matched via `includes('RATE_LIMITED')`. Would be cleaner as structured error objects or Postgres `SQLSTATE` codes.
- **Velocity alerts aren't routed.** Create in DB; show bell in UI. No email / Slack / push. For ops-critical alerts, that's a gap.
- **Presence tracking is best-effort.** Backgrounded tabs break the heartbeat. For a reliable "online now" list, consider Supabase Realtime presence channels instead of polling.
- **No rate-limit metrics.** We rate-limit via `should_rate_limit_device` but don't surface how often it trips. Useful for tuning 5/15 thresholds.
- **No `RAISE NOTICE` aggregation.** Trigger notices print to the Postgres log (not surfaced). If a bulk migration runs with `RAISE NOTICE`, those messages vanish outside the SQL editor session.
- **Webhook secrets aren't rotated.** `org_webhooks` stores a shared secret. No rotation UI.
