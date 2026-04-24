# Data model & RLS reference

**Status:** Living spec · reflects codebase as of `main` on 2026-04-24
**Scope:** Every `public.*` table, its purpose, key columns, RLS pattern, and the migrations that shape it.
**Audience:** engineers who need to understand what a column means, what can be written to it, and who can read/write. The *semantic* meaning of fields — not just the types.

> The bug that prompted this spec (`currency='USD'` vs `'USDT'`) was a pure **semantics** bug: the column type was fine, the value was fine, but two pieces of code disagreed on what the value *meant*. Everything in this doc is aimed at preventing that class of bug.

---

## 1. Domain map

Tables grouped by domain. Links go to the detailed section below.

| Domain | Tables |
|---|---|
| **Auth & tenancy** | [`profiles`](#auth--tenancy), [`organizations`](#auth--tenancy), [`organization_members`](#auth--tenancy), [`organization_invitations`](#auth--tenancy) |
| **Security & audit** | [`login_attempts`](#security--audit), [`captcha_challenges`](#security--audit), [`trusted_devices`](#security--audit), [`organization_pins`](#security--audit), [`god_audit_log`](#security--audit), [`org_audit_log`](#security--audit) |
| **Configurable permissions** | [`role_permissions`](#configurable-permissions) |
| **Transfers (core)** | [`transfers`](#transfers-core), [`transfer_categories`](#transfers-core), [`payment_methods`](#transfers-core), [`transfer_types`](#transfers-core), [`transfer_audit_log`](#transfers-core), [`bloke_resolutions`](#transfers-core) |
| **PSPs** | [`psps`](#psps), [`psp_commission_rates`](#psps), [`psp_settlements`](#psps), [`unipayment_sync_log`](#psps) |
| **FX rates** | [`exchange_rates`](#fx-rates) |
| **Accounting** | [`accounting_entries`](#accounting), [`accounting_monthly_config`](#accounting), [`accounting_registers`](#accounting), [`accounting_categories`](#accounting), [`accounting_register_snapshots`](#accounting), [`register_opening_balances`](#accounting) |
| **Wallets** | [`wallets`](#wallets), [`wallet_snapshots`](#wallets) |
| **HR / payroll** | [`hr_employees`](#hr--payroll), [`hr_employee_documents`](#hr--payroll), [`hr_bonus_agreements`](#hr--payroll), [`hr_bonus_payments`](#hr--payroll), [`hr_attendance`](#hr--payroll), [`hr_salary_payments`](#hr--payroll), [`hr_settings`](#hr--payroll), [`hr_leaves`](#hr--payroll), [`hr_mt_config`](#hr--payroll), [`hr_re_config`](#hr--payroll), [`hr_bulk_payments`](#hr--payroll), [`hr_bulk_payment_items`](#hr--payroll) |
| **IB partners** | [`ib_partners`](#ib-partners), [`ib_referrals`](#ib-partners), [`ib_commissions`](#ib-partners), [`ib_payments`](#ib-partners) |
| **Integrations** | [`org_webhooks`](#integrations), [`webhook_delivery_log`](#integrations), [`org_api_keys`](#integrations), [`org_alerts`](#integrations) |
| **Backups / scratch** | `transfers_backup_*` (created ad hoc by import migrations — not part of the live model) |

---

## 2. Global conventions

Applied across every table. If a new table doesn't follow these, question it before merging.

### 2.1 Primary keys

UUID, `DEFAULT gen_random_uuid()`, except:
- Composite keys on join tables: `organization_members(organization_id, user_id)`.
- TEXT keys on global lookup tables: `transfer_categories.id`, `payment_methods.id`, `transfer_types.id` — slug-like strings (e.g. `'deposit'`, `'bank'`, `'client'`).

### 2.2 Multi-tenancy

Every domain table has `organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE`.

**Exception:** global lookup tables (`transfer_categories`) have `organization_id IS NULL` for global rows and `organization_id = <uuid>` for org-custom rows. See [features/transfers.md §3.2](../features/transfers.md#32-lookup-tables).

**Rule:** every read filters by `organization_id` *in addition* to RLS. RLS is defense-in-depth — don't skip the explicit `.eq('organization_id', currentOrg.id)` at the query layer.

### 2.3 Timestamps

- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` — auto-bumped by a `BEFORE UPDATE` trigger calling `public.handle_updated_at()` ([001:25–39](../../supabase/migrations/001_create_profiles.sql#L25-L39))

### 2.4 Soft delete

Tables that support soft delete:
- `transfers` (`deleted_at`, `deleted_by`)
- `accounting_entries` (`deleted_at`)

Other tables are hard-deleted (`DELETE` statement).

**Rule:** every read against a soft-delete table adds `.is('deleted_at', null)`. The Trash tab is the only place that flips that filter.

### 2.5 Audit identity

- `created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
- `updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`

`ON DELETE SET NULL` is deliberate — when a user is deleted, their historical audit trail stays intact but unattributed.

### 2.6 Currency columns

Two flavors, always `TEXT` with a CHECK constraint (never a Postgres ENUM):

| Flavor | Values | Example tables |
|---|---|---|
| **Transfer currency** | `'TL' \| 'USDT'` (after migration 140) | `transfers.currency`, `psps.currency` |
| **FX rate key** | `'USD'` (only value used today) | `exchange_rates.currency` |

These are semantically unrelated. A transfer's `currency` labels the native denomination of `amount`; an exchange rate's `currency` is a lookup key for the USD→TRY pair. Don't conflate them.

See [features/transfers.md §4.4](../features/transfers.md#44-currency-semantics-tl-vs-usdt) for the USDT-vs-USD incident history.

### 2.7 Money columns

- `NUMERIC(15,2)` for money amounts (sufficient for 13-digit left-of-decimal values — safe for TRY at any expected scale).
- `NUMERIC(10,4)` for exchange rates.
- `NUMERIC(5,4)` for commission rates (max 9.9999 = 999.99%).

**Never** use `REAL` or `DOUBLE PRECISION` for money. **Never** store money as `INT` of cents in this codebase — the convention is `NUMERIC(15,2)` everywhere.

### 2.8 RLS defaults

Every table has `ALTER TABLE … ENABLE ROW LEVEL SECURITY`. Missing RLS = not production-ready.

Three policy patterns dominate (see [auth/README.md §4](../auth/README.md#4-rls-patterns-house-style)):
- **Auth-foundation** — `profiles`, `organizations`, `*_members`, `*_invitations`.
- **Org-scoped operational** — most business tables. SELECT/INSERT/UPDATE open to org members; DELETE admin-only.
- **Configurable (migration 097)** — opt-in via `private.has_role_permission`.

---

## 3. Domain sections

### Auth & tenancy

#### `profiles`
[001_create_profiles.sql](../../supabase/migrations/001_create_profiles.sql)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK, FK → `auth.users(id) ON DELETE CASCADE` | Same UUID as the auth user. |
| `system_role` | TEXT DEFAULT `'user'` CHECK IN (`'god'`, `'user'`) | System-wide super-admin flag. |
| `display_name` | TEXT | From `raw_user_meta_data` at signup. |
| `avatar_url` | TEXT | From `raw_user_meta_data` at signup. |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**Trigger:** `on_auth_user_created` (AFTER INSERT on `auth.users`) — auto-creates the profile and auto-accepts pending org invitations for the signup email.

**RLS:** see [auth/README.md §4.1](../auth/README.md#41-auth-foundation-pattern). God profiles hidden from non-gods.

#### `organizations`
[002_create_organizations.sql](../../supabase/migrations/002_create_organizations.sql)

| Column | Notes |
|---|---|
| `id` | UUID PK |
| `name` | TEXT — display name |
| `slug` | TEXT UNIQUE — URL-safe |
| `is_active` | BOOLEAN DEFAULT true |
| `created_by` | UUID FK → `profiles(id)` |
| `base_currency` | TEXT (added later — effectively always `'TRY'`) |

**RLS:** god CRUD; org admin may UPDATE their org; members see rows only for their orgs.

#### `organization_members`
[003_create_org_members.sql](../../supabase/migrations/003_create_org_members.sql), amended by [007](../../supabase/migrations/007_restructure_roles.sql), [045b](../../supabase/migrations/045b_add_manager_role.sql), [097](../../supabase/migrations/097_role_permissions.sql).

| Column | Notes |
|---|---|
| `(organization_id, user_id)` | Composite PK |
| `role` | TEXT CHECK IN (`'admin'`, `'manager'`, `'operation'`, `'ik'`) DEFAULT `'operation'` |
| `invited_by` | UUID FK → `auth.users(id)` |
| `created_at` | TIMESTAMPTZ |

No `updated_at` — the row is replaced, not updated in place (role changes write through an RPC that does a proper upsert).

#### `organization_invitations`
[004_create_org_invitations.sql](../../supabase/migrations/004_create_org_invitations.sql)

| Column | Notes |
|---|---|
| `email` | TEXT — target user's email |
| `role` | Same CHECK as `organization_members.role` |
| `status` | TEXT CHECK IN (`'pending'`, `'accepted'`, `'expired'`) DEFAULT `'pending'` |
| `expires_at` | TIMESTAMPTZ DEFAULT `now() + 7 days` |

**Unique-pending constraint:** `UNIQUE (organization_id, email) WHERE status = 'pending'`.

**Gap:** `expired` status isn't written by any job — expired-but-pending invites linger (see [auth/README.md §11](../auth/README.md#11-known-gaps--open-questions)).

---

### Security & audit

#### `login_attempts` · [023](../../supabase/migrations/023_login_attempts_tracking.sql)
Every sign-in attempt (success or failure). Columns: `user_id`, `device_id`, `success`, `error_type`, `error_message`, `ip_address`, `created_at`. Queried by `should_rate_limit_device`. Retention: none — consider adding.

#### `captcha_challenges` · [024](../../supabase/migrations/024_captcha_challenges.sql)
Pending CAPTCHA challenges. Audit current usage before relying on it for security decisions.

#### `trusted_devices` · [041](../../supabase/migrations/041_trusted_devices.sql)
Devices that have passed auth + trust bar. Reduces friction on subsequent logins.

#### `organization_pins` · [076](../../supabase/migrations/076_organization_pins.sql)
Per-org bcrypt-hashed PIN. One row per org. Read/verified only through `verify_org_pin` RPC — see [auth/README.md §7](../auth/README.md#7-pin-gate).

#### `god_audit_log` · [043](../../supabase/migrations/043_god_audit_logging.sql)
Every god-only action. Columns: actor, action (e.g. `'CREATE_ORGANIZATION'`), target table/id, `old_value` / `new_value` JSONB, timestamp. Written by triggers on `organizations`, `organization_members`. Read: god only.

#### `org_audit_log` · [118](../../supabase/migrations/118_extend_audit_logging.sql)
Org-scoped audit (setting changes, lookup CRUD, etc.). Columns mirror `god_audit_log` but scoped to an `organization_id`. Admins can read their own org's log.

---

### Configurable permissions

#### `role_permissions` · [097](../../supabase/migrations/097_role_permissions.sql)

Per-org, per-table, per-role permission overrides.

| Column | Notes |
|---|---|
| `organization_id` | |
| `table_name` | TEXT — the target table (e.g. `'transfers'`) |
| `role` | TEXT CHECK IN (`'admin'`, `'manager'`, `'operation'`, `'ik'`) |
| `can_select` / `can_insert` / `can_update` / `can_delete` | BOOLEAN |
| `UNIQUE(organization_id, table_name, role)` | One row per cell in the matrix |

When a row exists, it overrides the default from [`private.default_permission`](../../supabase/migrations/097_role_permissions.sql#L74-L145). No row → fall back to default.

**RLS:** god + org admin can manage.

---

### Transfers (core)

Fully documented in [features/transfers.md §3](../features/transfers.md#3-data-model). Summary:

| Table | Purpose |
|---|---|
| `transfers` | One row per deposit/withdrawal. Signed `amount`, snapshotted `exchange_rate`, `amount_try`, `amount_usd`, `commission_rate_snapshot`. Soft-delete via `deleted_at`. |
| `transfer_categories` | Global 2-row lookup: `deposit` / `withdrawal`. `is_deposit` BOOLEAN. |
| `payment_methods` | Global defaults (`bank`, `tether`, `credit-card`) + org-custom (migration 084). |
| `transfer_types` | Global defaults (`client`, `blocked`, `payment`) + org-custom. `is_system`, `exclude_from_net`, `is_excluded` flags. |
| `transfer_audit_log` | Every INSERT/UPDATE/DELETE with JSONB diff (migration 008 + 118). |
| `bloke_resolutions` | Per-transfer blocked-state resolution notes (migration 064). |

---

### PSPs

#### `psps` · [008](../../supabase/migrations/008_transfers_and_operations.sql#L111)
Payment Service Providers. Org-scoped (since 067, global unipayment is possible).

| Column | Notes |
|---|---|
| `organization_id` | Nullable for global PSPs |
| `name` | TEXT |
| `commission_rate` | NUMERIC(5,4) — default rate |
| `currency` | `'TL' \| 'USDT'` |
| `is_active`, `is_internal`, `psp_scope`, `provider` | Operational flags |

#### `psp_commission_rates` · [008:167](../../supabase/migrations/008_transfers_and_operations.sql#L167)
Dated per-PSP commission rate overrides.

| Column | Notes |
|---|---|
| `psp_id` | FK |
| `effective_from` | DATE — this rate applies from this date onward |
| `commission_rate` | NUMERIC(5,4) |

**Lookup pattern:** `SELECT commission_rate FROM psp_commission_rates WHERE psp_id = ? AND effective_from <= transfer_date ORDER BY effective_from DESC LIMIT 1`. Fallback chain: row's `commission_rate_snapshot` → dated rate → PSP's `commission_rate`.

#### `psp_settlements` · [008:251](../../supabase/migrations/008_transfers_and_operations.sql#L251)
Money received from a PSP on a given date.

| Column | Notes |
|---|---|
| `psp_id` | FK |
| `settlement_date` | DATE |
| `amount` | NUMERIC(15,2) `CHECK (amount > 0)` |
| `currency` | `'TL' \| 'USD'` — note: *not yet migrated to USDT* |
| `notes` | TEXT |

**Gap:** `psp_settlements.currency` has `CHECK IN ('TL', 'USD')` — migration 140 didn't touch this. If a PSP settles in stablecoin, this will reject. Audit before first non-TL settlement lands.

**RLS:** admin-only INSERT/UPDATE/DELETE.

#### `unipayment_sync_log` · [067](../../supabase/migrations/067_psp_global_unipayment.sql)
Tracks automated imports from the Unipayment global PSP. Columns: sync timestamp, row count, error details.

---

### FX rates

#### `exchange_rates` · [008:309](../../supabase/migrations/008_transfers_and_operations.sql#L309)

Historical USD→TRY rates per org per day.

| Column | Notes |
|---|---|
| `organization_id` | |
| `currency` | TEXT DEFAULT `'USD'` — only `'USD'` is used today |
| `rate_to_tl` | NUMERIC(10,4) — 1 USD = N TRY |
| `rate_date` | DATE |
| `source` | TEXT — `'manual'`, `'csv-import'`, etc. |
| `UNIQUE (organization_id, currency, rate_date)` | Idempotent upsert key |

Consumed as a *suggestion* when the user creates a transfer — the actual `exchange_rate` on the transfer row is snapshotted at write time. See [features/transfers.md §4.5](../features/transfers.md#45-exchange-rate-is-snapshotted).

**No UPDATE of historical rates** via feature code: if the `rate_to_tl` for a past date is wrong, you have to bulk-correct it via SQL *and* decide whether to re-compute stored `amount_try` / `amount_usd` on affected transfers (we don't, by policy).

---

### Accounting

Overhauled in [120_accounting_overhaul.sql](../../supabase/migrations/120_accounting_overhaul.sql).

| Table | Purpose |
|---|---|
| `accounting_entries` | Ledger: `ODEME` (payment) / `TRANSFER` (internal). Columns: `direction` (`in`/`out`), `register`, `amount`, `currency`, `category_id`, `counterparty`, `notes`. Soft-deletable. |
| `accounting_monthly_config` | Per-month configuration (closed / open). |
| `accounting_registers` | Enum-ish lookup of registers (USDT, NAKIT_TL, NAKIT_USD, TRX). Rows created by migration 120. |
| `accounting_categories` | Hierarchical categories for ledger entries. |
| `accounting_register_snapshots` | Point-in-time register balances (for reconciliation). |
| `register_opening_balances` · [123](../../supabase/migrations/123_register_opening_balances.sql) | Per-register opening balance per period. |

**Registers (values of `accounting_registers.id`):** `USDT`, `NAKIT_TL`, `NAKIT_USD`, `TRX`. HR salary payments in USD hit `NAKIT_USD`; bonuses in USDT hit `USDT`.

**RLS:** admin + manager + ik; operation cannot read accounting (confirmed via `default_permission`).

---

### Wallets

#### `wallets` · [008:626](../../supabase/migrations/008_transfers_and_operations.sql#L626)
Crypto wallets the org tracks (via Tatum API).

| Column | Notes |
|---|---|
| `chain` | `'tron' \| 'ethereum' \| 'bsc' \| 'bitcoin' \| 'solana'` |
| `address` | TEXT |
| `label` | TEXT |
| `is_active` | BOOLEAN |

#### `wallet_snapshots` · [008:682](../../supabase/migrations/008_transfers_and_operations.sql#L682)
Point-in-time balance readings. Columns: `wallet_id`, `balance_native`, `balance_usdt`, `snapshot_at`.

---

### HR / payroll

Tables (not exhaustive; see migration 075, 103–109 + 136–139 for details):

| Table | Purpose |
|---|---|
| `hr_employees` | Employee master. Columns include `role` (e.g. `'Marketing'`, `'Retention'`, `'IT'`), `salary_currency` (`'TL'`/`'USD'` — real cash USD, not USDT), `exit_date` (migration 109). |
| `hr_employee_documents` | Contracts, IDs, uploaded files. |
| `hr_bonus_agreements` | Per-employee bonus contracts. |
| `hr_bonus_payments` | Actual bonus payouts. **Drives HR auto-bonus from Transfers** (see [features/transfers.md §9](../features/transfers.md#9-auto-bonus-integration-hr)). |
| `hr_attendance` | Daily attendance / working-hours records. |
| `hr_salary_payments` | Monthly salary disbursements. Currency determines which register (NAKIT_TL / NAKIT_USD). |
| `hr_settings` | Per-org HR preferences (default currencies, barem thresholds). |
| `hr_leaves` · [075](../../supabase/migrations/075_add_hr_leaves.sql) | Employee leave/time-off records. |
| `hr_mt_config` | Marketing-role tier bonuses (`deposit_tiers`). Consumed by auto-bonus calc. |
| `hr_re_config` | Retention-role bonus config. |
| `hr_bulk_payments` + `hr_bulk_payment_items` · [103](../../supabase/migrations/103_hr_bulk_payments.sql) | Bulk-salary run (parent row + per-employee items). |
| `hr_barem_*` · 105–108 | Target/failure tracking system. |

**RLS:** admin + manager + ik have full access; operation cannot see HR tables (confirmed via `default_permission`).

---

### IB partners

Introducing Broker management ([117](../../supabase/migrations/117_ib_management.sql) + 119, 124–135).

| Table | Purpose |
|---|---|
| `ib_partners` | IB master. Columns: `name`, `agreement_type` (multi-type since 125), `managed_by` (126), `secondary_employee` (128), extended fields (119). |
| `ib_referrals` | Clients attributed to this IB. |
| `ib_commissions` | Commission amounts earned per period. |
| `ib_payments` | Actual payouts to the IB. |

**Link to transfers:** `transfers.ib_partner_id` (migration 124, `ON DELETE SET NULL` via 135) attributes a transfer to an IB.

**Auto-reassign on employee deactivation** (migration 133): if an IB's `managed_by` employee is deactivated, the IB is auto-reassigned.

---

### Integrations

| Table | Purpose | Migration |
|---|---|---|
| `org_webhooks` | Per-org outbound webhook configuration. | 088 |
| `webhook_delivery_log` | Attempts + responses for outbound deliveries. | 088 |
| `org_api_keys` | Per-org API keys for external callers (hashed). | 090 |
| `org_alerts` | Velocity / threshold alerts. | 087 |

Audit current usage before relying on these for production flows — several may be experimental.

---

## 4. Cross-cutting columns you'll see everywhere

Worth calling out so they're not confusing when you encounter them:

| Column | Meaning | Examples |
|---|---|---|
| `is_active` | Enabled / disabled toggle | `organizations`, `psps`, `wallets`, `hr_employees` |
| `is_deposit` | Direction marker for money flow | `transfer_categories` |
| `is_system` | Protected row, cannot be edited/deleted by users | `transfer_types.blocked` |
| `exclude_from_net` | Should this row's amount be excluded from "net" aggregates | `transfer_types.payment` |
| `is_excluded` | Should this row's amount be excluded from *every* aggregate | `transfer_types.blocked` |
| `deleted_at` / `deleted_by` | Soft-delete pair | `transfers`, `accounting_entries` |
| `organization_id` | Tenant boundary | Every domain table |
| `commission_rate_snapshot` | PSP's rate at write time — historical truth | `transfers` |
| `exchange_rate` | USD→TRY at write time | `transfers` |
| `amount_try` / `amount_usd` | Precomputed equivalents | `transfers` |

---

## 5. Enums (and their semantic maps)

Every enum-like column is TEXT with a CHECK constraint. Full list:

| Column | Allowed values | Meaning |
|---|---|---|
| `profiles.system_role` | `'god' \| 'user'` | Cross-org super-admin flag |
| `organization_members.role` | `'admin' \| 'manager' \| 'operation' \| 'ik'` | Org-scoped role |
| `organization_invitations.role` | same as above | |
| `organization_invitations.status` | `'pending' \| 'accepted' \| 'expired'` | Invite lifecycle |
| `transfers.currency` | `'TL' \| 'USDT'` (as of migration 140) | Native currency of `amount` |
| `exchange_rates.currency` | `'USD'` (practically only value used) | Rate lookup key |
| `psps.currency` | `'TL' \| 'USDT'` | PSP's settlement currency |
| `psp_settlements.currency` | `'TL' \| 'USD'` | ⚠ Not yet USDT-migrated — see [§PSPs](#psps) |
| `accounting_entries.direction` | `'in' \| 'out'` | Money flow direction |
| `accounting_entries.type` | `'ODEME' \| 'TRANSFER'` | Payment vs internal transfer |
| `accounting_entries.register` | `'USDT' \| 'NAKIT_TL' \| 'NAKIT_USD' \| 'TRX'` | Which register the entry hits |
| `hr_employees.salary_currency` | `'TL' \| 'USD'` | Real cash USD salaries (not USDT) |
| `wallets.chain` | `'tron' \| 'ethereum' \| 'bsc' \| 'bitcoin' \| 'solana'` | Blockchain |

**When to add a new enum value:**

1. Widen the CHECK with `ALTER TABLE … DROP CONSTRAINT …; ADD CONSTRAINT …`.
2. Update all RPCs that branch on the column.
3. Update all frontend unions in `src/lib/database.types.ts`.
4. Update this table in the spec.
5. Update any feature spec that references the column.

The drift from missing step 2 is exactly what caused the USDT incident — migration 080 widened `transfers.currency` but the RPCs kept checking `'USD'`. See [features/transfers.md §13](../features/transfers.md#13-migrations-timeline).

---

## 6. Key relationships

```
auth.users ─┬──→ profiles (1:1)
            │
            └──→ organization_members ←── organizations
                         │                      │
                         │                      └──→ organization_invitations
                         │
                         └──→ (role determines capabilities below)

organizations ──→ transfers ──┬──→ transfer_categories
                              ├──→ payment_methods
                              ├──→ transfer_types
                              ├──→ psps ──→ psp_commission_rates
                              │         └──→ psp_settlements
                              ├──→ hr_employees ──→ hr_bonus_payments (via transfer_id)
                              ├──→ ib_partners ──→ ib_commissions → ib_payments
                              └──→ transfer_audit_log

organizations ──→ accounting_entries ──→ accounting_registers / accounting_categories
organizations ──→ wallets ──→ wallet_snapshots
organizations ──→ exchange_rates
```

Every arrow carries `ON DELETE CASCADE` or `ON DELETE SET NULL`. When an org is deleted, everything below cascades. When a user is deleted (rare), `profiles` cascades and `created_by` / `updated_by` go to NULL.

---

## 7. Migration conventions

### 7.1 Naming

`NNN_snake_case_description.sql`. NNN is a 3-digit prefix (001–139 today).

Known duplicates:
- `045` + `045b_add_manager_role.sql` — 045b is an intentional follow-up (not a real duplicate).
- `069` + `069b` — same pattern.
- `117_ib_management.sql` + `117_transfer_fix_trash_permissions.sql` — **real duplicate prefix**. See [supabase/migrations/README.md](../../supabase/migrations/README.md).
- `136_hr_qr_checkin.sql` + `136_transfers_2026_data_import.sql` — real duplicate prefix.

### 7.2 Paste order

Migrations are **pasted into the Supabase SQL editor manually**, in order. There is no `supabase db push` workflow today. The CLI *can* run them, but the deploy contract is "paste the new migration in prod Supabase Dashboard."

### 7.3 Post-migration manual steps

Documented in CLAUDE.md, recapitulated here:

1. Paste 001 → 007 in order on a fresh project.
2. Enable JWT custom hook in Supabase Dashboard.
3. Promote god admin via SQL.
4. Sign out/in to refresh JWT.

Every migration that requires an additional manual step must say so **in its header comment**.

### 7.4 Destructive migrations backup

Bulk data migrations (e.g. [136_transfers_2026_data_import.sql](../../supabase/migrations/136_transfers_2026_data_import.sql)) snapshot affected rows to a `*_backup_<tag>` table before DELETE. When writing a new bulk migration, follow the pattern:

```sql
CREATE TABLE public.transfers_backup_<tag> AS SELECT * FROM public.transfers WHERE …;
DELETE FROM public.transfers WHERE …;
-- perform new inserts
```

---

## 8. Known gaps / open questions

- **`psp_settlements.currency`** still CHECK IN `('TL', 'USD')` — should be migrated to `('TL', 'USDT')` when first settlement in stablecoin happens.
- **`exchange_rates.currency`** hardcoded to `'USD'`. If we ever store EUR or other base→TRY rates, widen the CHECK and update all call-sites that implicitly assume USD.
- **Retention of `login_attempts`, `transfer_audit_log`, `webhook_delivery_log`, `god_audit_log`.** None have a retention policy. On a growing org they'll bloat.
- **`captcha_challenges` and `trusted_devices` actual usage** — underdocumented. Audit before relying.
- **`hr_barem_*` tables** — added by 105–108, not fully documented here. Add to [features/hr.md](../features/hr.md) (TBD) when written.
- **Duplicate migration prefixes** (117, 136) — would be nice to rename to 117/117b and 136/136b conventions. Risky mid-development; document clearly instead.
- **No integration tests exercising RLS boundaries.** We rely on manual QA. Any future test strategy should include "operation tries to delete a transfer → 403" type cases.
- **`transfers_backup_2026_import`** table left in production after the 2026 CSV re-import. Harmless but messy. Consider a periodic `DROP TABLE IF EXISTS *_backup_*` policy if the pattern proliferates.
