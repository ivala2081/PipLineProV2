# PSPs (Payment Service Providers)

**Status:** Living spec · reflects codebase as of `main` on 2026-04-24
**Owner (feature):** Brokztech team
**Related:** [features/transfers.md](./transfers.md), [features/accounting.md](./accounting.md), [api/README.md §4](../api/README.md#4-psp-rpcs)

> A **PSP** is a payment service provider the org routes transfers through. Every deposit / withdrawal on the Transfers page is attributed to one PSP, and every PSP has its own commission rate history, settlement ledger, and (when provided) third-party integration (UniPayment). The PSP balance is the truth table for "how much has this provider promised us vs. actually sent us."

---

## Table of contents

1. [Scope](#1-scope)
2. [Domain vocabulary](#2-domain-vocabulary)
3. [Data model](#3-data-model)
4. [Commission rate resolution](#4-commission-rate-resolution)
5. [Settlements](#5-settlements)
6. [Blocked transfers workflow](#6-blocked-transfers-workflow)
7. [PSP scope: local vs global (UniPayment)](#7-psp-scope-local-vs-global-unipayment)
8. [PSP balance computation](#8-psp-balance-computation)
9. [RPC contracts](#9-rpc-contracts)
10. [UI architecture](#10-ui-architecture)
11. [Accounting integration](#11-accounting-integration)
12. [RLS & permissions](#12-rls--permissions)
13. [Migrations timeline](#13-migrations-timeline)
14. [Known gaps / open questions](#14-known-gaps--open-questions)

---

## 1. Scope

**In scope:**
- The `psps` table and its per-PSP rate history (`psp_commission_rates`).
- Settlements (`psp_settlements`) and their auto-entry into accounting (migration 131).
- Blocked-transfer resolutions (`bloke_resolutions`) and the PSP "Bloke" tab.
- UniPayment integration (`unipayment_sync_log`, `provider`, `provider_app_id` columns, and the related Edge Function).
- PSPs list page (`/psps`) and the PSP detail page with its tabs.
- RPCs: `get_psp_summary`, `get_psp_ledger`, `get_psp_monthly_summary`, `get_psp_bloke_transfers`.

**Out of scope:**
- Transfer commission application rules (documented in [features/transfers.md §4.1](./transfers.md#41-commission-applies-to-deposits-only)).
- Accounting ledger entries created by PSP settlements — the write path lives here, the read path lives in [features/accounting.md §8.2](./accounting.md#82-psp-settlements-migration-131).

---

## 2. Domain vocabulary

| Term | Definition |
|---|---|
| **PSP** | A payment service provider the org routes transfers through (e.g. `#72 CRYPPAY`, `UniPayment`). One row in `psps` per provider per org (or global, see [§7](#7-psp-scope-local-vs-global-unipayment)). |
| **Commission rate** | The PSP's fee on a deposit, stored as decimal fraction (`0.10` = 10%). Default `0.0100` (1%). Applied only to deposits (never withdrawals — see [features/transfers.md §4.1](./transfers.md#41-commission-applies-to-deposits-only)). |
| **Commission rate snapshot** | `transfers.commission_rate_snapshot` — the rate that was effective **at write time** of a given transfer. Source of truth for historical commission calculations. |
| **Dated commission rate** | A row in `psp_commission_rates` with `effective_from` date. Lets the PSP's rate change over time; historical transfers still use their snapshotted rate. |
| **Settlement (tahsilat)** | Money the PSP actually sent to the org. Recorded in `psp_settlements`. Reduces the "outstanding balance" the PSP owes. Auto-creates a matching accounting entry since migration 131. |
| **Balance (outstanding)** | `Σ net` (deposits − commission) − `Σ settlements` for a given PSP. What the PSP still owes us. |
| **Initial balance** (`psps.initial_balance`) | Opening balance for the PSP (carry-over from pre-system state). Added by migration 113 / 116. |
| **Bloke / Blocked** | A transfer marked as blocked (frozen/stalled by the PSP). Excluded from all aggregates (see [transfers.md §4.2](./transfers.md#42-blocked-transfers-are-excluded-from-totals)). Each blocked transfer gets a `bloke_resolutions` row with `status ∈ { pending, resolved, written_off }`. |
| **PSP scope** (`psps.psp_scope`) | `'local'` (default) or `'global'`. Local = org-specific PSP. Global = shared across orgs (only UniPayment today). |
| **Provider** (`psps.provider`) | `NULL` for manual-tracked PSPs, `'unipayment'` for UniPayment-integrated PSPs. |
| **Is internal** (`psps.is_internal`) | Flag for "this PSP is an internal money movement marker" (e.g. transfers to our own wallet). Filtered out of some reports. |

---

## 3. Data model

### 3.1 `psps`

Base: [008:111–121](../../supabase/migrations/008_transfers_and_operations.sql#L111-L121). Extended by 050, 067, 113.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `organization_id` | UUID FK | Scopes the PSP to an org (except UniPayment global — see [§7](#7-psp-scope-local-vs-global-unipayment)) |
| `name` | TEXT | Display name (e.g. `'#72 CRYPPAY'`, `'UniPayment'`) |
| `commission_rate` | NUMERIC(5,4) DEFAULT `0.0100` | Current rate. Auto-synced from latest `psp_commission_rates` via trigger |
| `is_active` | BOOLEAN DEFAULT `true` | Hide inactive PSPs from the list (opt-in via toggle) |
| `is_internal` | BOOLEAN DEFAULT `false` | Internal-only PSP (e.g. own-wallet transfers) |
| `currency` | TEXT (added migration 050) | `'TL' \| 'USDT'` (post-080). PSP's settlement currency |
| `psp_scope` | TEXT DEFAULT `'local'` (added migration 067) | `'local' \| 'global'` |
| `provider` | TEXT (added migration 067) | `NULL \| 'unipayment'` |
| `provider_app_id` | TEXT (added migration 067) | External app ID for UniPayment |
| `initial_balance` | NUMERIC (added migration 116) | Opening balance carry-over |
| `UNIQUE (organization_id, name)` | | One PSP name per org |
| `UNIQUE INDEX … WHERE provider = 'unipayment'` (migration 067) | | One UniPayment PSP per org |

### 3.2 `psp_commission_rates`

[008:167–175](../../supabase/migrations/008_transfers_and_operations.sql#L167-L175). Dated rate history.

| Column | Notes |
|---|---|
| `psp_id` FK | |
| `organization_id` FK | |
| `commission_rate` | NUMERIC(5,4). The rate effective from this date onward |
| `effective_from` | DATE. Rate applies to transfers with `transfer_date >= effective_from` |
| `created_by`, `created_at` | |

**Triggers** ([008:204–245](../../supabase/migrations/008_transfers_and_operations.sql#L204-L245)):

- `on_psp_rate_inserted` → calls `sync_psp_current_rate()`. Updates `psps.commission_rate` to the new rate **only if no later-dated rate exists** for this PSP. (Idempotent: inserting an older rate doesn't overwrite the current.)
- `on_psp_rate_deleted` → calls `sync_psp_current_rate_on_delete()`. Finds the latest remaining dated rate and writes it to `psps.commission_rate`; falls back to `0.0100` if no rates remain.

### 3.3 `psp_settlements`

[008:251–262](../../supabase/migrations/008_transfers_and_operations.sql#L251-L262). Extended by migration 131.

| Column | Notes |
|---|---|
| `id` UUID PK | |
| `psp_id`, `organization_id` FKs | |
| `settlement_date` | DATE |
| `amount` | NUMERIC(15,2) CHECK `> 0` |
| `currency` | TEXT CHECK IN `('TL', 'USD')` — ⚠ **still `'TL'` not `'TRY'`**, and no `'USDT'` allowed |
| `notes` | TEXT |
| `register`, `register_id`, `description` (added migration 131) | For accounting-integrated settlements |
| `created_by`, `created_at`, `updated_at` | |

**Trigger (migration 131):** `trg_psp_settlement_accounting` — `AFTER INSERT` creates a matching `accounting_entries` row (`entry_type='TRANSFER'`, `direction='in'`, `psp_settlement_id = NEW.id`, `category_id = <'psp_transfer'>`). Register defaults to `'USDT'` if not provided.

### 3.4 `bloke_resolutions`

[064:6–18](../../supabase/migrations/064_bloke_resolutions.sql#L6-L18). One row per blocked transfer.

| Column | Notes |
|---|---|
| `transfer_id` FK (UNIQUE) | One resolution per transfer |
| `organization_id` FK | |
| `status` | CHECK IN `('pending', 'resolved', 'written_off')` DEFAULT `'pending'` |
| `resolution_date` | DATE when resolved |
| `resolution_notes` | TEXT |
| `resolved_by` | UUID FK → `auth.users` |
| `created_at`, `updated_at` | |

**Auto-insertion trigger** ([064:68–86](../../supabase/migrations/064_bloke_resolutions.sql#L68-L86)): `on_transfer_auto_bloke_resolution` — when a transfer is INSERTed with `type_id = 'blocked'`, a `pending` resolution row is auto-created. `ON CONFLICT DO NOTHING` ensures idempotence.

### 3.5 `unipayment_sync_log`

[067:35–46](../../supabase/migrations/067_psp_global_unipayment.sql#L35-L46). One row per `psp_id` (UNIQUE).

| Column | Notes |
|---|---|
| `psp_id` FK UNIQUE | One sync record per PSP |
| `organization_id` FK | |
| `last_synced_at` | TIMESTAMPTZ |
| `last_txn_id` | TEXT — last UniPayment transaction ID synced (for dedup) |
| `sync_status` | CHECK IN `('idle', 'running', 'error')` |
| `error_message` | TEXT |

Paired with `transfers.external_transaction_id` (also from 067) + a partial UNIQUE index for per-org dedup.

---

## 4. Commission rate resolution

When computing commission for a transfer, the resolution order is:

1. **`transfers.commission_rate_snapshot`** (if non-NULL). Set at write time by [`useTransfersQuery.ts:85–86`](../../src/hooks/queries/useTransfersQuery.ts#L85-L86). This is the **source of truth for historical accuracy**.
2. **Latest dated rate** — `SELECT commission_rate FROM psp_commission_rates WHERE psp_id = ? AND effective_from <= transfer_date ORDER BY effective_from DESC LIMIT 1`.
3. **PSP default** — `psps.commission_rate`.

Used by `get_psp_summary` at [115:50–60](../../supabase/migrations/115_align_psp_summary_with_ledger.sql#L50-L60) (simplified to deposits-only in migration 115).

**For blocked transfers:** the rate is forced to `0` regardless of source ([useTransfers.ts:131–134](../../src/hooks/useTransfers.ts#L131-L134) + server-side invariant from migration 111).

---

## 5. Settlements

### 5.1 Write paths

Two ways a `psp_settlements` row gets created:

1. **Manual** — admin enters a settlement directly from the PSP detail page ("Add Settlement" button). Leaves `register` / `register_id` NULL.
2. **Accounting-integrated** (migration 131) — the accounting form routes "Psp Tahsilatı" category entries through `psp_settlements`. `register` / `register_id` are populated from the form.

In both cases, the [131 trigger](../../supabase/migrations/131_psp_settlement_accounting_integration.sql#L41-L79) auto-creates the matching `accounting_entries` row. **Do not** manually insert both — the trigger handles it.

### 5.2 Currency

Still `CHECK IN ('TL', 'USD')` — **not yet widened** to include `'USDT'` or renamed `'TL' → 'TRY'`. See [§14](#14-known-gaps--open-questions).

### 5.3 Balance reduction

Each settlement reduces the PSP's outstanding balance. See [§8](#8-psp-balance-computation).

### 5.4 Delete handling

Deleting a `psp_settlements` row cascades to the auto-created `accounting_entries` row via `ON DELETE SET NULL` on `accounting_entries.psp_settlement_id`. The entry is not auto-deleted — only unlinked. ⚠ This leaves an orphaned accounting entry. See [§14](#14-known-gaps--open-questions).

---

## 6. Blocked transfers workflow

### 6.1 Lifecycle

1. Transfer created with `type_id = 'blocked'`.
2. `auto_create_bloke_resolution` trigger inserts a `bloke_resolutions` row with `status = 'pending'`.
3. Admin reviews in the PSP detail → **Bloke** tab (`PspBlokeTab.tsx`).
4. Admin updates status: `resolved` (money recovered) or `written_off` (money lost).
5. Optionally fills `resolution_date`, `resolution_notes`.

### 6.2 Backfill

Migration 064 backfilled resolutions for all pre-existing blocked transfers ([064:90–94](../../supabase/migrations/064_bloke_resolutions.sql#L90-L94)).

### 6.3 Aggregate exclusion

Blocked transfers are **always excluded** from totals — see [transfers.md §4.2](./transfers.md#42-blocked-transfers-are-excluded-from-totals). This is orthogonal to the resolution status: a `resolved` blocked transfer is still blocked for aggregation purposes.

---

## 7. PSP scope: local vs global (UniPayment)

### 7.1 The split

Migration 067 introduced `psp_scope`:

- **`'local'`** (default) — PSP belongs to one org. Only visible to that org.
- **`'global'`** — PSP is shared across orgs. Only one type today: UniPayment.

### 7.2 UniPayment specifics

- `provider = 'unipayment'` marks the PSP as integrated.
- `provider_app_id` stores the UniPayment application ID.
- One-per-org constraint via partial unique index ([067:19–21](../../supabase/migrations/067_psp_global_unipayment.sql#L19-L21)).
- Transfers synced from UniPayment carry `external_transaction_id` so re-sync is idempotent.
- `unipayment_sync_log` tracks sync state (running / idle / error).

### 7.3 Sync flow

1. Admin clicks "Sync UniPayment" in PSP detail.
2. Frontend calls `unipayment-proxy` Edge Function ([api/README.md §12](../api/README.md#12-edge-functions)).
3. Edge Function:
   - Fetches access token (client-credentials flow, cached in-memory).
   - Queries UniPayment API since `last_txn_id` (or from scratch for first sync).
   - Inserts new transfers with `external_transaction_id` set.
   - Updates `unipayment_sync_log` with new `last_synced_at` + `last_txn_id` + status.
4. Related UI tabs (`UniPaymentTransactionsTab`, `UniPaymentInvoicesTab`, `UniPaymentWalletTab`, `UniPaymentPaymentsTab`, `UniPaymentSyncTab`) surface the synced state.

### 7.4 Secrets

UniPayment credentials live in Supabase Edge Function secrets (OAuth2 client_id/secret). **Never** expose to the frontend. The proxy pattern keeps them server-side.

---

## 8. PSP balance computation

The "outstanding balance" for a PSP is the core KPI shown on the PSPs list page.

```
balance = initial_balance
        + Σ (deposit.net)                    // what the PSP owes us from deposits
        − Σ |withdrawal.amount|              // minus what we've let them take back
        − Σ settlements.amount                // minus what they've actually paid
```

Where `deposit.net = amount − commission` (amount is positive for deposits, commission is deposits-only).

Actual computation path: `get_psp_summary` returns `total_deposits`, `total_withdrawals`, `total_commission`, `total_net`, `total_settlements`. The frontend derives `balance = total_net − total_settlements + (initial_balance)` in [PspSummaryTab.tsx / usePspDashboardQuery.ts](../../src/hooks/queries/usePspDashboardQuery.ts).

**`balance > 0`** → PSP still owes us money (colored orange/red in UI).
**`balance ≤ 0`** → Settled or overpaid (colored green).

---

## 9. RPC contracts

Full detail in [api/README.md §4](../api/README.md#4-psp-rpcs). Summary:

### 9.1 `get_psp_summary(_org_id uuid) → TABLE`

Latest: [115_align_psp_summary_with_ledger.sql](../../supabase/migrations/115_align_psp_summary_with_ledger.sql).

One row per PSP with lifetime totals. Commission is deposits-only (fixed in 115). `total_net` uses stored `tr.net` with a fallback to `amount ± commission` when `net=0`.

**Timezone:** `SET timezone = 'Europe/Istanbul'` — matters for `tr.transfer_date::date` grouping inside LATERAL joins.

### 9.2 `get_psp_ledger(_psp_id uuid, _org_id uuid) → TABLE`

Latest: [114_fix_psp_ledger_timezone.sql](../../supabase/migrations/114_fix_psp_ledger_timezone.sql).

Chronological daily ledger for one PSP. Each row is a day with deposits, withdrawals, commission, net, settlement, and a running balance.

**Key invariant:** commission in the ledger = `Σ tr.commission WHERE is_deposit` — same formula `get_psp_summary` uses post-115. The whole point of 115 was to align these two.

### 9.3 `get_psp_monthly_summary(_psp_id uuid, _org_id uuid) → TABLE`

Latest: [112_bugfixes.sql:449–518](../../supabase/migrations/112_bugfixes.sql#L449-L518).

Per-month rows for one PSP. Used by PspMonthlyTab to render a monthly grid.

Commission is deposits-only (BUG-05 fix in 112). `month_label` like `'Mar 2026'`.

### 9.4 `get_psp_bloke_transfers(_psp_id uuid, _org_id uuid) → TABLE`

[064:98–139](../../supabase/migrations/064_bloke_resolutions.sql#L98-L139).

Returns blocked transfers for one PSP joined with their resolution status.

---

## 10. UI architecture

### 10.1 Route and scaffold

- `/psps` → [src/pages/psps/index.tsx](../../src/pages/psps/index.tsx) — lists PSPs as cards.
- `/psps/:id` → [PspDetailPage.tsx](../../src/pages/psps/PspDetailPage.tsx) — tabs: Summary, Monthly, Bloke, UniPayment (if provider=unipayment).

### 10.2 PSPs list page

Each PSP is a card with a **colored accent bar** on the left ([index.tsx:55–67](../../src/pages/psps/index.tsx#L55-L67)):

| Accent | Meaning |
|---|---|
| `bg-black/20` | Inactive PSP |
| `bg-cyan` | Global PSP (e.g. UniPayment) |
| `bg-blue` | Internal PSP |
| `bg-orange` | `balance > 0` (PSP owes us) |
| `bg-red` | `balance < 0` (overpaid) |
| `bg-green` | `balance = 0` (settled) |

Tag variants on the card: `green/red` for active/inactive, `cyan` for Global, `blue` for provider (e.g. UniPayment), `purple` for internal.

### 10.3 Add PSP dialog

Admin-only. Fields: name, commission rate, currency (`'TRY' | 'USDT'`), is_active, is_internal. Inserts into `psps`.

### 10.4 PSP detail tabs

- **Summary** — KPI cards (deposits, withdrawals, commission, net, balance, last settlement) + a settlements list with "Add settlement" button. Uses `get_psp_summary` + direct `psp_settlements` query.
- **Monthly** — per-month grid from `get_psp_monthly_summary`. Highlights the current month.
- **Bloke** — blocked transfers with resolution status. Inline-editable status/date/notes via `bloke_resolutions` mutations.
- **UniPayment** (conditional — only for `provider='unipayment'`): 5 sub-tabs (Transactions, Invoices, Wallet, Payments, Sync) driven by the `unipayment-proxy` Edge Function.

### 10.5 Commission rate history

[PspRateHistoryDialog.tsx](../../src/pages/transfers/PspRateHistoryDialog.tsx) — shows full `psp_commission_rates` rows for a PSP. Admins can add a new dated rate here. The insert fires the sync trigger → `psps.commission_rate` auto-updates if it's the latest rate.

---

## 11. Accounting integration

Already covered in [accounting.md §8.2](./accounting.md#82-psp-settlements-migration-131) and [§5.1](#51-write-paths) above. Summary:

- Every `psp_settlements` INSERT → auto-creates an `accounting_entries` row via trigger.
- Category: `'psp_transfer'` (global default — seeded in migration 120).
- Direction: `'in'` (settlement is money coming into the org).
- Type: `'TRANSFER'`.
- Register: from the settlement, defaults to `'USDT'`.
- Links bi-directionally: `accounting_entries.psp_settlement_id` ↔ `psp_settlements.id`.

**Do not** manually create a settlement and a matching accounting entry. The trigger handles it.

---

## 12. RLS & permissions

### 12.1 Who can do what

| Op | God | Admin | Manager | Operation | IK |
|---|---|---|---|---|---|
| SELECT `psps`, `psp_commission_rates`, `psp_settlements` | ✓ | ✓ | ✓ | ✓ | ✓ |
| INSERT / UPDATE / DELETE `psps` | ✓ | ✓ | ✗ | ✗ | ✗ |
| INSERT `psp_commission_rates` | ✓ | ✓ | ✗ | ✗ | ✗ |
| DELETE `psp_commission_rates` | ✓ | ✓ | ✗ | ✗ | ✗ |
| INSERT / UPDATE / DELETE `psp_settlements` | ✓ | ✓ | ✗ | ✗ | ✗ |
| SELECT `bloke_resolutions` | ✓ | ✓ | ✓ | ✓ | ✓ |
| INSERT / UPDATE / DELETE `bloke_resolutions` | ✓ | ✓ | ✗ | ✗ | ✗ |
| View `page:psps` | ✓ | ✓ (admin-only) | ✗ | ✗ | ✗ |

Source: [`private.default_permission`](../../supabase/migrations/120_accounting_overhaul.sql#L484-L498) + [bloke_resolutions RLS in 064](../../supabase/migrations/064_bloke_resolutions.sql#L32-L62).

### 12.2 PSP page is admin-only

`page:psps` → admin only (not manager, not operation, not ik) — see [120:446–448](../../supabase/migrations/120_accounting_overhaul.sql#L446-L448). PSP CRUD is considered a configuration action.

**Consequence:** managers and ik users can **see** PSPs in the Transfers filter drawer (via SELECT on `psps`) but cannot navigate to `/psps` to view/edit them.

### 12.3 `unipayment_sync_log` RLS

Custom pattern (migration 067): SELECT for all org members; write for admin/manager/god ([067:51–73](../../supabase/migrations/067_psp_global_unipayment.sql#L51-L73)). Differs from the main PSP tables which are admin-only.

---

## 13. Migrations timeline

| # | File | Effect |
|---|---|---|
| 008 | `008_transfers_and_operations.sql` | Base: `psps`, `psp_commission_rates`, `psp_settlements`, rate sync triggers |
| 047 | `047_fix_psp_commissions.sql` | Bugfix in `get_psp_summary` commission logic |
| 050 | `050_add_psp_currency.sql` | Added `currency` column to `psps` |
| 051–055 | `051_get_psp_ledger.sql` / 052 / 053 / 054 / 055 | Multiple iterations on ledger + summary RPCs |
| 063 | `063_get_psp_monthly_summary.sql` | New RPC for monthly per-PSP grid |
| 064 | `064_bloke_resolutions.sql` | `bloke_resolutions` table + auto-create trigger + `get_psp_bloke_transfers` RPC + backfill |
| 067 | `067_psp_global_unipayment.sql` | `psp_scope`, `provider`, `provider_app_id`; `unipayment_sync_log` table; `transfers.external_transaction_id` |
| 080 | `080_migrate_tether_to_usdt.sql` | Tether-PSP transfers currency → `'USDT'`; `psps.currency` for Tether PSPs → `'USDT'` |
| 112 | `112_bugfixes.sql` | `get_psp_monthly_summary` deposits-only commission (BUG-05); `get_psp_summary` blocked filter fix (BUG-04) |
| 113 | `113_ozet_summary.sql` | New `get_ozet_summary` RPC (cross-PSP monthly) |
| 114 | `114_fix_psp_ledger_timezone.sql` | Timezone fix |
| 115 | `115_align_psp_summary_with_ledger.sql` | Aligned `get_psp_summary` and `get_psp_ledger` commission/net formulas |
| 116 | `116_psp_initial_balance_note.sql` | Added `initial_balance` column + notes |
| 131 | `131_psp_settlement_accounting_integration.sql` | Settlement → accounting auto-entry trigger; added `register`, `register_id`, `description` to `psp_settlements`; `psp_settlement_id` on `accounting_entries` |

---

## 14. Known gaps / open questions

- **`psp_settlements.currency` CHECK is stale.** Still `('TL', 'USD')` — not widened to include `'USDT'` or aligned with migration 141's `'TL'→'TRY'` canonical. First USDT settlement or first TRY-labeled attempt will be rejected. Do a `141b` migration to widen + normalize.
- **Orphan accounting entries on settlement delete.** `accounting_entries.psp_settlement_id` uses `ON DELETE SET NULL`, not `CASCADE`. Deleting a settlement leaves the entry behind with the FK nulled — ledger balances drift. Either cascade-delete the entry, or refuse the settlement delete if an entry exists.
- **No `is_excluded`-equivalent filter on `get_psp_summary`.** The RPC uses `NOT coalesce(tt.is_excluded, false)` to filter blocked — but payment-type (ödeme) transfers are **not** excluded. A PSP's "net" in the summary page may include payment-type transfers it shouldn't. Compare with `get_monthly_summary`'s `NOT exclude_from_net` filter.
- **Initial balance not surfaced in `get_psp_ledger`.** The ledger RPC doesn't prepend the `initial_balance` as a pseudo-row. The running-balance computation assumes balance starts at 0 on day 1. Frontend re-derives or ignores. Compute it at the RPC layer for consistency.
- **Manager/IK can't manage PSPs.** `page:psps` is admin-only. If an org wants a "PSP manager" role, it requires either custom `role_permissions` overrides or expanding `default_permission`.
- **UniPayment one-per-org constraint** may be too strict for multi-environment setups (test + prod UniPayment). No plans to lift, but worth noting.
- **Rate history trigger has a subtle bug.** `sync_psp_current_rate` updates `psps.commission_rate` only if no later-dated rate exists. But if admins insert rates out of order (older first, newer second), the second insert correctly updates. If they insert newer first, then an older one: the older insert is a no-op — correct. But **edits** to an existing rate row (UPDATE) don't fire the sync trigger — the trigger is `AFTER INSERT` only. Editing the latest rate to a different value leaves `psps.commission_rate` stale. Fix: add an `AFTER UPDATE` trigger mirror.
- **`psp_settlements` has no `deleted_at`.** Unlike `transfers`, settlements are hard-deleted. Combined with the orphan-entry issue, this makes accidental deletes costly. Add soft-delete.
- **Commission-rate-history UI is in the Transfers module.** [PspRateHistoryDialog.tsx](../../src/pages/transfers/PspRateHistoryDialog.tsx) lives under `src/pages/transfers/` but is about PSPs. Move to `src/pages/psps/` on next touch.
- **UniPayment as global PSP isn't well-documented.** `psp_scope = 'global'` theoretically allows cross-org sharing but the only global PSP today is UniPayment. If another global PSP is added, check whether the `UNIQUE (organization_id, name)` constraint + `organization_id NOT NULL` FK still make sense for a truly global row.
- **No per-PSP audit log.** `psps` changes aren't captured in `org_audit_log` unless the audit trigger covers the table — verify whether migration 118's `audit_org_table_change` is installed on `psps`.
- **`sync_psp_current_rate` trigger bypasses RLS** via `SECURITY DEFINER`. Intentional (rate sync must work even if the inserter's role doesn't have UPDATE on `psps`). But it does mean a user with INSERT on `psp_commission_rates` indirectly triggers an UPDATE on `psps.commission_rate`. Acceptable given both require admin role, but document it.
