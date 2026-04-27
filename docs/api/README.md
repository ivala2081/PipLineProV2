# RPC & API contract

**Status:** Living spec · reflects codebase as of `main` on 2026-04-24
**Scope:** Every PostgREST-callable function in `public.*`, every Edge Function under `supabase/functions/`, what they return, who can call them.

> The server-side API surface is **RPC + Edge Function + PostgREST table endpoints**. Tables are documented in [data-model/README.md](../data-model/README.md). This file covers the imperatives: `supabase.rpc('name', args)` and `supabase.functions.invoke('name', body)`.

---

## Table of contents

1. [Conventions](#1-conventions)
2. [RPC index (at a glance)](#2-rpc-index-at-a-glance)
3. [Analytics & KPI RPCs](#3-analytics--kpi-rpcs)
4. [PSP RPCs](#4-psp-rpcs)
5. [Accounting RPCs](#5-accounting-rpcs)
6. [HR RPCs](#6-hr-rpcs)
7. [IB partner RPCs](#7-ib-partner-rpcs)
8. [Security & auth RPCs](#8-security--auth-rpcs)
9. [Permission & admin RPCs](#9-permission--admin-rpcs)
10. [Audit & activity log RPCs](#10-audit--activity-log-rpcs)
11. [Trigger functions (not RPCs)](#11-trigger-functions-not-rpcs)
12. [Edge Functions](#12-edge-functions)
13. [Calling conventions from the frontend](#13-calling-conventions-from-the-frontend)
14. [Known gaps / open questions](#14-known-gaps--open-questions)

---

## 1. Conventions

### 1.1 Naming

- RPCs exposed to clients live in `public.*`, start with a verb (`get_`, `set_`, `verify_`, `log_`, `calculate_`, `acknowledge_`).
- Internal helpers live in `private.*` and are **not** PostgREST-callable.
- Triggers and audit helpers live in `public.*` but are **not** called directly from client code — they fire on DDL events.

### 1.2 Security mode

Every client-callable RPC is `SECURITY DEFINER` with `SET search_path = public` (and sometimes `SET timezone = 'Europe/Istanbul'` for functions that group by local day).

`SECURITY DEFINER` means the function bypasses the caller's RLS — **the function itself enforces the authorization check** as its first statement, usually:

```sql
IF NOT (
  (SELECT private.is_god())
  OR _org_id IN (SELECT private.get_user_org_ids())
) THEN
  RAISE EXCEPTION 'Access denied';
END IF;
```

**Rule:** every new RPC must start with one of these guard patterns. A missing guard on a `SECURITY DEFINER` function is a total RLS bypass.

### 1.3 Return types

Three flavors in use:

| Return | When |
|---|---|
| `JSON` / `JSONB` | Multi-section aggregates (every KPI RPC). Shape is documented per function. |
| `TABLE(...)` | Flat relational output. Used by ledger-style RPCs and pagination. |
| `BOOLEAN` | Predicate checks (`should_rate_limit_device`, `has_org_pin`, `is_device_trusted`, `verify_org_pin`). |

`VOID` is rare — we prefer returning something (rowcount, success boolean) so the caller can distinguish "no-op" from "applied".

### 1.4 Parameter style

- UUID org/entity IDs are `_org_id uuid`, `_psp_id uuid`, etc. (leading underscore — SQL convention to avoid clashing with column names).
- Some newer RPCs use `p_org_id uuid` (PostgreSQL convention — p-prefix). Both conventions are in use; don't refactor for consistency unless you're touching the function anyway.
- Date/period params:
  - `YYYY-MM` strings for monthly period (`p_period TEXT`).
  - `DATE` for single dates.
  - `(year INT, month INT)` pair for older RPCs.

### 1.5 Timezone

RPCs that group by local day **must** set `SET timezone = 'Europe/Istanbul'`. Without this, the server runs in UTC and you get off-by-one bucketing at 00:00–03:00 local time. See migrations 065, 112, 114 (timezone fix history).

### 1.6 `SECURITY DEFINER` read-only vs write

- **Read-only RPCs** are marked `STABLE SECURITY DEFINER` — idempotent, safe to cache.
- **Write RPCs** (e.g. `set_org_pin`, `upsert_role_permissions`, `acknowledge_alert`) are `VOLATILE SECURITY DEFINER` (default).

### 1.7 Grants

`GRANT EXECUTE ON FUNCTION public.<name>(...) TO authenticated` — usually at the bottom of the migration file. Without this grant, PostgREST returns 404 for the RPC call.

---

## 2. RPC index (at a glance)

Only RPCs **called from the frontend** or **exposed as tools to the AI**. Trigger functions listed in [§11](#11-trigger-functions-not-rpcs).

| RPC | Return | Called by | Latest migration |
|---|---|---|---|
| `get_monthly_summary(_org_id, _year, _month)` | JSON | `useMonthlyAnalysisQuery`, AI tool | [140](../../supabase/migrations/140_migrate_transfers_usd_to_usdt.sql) |
| `get_psp_summary(_org_id)` | TABLE | `usePspDashboardQuery` | [115](../../supabase/migrations/115_align_psp_summary_with_ledger.sql) |
| `get_psp_ledger(_psp_id, _org_id)` | TABLE | `usePspLedgerQuery` | [114](../../supabase/migrations/114_fix_psp_ledger_timezone.sql) |
| `get_psp_monthly_summary(_psp_id, _org_id)` | TABLE | `usePspMonthlyQuery` | [112](../../supabase/migrations/112_bugfixes.sql) |
| `get_psp_bloke_transfers(_psp_id, _org_id)` | TABLE | `usePspBlokeQuery` | [064](../../supabase/migrations/064_bloke_resolutions.sql) |
| `get_ozet_summary(_org_id, _year, _month)` | JSON | `useOzetQuery` | [113](../../supabase/migrations/113_ozet_summary.sql) |
| `get_accounting_summary(p_org_id, p_period)` | JSONB | `useAccountingQuery`, AI tool | [123](../../supabase/migrations/123_register_opening_balances.sql) |
| `get_category_breakdown(p_org_id, p_period)` | JSONB | `useAccountingQuery` | [122](../../supabase/migrations/122_fix_accounting_summary_rpc.sql) |
| `seed_default_registers(p_org_id)` | VOID | `useAccountingRegisters` | [120](../../supabase/migrations/120_accounting_overhaul.sql) |
| `calculate_ib_commission(_ib_partner_id, _period_start, _period_end)` | JSONB | `useIBCommissionsQuery` | [129](../../supabase/migrations/129_ib_remove_cpa_revenue_share_sources.sql) |
| `hr_checkin_by_qr(p_token, p_email, p_lat?, p_lng?, p_device_id?)` | JSONB | `pages/checkin` | [144](../../supabase/migrations/144_hr_checkin_device_lock.sql) |
| `verify_org_pin(p_org_id, p_pin, p_device_id)` | BOOLEAN | `useVerifyOrgPin` | [112](../../supabase/migrations/112_bugfixes.sql) |
| `has_org_pin(p_org_id)` | BOOLEAN | `useHasOrgPin` | [076](../../supabase/migrations/076_organization_pins.sql) |
| `set_org_pin(p_org_id, p_pin)` | VOID | `useSetOrgPin` | [076](../../supabase/migrations/076_organization_pins.sql) |
| `should_rate_limit_device(p_device_id, p_max, p_min)` | BOOLEAN | `AuthProvider.signIn`, `verify_org_pin` internally | [023](../../supabase/migrations/023_login_attempts_tracking.sql) |
| `log_login_attempt(p_user_id, p_device_id, p_ip, p_success, p_error)` | VOID | `AuthProvider.signIn` | [023](../../supabase/migrations/023_login_attempts_tracking.sql) |
| `get_login_history(p_user_id, p_limit, p_offset)` | TABLE | `useSessionManagement` | [077](../../supabase/migrations/077_session_management_rpcs.sql) |
| `get_security_metrics()` | TABLE | `security-dashboard.tsx` | [049](../../supabase/migrations/049_get_security_metrics.sql) |
| `update_last_seen()` | VOID | `presenceService` | [042](../../supabase/migrations/042_presence_tracking.sql) |
| `get_role_permissions_with_defaults(_org_id)` | JSONB | `useRolePermissionsQuery` | [134](../../supabase/migrations/134_ib_open_write_to_all_org_members.sql) |
| `upsert_role_permissions(_org_id, _permissions)` | VOID | `useRolePermissionsQuery` | [097](../../supabase/migrations/097_role_permissions.sql) |
| `get_my_page_permissions(_org_id)` | JSONB | `usePagePermission` | [117_transfer_fix_trash_permissions](../../supabase/migrations/117_transfer_fix_trash_permissions.sql) |
| `add_organization_member(_org_id, _email, _role)` | VOID | (admin UI) | [059](../../supabase/migrations/059_restructure_role_permissions.sql) |
| `update_month_exchange_rate(_org_id, _month, _rate)` | VOID | `transfers/MonthlyTab` | [082](../../supabase/migrations/082_dynamic_base_currency.sql) |
| `get_org_audit_log(p_org_id, ...)` | TABLE | `useOrgAuditLogQuery`, `pages/audit` | [085](../../supabase/migrations/085_org_audit_log_rpc.sql) |
| `get_org_audit_log_count(p_org_id, ...)` | BIGINT | `useOrgAuditLogQuery` | [085](../../supabase/migrations/085_org_audit_log_rpc.sql) |
| `get_org_activity_log(p_org_id, ...)` | TABLE | `useOrgActivityLogQuery` | [118](../../supabase/migrations/118_extend_audit_logging.sql) |
| `get_org_activity_log_count(p_org_id, ...)` | BIGINT | `useOrgActivityLogQuery` | [118](../../supabase/migrations/118_extend_audit_logging.sql) |
| `get_org_activity_log_stats(p_org_id, ...)` | JSONB | `useOrgActivityLogQuery` | [118](../../supabase/migrations/118_extend_audit_logging.sql) |
| `acknowledge_alert(p_alert_id)` | VOID | `useAlerts` | [087](../../supabase/migrations/087_velocity_alerts.sql) |
| `is_device_trusted(p_user_id, p_device_id)` | BOOLEAN | (auth flow) | [041](../../supabase/migrations/041_trusted_devices.sql) |
| `mark_device_used(p_user_id, p_device_id)` | VOID | (auth flow) | [041](../../supabase/migrations/041_trusted_devices.sql) |
| `log_captcha_challenge(...)` | VOID | (auth flow) | [024](../../supabase/migrations/024_captcha_challenges.sql) |
| `device_has_recent_captcha_success(p_device_id)` | BOOLEAN | (auth flow) | [024](../../supabase/migrations/024_captcha_challenges.sql) |
| `get_captcha_solve_rate(p_minutes)` | TABLE | (auth flow) | [024](../../supabase/migrations/024_captcha_challenges.sql) |

---

## 3. Analytics & KPI RPCs

### 3.1 `get_monthly_summary(_org_id uuid, _year int, _month int) → json`

**Fully documented in [features/transfers.md §7](../features/transfers.md#7-rpc-contract-get_monthly_summary).** Summary:

- Latest definition: [140:36–334](../../supabase/migrations/140_migrate_transfers_usd_to_usdt.sql#L36-L334).
- `SECURITY DEFINER`, `SET search_path = public`, `SET timezone = 'Europe/Istanbul'`.
- Filters: `deleted_at IS NULL`, `NOT tt.is_excluded`, `NOT exclude_from_net` for KPIs.
- Returns a 13-key JSON: `kpis`, `prev_kpis`, `insights`, `daily_volume`, `daily_net`, `daily_detailed`, `psp_breakdown`, `payment_method_breakdown`, `category_breakdown`, `currency_split`, `commission_by_psp`, `top_customers` (TOP 20), `type_breakdown`.
- KPI struct has 20+ fields — see transfers spec for the full enumeration.
- Consumer-side type hint: the frontend casts the response loosely (no Zod); the AI Assistant treats the JSON as opaque and passes it to the LLM.

### 3.2 `get_ozet_summary(_org_id uuid, _year int, _month int) → json`

Source: [113_ozet_summary.sql](../../supabase/migrations/113_ozet_summary.sql).

Cross-PSP monthly "ÖZET" summary. Returns a daily grid: for every active PSP × every calendar day in the month:

- `deposits`, `withdrawals` (abs amount in native currency)
- `commission` (deposits only)
- `net` (signed)
- `transfer_count`
- `settlement` (from `psp_settlements` same day)
- Derived `DEVİR` (running balance including opening `psps.initial_balance`), `KASA TOP`, finans %

Used by the ÖZET page/tab to render a PSP × day matrix. Consumer: `useOzetQuery`.

---

## 4. PSP RPCs

### 4.1 `get_psp_summary(_org_id uuid) → TABLE`

Source: [115_align_psp_summary_with_ledger.sql](../../supabase/migrations/115_align_psp_summary_with_ledger.sql).

Per-PSP aggregate. One row per PSP in the org.

| Column | Meaning |
|---|---|
| `psp_id`, `psp_name` | Identity |
| `commission_rate` | Default rate on the PSP row |
| `is_active`, `is_internal`, `currency`, `psp_scope`, `provider` | PSP flags |
| `total_deposits` | `Σ ABS(amount) WHERE is_deposit` |
| `total_withdrawals` | `Σ ABS(amount) WHERE NOT is_deposit` |
| `total_commission` | `Σ commission WHERE is_deposit` — deposits-only (fixed in 115) |
| `total_net` | `Σ net` with fallback `amount ± commission` when `net=0` |
| `total_settlements` | `Σ psp_settlements.amount` |
| `last_settlement_date` | Max settlement date |

Filters: `NOT tt.is_excluded`, `tr.deleted_at IS NULL`. Ignores time window — returns lifetime totals.

### 4.2 `get_psp_ledger(_psp_id uuid, _org_id uuid) → TABLE`

Source: [114_fix_psp_ledger_timezone.sql](../../supabase/migrations/114_fix_psp_ledger_timezone.sql).

Per-day PSP ledger (chronological): each row is a day with deposits, withdrawals, commission, net, settlement, and a running balance.

Used by the PSP detail page to render a ledger/running-balance view. `SET timezone = 'Europe/Istanbul'` (grouping by local day).

### 4.3 `get_psp_monthly_summary(_psp_id uuid, _org_id uuid) → TABLE`

Source: [112_bugfixes.sql:449–518](../../supabase/migrations/112_bugfixes.sql#L449-L518).

Per-month breakdown for one PSP. One row per `(year, month)` with transfers and settlements in that month. `month_label` is `'Mon YYYY'` (localized by PG).

Returns columns: `month, year, month_label, deposit_total, withdrawal_total, commission_total, net_total, settlement_total, transfer_count, deposit_count, withdrawal_count, avg_daily_volume`.

Commission is **deposit-only** (fixed in 112 BUG-05).

### 4.4 `get_psp_bloke_transfers(_psp_id uuid, _org_id uuid) → TABLE`

Source: [064_bloke_resolutions.sql](../../supabase/migrations/064_bloke_resolutions.sql).

Returns the blocked transfers for one PSP joined with their `bloke_resolutions` status. Used by the "Blocked" tab in PSP detail.

---

## 5. Accounting RPCs

### 5.1 `get_accounting_summary(p_org_id uuid, p_period text) → jsonb`

Source (latest): [123_register_opening_balances.sql:69–](../../supabase/migrations/123_register_opening_balances.sql#L69).

Monthly ledger summary per register. `p_period` is `'YYYY-MM'`.

Returns:
```json
{
  "registers": [
    { "id": "...", "name": "USDT", "label": "USDT", "currency": "USDT",
      "opening": 0, "incoming": 0, "outgoing": 0, "net": 0, "closing": 0 }
  ],
  "totals": { ... }
}
```

Per-register: `opening` comes from `register_opening_balances` for the same `(org, register, period)`, defaults to 0. `incoming` / `outgoing` from `accounting_entries.direction`, `net = incoming − outgoing`, `closing = opening + net`.

Also aggregates `portfolio_usd` and `total_net_usd` across all registers in the `totals` block.

### 5.2 `get_category_breakdown(p_org_id uuid, p_period text) → jsonb`

Source (latest): [122_fix_accounting_summary_rpc.sql:97](../../supabase/migrations/122_fix_accounting_summary_rpc.sql#L97).

Returns per-category spend breakdown for the period. Used by the accounting analysis view.

### 5.3 `seed_default_registers(p_org_id uuid) → void`

Source: [120_accounting_overhaul.sql:179](../../supabase/migrations/120_accounting_overhaul.sql#L179).

Idempotent seed of the 4 default registers (USDT, NAKIT_TL, NAKIT_USD, TRX) for a given org. Called once when the org first opens the Accounting page.

---

## 6. HR RPCs

### 6.1 `hr_checkin_by_qr(p_token uuid, p_email text, p_lat numeric DEFAULT NULL, p_lng numeric DEFAULT NULL, p_device_id text DEFAULT NULL) → jsonb`

Source (latest): [144_hr_checkin_device_lock.sql](../../supabase/migrations/144_hr_checkin_device_lock.sql) (migration 144 added optional `p_device_id`).

QR-code-driven HR check-in. The `p_token` is a stable per-org QR token; `p_email` is the employee's email; `p_lat`/`p_lng` are the client's GPS coordinates (optional unless geofence is enabled); `p_device_id` is a stable client-side device ID (`crypto.randomUUID()` persisted in `localStorage` — see hr.md §11.3.1).

**Returns** a JSONB with the check-in result including the computed status (`'present'` / `'late'`) relative to the org's standard check-in time. On failure, returns `{ ok: false, error: <code>, ... }`. See [hr.md §11.2](../features/hr.md#112-rpc-hr_checkin_by_qrp_token-uuid-p_email-text-p_lat-numeric-p_lng-numeric-p_device_id-text--jsonb) for the full error code list and geofence/device-lock semantics.

**Timezone-aware:** uses the org's timezone setting (not hardcoded Europe/Istanbul — this is the one HR RPC that varies). Migrations 137, 138, 139 iterated on time casting and return shape.

**Geofence (migration 143):** when `hr_settings.geofence_enabled = true`, the RPC requires `p_lat`/`p_lng` and rejects check-ins outside `office_radius_meters` of the configured office centroid. Even when geofence is off, GPS coordinates (if sent) are recorded on `hr_attendance` for forensic audit. Helper: `haversine_distance_m(lat1, lng1, lat2, lng2) → numeric` computes great-circle distance in meters.

**Device lock (migration 144):** when `p_device_id` is provided, the same device can only check in for one email per day. Subsequent submits with a different email return `'device_locked'`. The lock is stored atomically with the `hr_attendance` row in `hr_checkin_device_locks (org, device_id, date)` UNIQUE.

---

## 7. IB partner RPCs

### 7.1 `calculate_ib_commission(p_ib_partner_id uuid, p_period_start date, p_period_end date) → jsonb`

Source (latest): [129_ib_remove_cpa_revenue_share_sources.sql:89](../../supabase/migrations/129_ib_remove_cpa_revenue_share_sources.sql#L89).

Calculates IB commission for a partner over a period. Partner may have multiple agreement types (migration 125). Agreement types supported:

- CPA (cost-per-acquisition)
- Revenue share
- Turnover-based

Returns a JSONB with per-type breakdown, per-transfer details, totals, and the `currency` (defaults to `'USD'`).

---

## 8. Security & auth RPCs

### 8.1 `verify_org_pin(p_organization_id uuid, p_pin text, p_device_id text) → boolean`

Source: [112_bugfixes.sql:620–664](../../supabase/migrations/112_bugfixes.sql#L620-L664). Documented in [auth/README.md §7](../auth/README.md#7-pin-gate).

- bcrypt compare against `organization_pins.pin_hash`.
- Rate limit via `should_rate_limit_device(5, 15)`.
- Logs failures to `login_attempts` so the rate limiter can count them.
- Raises `'RATE_LIMITED'` on excess attempts.

### 8.2 `has_org_pin(p_organization_id uuid) → boolean`

Source: [076_organization_pins.sql:113](../../supabase/migrations/076_organization_pins.sql#L113). Returns true if the org has a PIN set. Used by UI to decide whether to show "Set PIN" vs "Change PIN".

### 8.3 `set_org_pin(p_organization_id uuid, p_pin text) → void`

Source: [076_organization_pins.sql:80](../../supabase/migrations/076_organization_pins.sql#L80). Hashes with `extensions.crypt(p_pin, gen_salt('bf'))`, upserts `organization_pins`.

**Authorization:** org admin or god. Validated inside the function.

### 8.4 `should_rate_limit_device(p_device_id text, p_max_attempts int, p_minutes int) → boolean`

Source: [023_login_attempts_tracking.sql:120](../../supabase/migrations/023_login_attempts_tracking.sql#L120).

Returns true if device has had ≥ `p_max_attempts` failed attempts in the last `p_minutes` minutes. Used by sign-in and PIN verify. 5 / 15 is the canonical pair.

### 8.5 `log_login_attempt(p_user_id uuid, p_device_id text, p_ip_address text, p_success bool, p_error_message text) → void`

Writes to `login_attempts`. Called fire-and-forget from `AuthProvider.signIn` ([auth/README.md §5.1](../auth/README.md#51-authprovider)).

### 8.6 `get_login_history(p_user_id uuid, p_limit int, p_offset int) → TABLE`

Source: [077_session_management_rpcs.sql:8](../../supabase/migrations/077_session_management_rpcs.sql#L8).

Returns last N login attempts (success + fail) for the current user. `p_user_id` defaults to `auth.uid()`. Only self or god allowed — raises `'UNAUTHORIZED'` otherwise.

### 8.7 `get_security_metrics() → TABLE(metric text, value text)`

Source: [049_get_security_metrics.sql](../../supabase/migrations/049_get_security_metrics.sql). God-only. Returns counts: users, logins in last 24h, failed logins, RLS-enabled tables, policies, audit rows. Used by the security dashboard.

### 8.8 Device trust & CAPTCHA

- `is_device_trusted(p_user_id, p_device_id) → boolean` ([041](../../supabase/migrations/041_trusted_devices.sql))
- `mark_device_used(p_user_id, p_device_id) → void` ([041](../../supabase/migrations/041_trusted_devices.sql))
- `log_captcha_challenge(...)`, `device_has_recent_captcha_success(...)`, `get_captcha_solve_rate(p_minutes)` ([024](../../supabase/migrations/024_captcha_challenges.sql))

Audit current usage before building on top — these were added as defense layers but aren't heavily wired in.

### 8.9 `update_last_seen() → void`

Source: [042_presence_tracking.sql:20](../../supabase/migrations/042_presence_tracking.sql#L20).

Updates `profiles.last_seen_at` to `now()` for `auth.uid()`. Called on a timer by `presenceService`. Powers the "online members" indicator.

---

## 9. Permission & admin RPCs

### 9.1 `get_role_permissions_with_defaults(_org_id uuid) → jsonb`

Source (latest): [134_ib_open_write_to_all_org_members.sql:241](../../supabase/migrations/134_ib_open_write_to_all_org_members.sql#L241).

Returns the full permission matrix (every `(table, role)` pair) for the org — custom rows from `role_permissions` if set, otherwise defaults from `private.default_permission`. Each entry includes `is_custom: boolean`.

Used by the admin "Role Permissions" settings page.

**Authorization:** god or `is_org_admin`.

**This is the most-rewritten RPC in the codebase** (touched by migrations 097, 099, 101, 103, 117, 117_transfer_fix_trash_permissions, 120, 134). Each new table that gets permission-configurable is added here.

### 9.2 `upsert_role_permissions(_org_id uuid, _permissions jsonb) → void`

Source: [097_role_permissions.sql:250](../../supabase/migrations/097_role_permissions.sql#L250).

Bulk upsert of `role_permissions` rows from a JSONB array. Admin-only. Each array element has `{ table_name, role, can_select, can_insert, can_update, can_delete }`.

### 9.3 `get_my_page_permissions(_org_id uuid) → jsonb`

Source (latest): [117_transfer_fix_trash_permissions.sql:227](../../supabase/migrations/117_transfer_fix_trash_permissions.sql#L227).

Returns the **current user's** per-page permissions (not the matrix) — what they can see in the sidebar. Keyed by page slug, values are booleans. Consumer: `usePagePermission`.

### 9.4 `add_organization_member(_org_id uuid, _email text, _role text) → void`

Source (latest): [059_restructure_role_permissions.sql:245](../../supabase/migrations/059_restructure_role_permissions.sql#L245).

Used by the admin UI to add a member. Validates the role string (`'admin' | 'manager' | 'operation' | 'ik'`) and the caller's authority — admin may assign all roles, manager may assign `manager | operation` only.

### 9.5 `update_month_exchange_rate(_org_id uuid, _month text, _rate numeric) → void`

Source (latest): [082_dynamic_base_currency.sql:49](../../supabase/migrations/082_dynamic_base_currency.sql#L49).

Bulk-updates `exchange_rate` on every transfer in a given month for the org (and recomputes `amount_try` / `amount_usd`). Used by the Transfers Monthly tab when a corrected rate needs to apply across the month.

---

## 10. Audit & activity log RPCs

### 10.1 `get_org_audit_log(p_org_id, p_from, p_to, p_actor_id, p_action, p_limit, p_offset) → TABLE`

Source: [085_org_audit_log_rpc.sql](../../supabase/migrations/085_org_audit_log_rpc.sql).

Returns the transfer audit log for an org, joined with actor profile info and transfer name. Paginated. `p_action` filter: `'created' | 'updated' | 'deleted' | 'restored'`.

### 10.2 `get_org_audit_log_count(...) → bigint`

Paired count RPC for pagination. Same filter params as above minus `p_limit` / `p_offset`.

### 10.3 `get_org_activity_log(p_org_id, ...) → TABLE`

Source: [118_extend_audit_logging.sql:174](../../supabase/migrations/118_extend_audit_logging.sql#L174).

Extended activity log covering *multiple* tables (not just transfers). Audit rows are written by `audit_org_table_change` trigger (migration 118, refined in 132). Supports filtering by `p_table`, `p_action`, `p_actor_id`.

### 10.4 `get_org_activity_log_count(...) → bigint` & `get_org_activity_log_stats(...) → jsonb`

Paired count + statistics (top actors, top tables, activity density).

### 10.5 `acknowledge_alert(p_alert_id uuid) → void`

Source: [087_velocity_alerts.sql:154](../../supabase/migrations/087_velocity_alerts.sql#L154). Marks a velocity alert as acknowledged. Admin-only.

---

## 11. Trigger functions (not RPCs)

Not callable directly from clients. Listed here so you know they exist and know which migration owns each.

| Function | Fires on | Migration | Purpose |
|---|---|---|---|
| `handle_updated_at()` | BEFORE UPDATE on most tables | 001 | Bump `updated_at = now()` |
| `handle_new_user()` | AFTER INSERT on `auth.users` | 001 → 004 → 094 | Create profile + auto-accept pending invitations |
| `custom_access_token_hook(event)` | Supabase Auth hook | 006 | Inject `user_role` into JWT |
| `sync_psp_current_rate()`, `sync_psp_current_rate_on_delete()` | `psp_commission_rates` changes | 008 | Keep `psps.commission_rate` in sync with latest dated rate |
| `handle_transfer_audit_insert()`, `handle_transfer_audit_update()` | `transfers` I/U/D | 008, 046, 086 | Write to `transfer_audit_log` with JSONB diff |
| `auto_create_bloke_resolution()` | `transfers` blocked-type writes | 064 | Auto-insert a `bloke_resolutions` placeholder row |
| `enforce_blocked_zero_commission()` | `transfers` BEFORE I/U | 058, 111 | Server-side invariant: blocked → commission=0; withdrawal → commission=0 |
| `protect_system_role_changes()` | `profiles` BEFORE UPDATE | 043 | Only god can change `system_role` |
| `audit_organization_changes()` | `organizations` I/U/D | 043, 112 | Write to `god_audit_log` |
| `audit_org_member_changes()` | `organization_members` I/U/D | 043, 112 | Write to `god_audit_log` |
| `audit_org_table_change()` | Multiple tables I/U/D | 118, 132, 131 | Write to `org_audit_log` |
| `create_ib_payment_accounting_entry()` | `ib_payments` INSERT | 117, 130 | Auto-create matching accounting entry |
| `create_psp_settlement_accounting_entry()` | `psp_settlements` INSERT | 131 | Auto-create matching accounting entry |
| `set_ib_updated_at()` | `ib_*` tables BEFORE UPDATE | 117 | IB-scoped updated_at bumper |
| `unassign_ib_partners_on_employee_deactivation()` | `hr_employees` UPDATE (is_active=false) | 133 | Auto-null IB `managed_by` when employee deactivated |
| `fire_transfer_webhooks()` | `transfers` INSERT | 089 | Enqueue webhook delivery |
| `check_transfer_velocity()` | `transfers` INSERT | 087 | Raise velocity alert if thresholds exceeded |
| `touch_updated_at()` | Several webhook tables | 088 | Alternative updated_at bumper |
| `validate_api_key(p_key_hash)`, `touch_api_key_last_used(p_key_id)` | API gateway | 090 | Hash-based API key validation |
| `log_god_action(...)` | Called by audit triggers | 043 | Write a row to `god_audit_log` |
| `cleanup_old_login_attempts()`, `cleanup_old_captcha_challenges()` | Meant for cron (not wired) | 023, 024 | Retention cleanup — **gap: not scheduled** |

**Rule:** triggers don't appear in the frontend's `supabase.rpc(...)` calls. If you find one being called manually, that's a bug — the side effect should happen automatically.

---

## 12. Edge Functions

Files live under [supabase/functions/](../../supabase/functions/). Called from the frontend via `supabase.functions.invoke('<name>', { body })` or directly via `fetch` when SSE streaming is needed.

| Function | Purpose | Auth | Secrets |
|---|---|---|---|
| `ai-chat` | Anthropic proxy with agentic tool loop (SSE streaming) | JWT required, role derived server-side | `ANTHROPIC_API_KEY` |
| `daily-wallet-snapshot` | Scheduled Tatum balance polling for all wallets | Service role (scheduled) | `TATUM_API_KEY` |
| `invite-member` | Sends org invitation email (and creates DB row) | JWT required | (email provider creds) |
| `api-gateway` | External API entry for third-party integrators | API key via `org_api_keys` | — |
| `secure-api` | Third-party API proxy (Tatum / Gemini / ExchangeRate) without exposing keys | JWT required | `TATUM_API_KEY`, `GEMINI_API_KEY`, `EXCHANGE_RATE_API_KEY` |
| `unipayment-proxy` | OAuth2 client-credentials proxy to UniPayment REST v1 | JWT required | UniPayment creds |
| `deliver-webhook` | Outbound webhook delivery (called from `fire_transfer_webhooks` trigger) | Service role | — |
| `send-credentials` | Send temporary credentials during onboarding | JWT + rate limit | — |
| `update-credentials` | Change user creds (get / set) | JWT required | — |
| `manage-secrets` | God-only: update API keys via Supabase Management API | God-only (server-verified) | `SB_MANAGEMENT_TOKEN` |
| `api-health-check` | God-only: test all third-party integrations | God-only | All API keys |

### 12.1 `ai-chat` — detailed

**Endpoint:** `POST ${VITE_SUPABASE_URL}/functions/v1/ai-chat`
**Auth:** `Authorization: Bearer <session.access_token>`
**Body:**
```ts
{
  messages: Array<{ role: string; content: string }>,  // required, min 1
  orgId: string,    // UUID, required
  orgName: string,  // required
  userRole?: string  // accepted but IGNORED — role is derived server-side
}
```

**Response:** Server-Sent Events stream. Frontend reads via `response.body.getReader()`. Event types:
- `{ type: 'text_delta', delta }` — partial text from the LLM
- `{ type: 'tool_call', name }` — when the LLM invokes a tool (UI shows which tool is running)
- `{ type: 'done' }` — end of stream
- `{ type: 'error', message }` — error

**Config:**
- Model: `claude-sonnet-4-6`
- Max tokens: 4096
- Max tool-loop iterations: 6
- Tool list: `get_monthly_summary`, `get_transfers`, `get_top_customers`, `get_psp_list`, `get_hr_summary`, `get_wallet_balances`, `get_accounting_summary`, `get_recent_activity`

**Authorization model** (2026-04-20 fix, see [memory note](../../../.claude/projects/c--Users-ACER-Desktop-PipLineProV2/memory/feedback_spec_writing_style.md)):

- Server derives `EffectiveRole` from the caller's JWT → `profiles.system_role` or `organization_members.role`.
- **Never trusts `userRole` from the request body.**
- Unknown roles fail closed to `'operation'`.
- `ADMIN_ONLY_TOOLS` = `['get_hr_summary', 'get_wallet_balances', 'get_accounting_summary']` — available only to god/admin/manager.
- Two-layer enforcement:
  1. The tool list sent to Anthropic is filtered by `filterToolsForRole` — operation never sees admin tools advertised.
  2. `executeTool` re-checks role before executing — if a prompt-injected tool call slips through, it returns `{ error }`.
- `get_recent_activity` additionally hides `accounting_entries` and `hr_salary_payments` rows from operation role.

### 12.2 `daily-wallet-snapshot` — detailed

Runs on a Supabase Cron schedule (configured in the dashboard). Iterates every active wallet, calls Tatum v3/v4 depending on chain, writes a `wallet_snapshots` row. Chains handled at different endpoints:

- `ethereum`, `bsc`, `solana`, `polygon`, `celo` → Tatum v4
- Others (Bitcoin, Tron) → Tatum v3

### 12.3 `invite-member` — detailed

**Body:**
```ts
{
  orgId: string,    // UUID
  email: string,    // must match RFC
  role: 'admin' | 'manager' | 'operation' | 'ik'
}
```

Creates the `organization_invitations` row (admin can, if authorized), sends the invite email, logs to `org_audit_log`. Auth: JWT required; server verifies `is_org_admin` or `is_god`.

### 12.4 `secure-api`

Exists so the frontend never sees Tatum / Gemini / Exchange-Rate API keys. Frontend calls `secure-api` with `{ provider, method, path, body }`; the function proxies with the right key.

### 12.5 Auth-gated god-only functions

`manage-secrets` and `api-health-check` both require god role; verified server-side against `profiles.system_role`. **Not trusted from JWT claim directly** — re-read from DB.

---

## 13. Calling conventions from the frontend

### 13.1 Simple RPC

```ts
const { data, error } = await supabase.rpc('verify_org_pin', {
  p_organization_id: orgId,
  p_pin: pin,
  p_device_id: deviceId,
})
if (error) {
  if (error.message.includes('RATE_LIMITED')) { /* show warm message */ }
  throw error
}
```

### 13.2 RPC with typed args (`as never` cast)

Some RPCs aren't in the generated types yet — the cast shuts TypeScript up without weakening the type anywhere else:

```ts
await supabase.rpc('should_rate_limit_device' as never, { … } as never)
```

Remove the cast when `database.types.ts` gets regenerated for that RPC.

### 13.3 Parallel RPCs

For a page that needs multiple RPCs on load, `Promise.all`:

```ts
const [audit, counts] = await Promise.all([
  supabase.rpc('get_org_audit_log', { … }),
  supabase.rpc('get_org_audit_log_count', { … }),
])
```

### 13.4 React Query wrapping

Each RPC gets a custom hook in `src/hooks/queries/` that wraps `useQuery` / `useMutation`. Query keys live in `src/lib/queryKeys.ts`. Convention:

```ts
// hooks/queries/useXxx.ts
export function useXxxQuery(orgId, period) {
  return useQuery({
    queryKey: queryKeys.xxx.period(orgId, period),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_xxx', { p_org_id: orgId, p_period: period })
      if (error) throw error
      return data
    },
    enabled: Boolean(orgId),
    staleTime: 30_000,
  })
}
```

**Rule:** never call `supabase.rpc` directly from a component. Always wrap in a hook. Exceptions are one-off admin actions (e.g. `security-dashboard.tsx` calls `get_security_metrics` inline — acceptable because it's trivial and single-use).

### 13.5 Edge Function call

```ts
// Simple invoke (returns a Response object)
const { data, error } = await supabase.functions.invoke('invite-member', {
  body: { orgId, email, role },
})

// SSE streaming (ai-chat) — must use fetch() directly
const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ messages, orgId, orgName }),
})
const reader = res.body!.getReader()
// decode chunks…
```

---

## 14. Known gaps / open questions

- **No generated types for most RPCs.** `database.types.ts` covers tables; RPCs fall back to `never` casts. Consider `supabase gen types typescript` in CI to cover all RPCs.
- **Cleanup cron not scheduled.** `cleanup_old_login_attempts` and `cleanup_old_captcha_challenges` exist but are never called. Either schedule via Supabase Cron or drop them.
- **`get_role_permissions_with_defaults` drift.** Rewritten in at least 8 migrations. Each time a new table is added to the permission system, this function must be updated. Future tables: add a lint or test that verifies the function covers every table that has `role_permissions` eligibility.
- **`get_my_page_permissions` format.** The output is a JSONB map keyed by page slug; there's no TS type for it. Every consumer re-declares the shape. Promote to a shared type.
- **`get_ozet_summary` duplicates work** with `get_monthly_summary`. They could be unified — low priority.
- **`get_accounting_summary` returns strings for JSONB numbers.** When pulling into JS, parse-to-number is the caller's responsibility. Standardize a serde helper.
- **Edge Function telemetry.** No structured logging. Errors land in Supabase Function logs but aren't aggregated. Consider Sentry or similar.
- **No versioning on the AI tools list.** If the tool list changes, old frontend builds may call a tool that no longer exists (or miss a new one). Bumping `MODEL` is orthogonal to tool-list versioning; current contract is "frontend is stateless — tools are defined server-side and discovered on each call."
- **`add_organization_member` and `invite-member` overlap.** The RPC writes the invitation row directly; the Edge Function does the same plus an email. Deduplicate by having the RPC call the Edge Function (or vice versa). Today they're maintained separately.
- **`should_rate_limit_device` hardcodes the limit at call sites** (5/15). If we ever want per-action tuning, parameterize at the caller side consistently.
- **Trigger-function coverage gaps.** `enforce_blocked_zero_commission` enforces two rules (blocked=0, withdrawal=0) but the name suggests only one. Rename on next touch.
