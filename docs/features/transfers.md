# Transfers

**Status:** Living spec · reflects codebase as of `main` on 2026-04-24
**Owner (feature):** Brokztech team
**Related:** [design-system/components.md](../design-system/components.md), [design-system/patterns.md](../design-system/patterns.md)

> Transfers is the **operational heart** of PipLinePro. Every deposit and withdrawal the organization processes flows through this feature. Drift here compounds — a wrong commission formula in one place quietly infects monthly KPIs, HR bonuses, and accounting. This spec exists so new code (human or AI) can't silently disagree with the rules below.

---

## Table of contents

1. [Scope](#1-scope)
2. [Domain vocabulary](#2-domain-vocabulary)
3. [Data model](#3-data-model)
4. [Business rules](#4-business-rules)
5. [Computed amounts (`computeTransfer`)](#5-computed-amounts-computetransfer)
6. [Daily summary formulas (`computeDaySummary`)](#6-daily-summary-formulas-computedaysummary)
7. [RPC contract: `get_monthly_summary`](#7-rpc-contract-get_monthly_summary)
8. [UI architecture](#8-ui-architecture)
9. [Auto-bonus integration (HR)](#9-auto-bonus-integration-hr)
10. [PIN gate](#10-pin-gate)
11. [Import pipeline](#11-import-pipeline)
12. [RLS & permissions](#12-rls--permissions)
13. [Migrations timeline](#13-migrations-timeline)
14. [Known gaps / open questions](#14-known-gaps--open-questions)

---

## 1. Scope

**In scope:**
- The `transfers` table and its four lookup tables (`transfer_categories`, `payment_methods`, `transfer_types`, `psps`).
- The Transfers page (`/transfers`) and its tabs: list, Monthly, Trash, Settings.
- The Daily Summary dialog.
- Create / edit / delete / bulk delete / CSV import / Excel export flows.
- Auto-bonus side-effects to `hr_bonus_payments`.
- The `get_monthly_summary` RPC (consumed by this page's Monthly tab and the Dashboard).

**Out of scope:**
- PSP management and PSP settlement (see `docs/features/psp.md` — TBD).
- Accounting ledger entries derived from transfers (see `docs/features/accounting.md` — TBD).
- IB partner management (see `docs/features/ib-partners.md` — TBD). *Referenced* here via `transfers.ib_partner_id`.
- HR employee CRUD and bonus settlement (see `docs/features/hr.md` — TBD). *Referenced* here via `transfers.employee_id` and auto-bonus logic.

---

## 2. Domain vocabulary

Every term below appears verbatim in code and/or UI. Getting these wrong is how bugs start.

| Term | Definition |
|---|---|
| **Transfer** | One end-to-end money movement record: a deposit or withdrawal to/from a customer, through one PSP, on one date, in one currency. Soft-deletable via `deleted_at`. |
| **Category** | Binary: **Deposit** (`is_deposit=true`) or **Withdrawal** (`is_deposit=false`). Global, not org-configurable. Drives commission applicability and sign handling. |
| **Type** (`transfer_types`) | What *kind* of record this is: **Client** (normal customer activity), **Blocked** (stalled/frozen funds — see §4.2), **Payment** / **Ödeme** (internal payments — see §4.3), or org-custom types. |
| **Payment method** | How the money was moved: **Bank**, **Credit Card**, **Tether** (USDT wallet), plus org-custom methods. |
| **PSP** | Payment Service Provider that processed the transfer. Each PSP has a default `commission_rate` and optional dated `psp_commission_rates` overrides. |
| **Commission** | Fee charged by the PSP on a **deposit** (never a withdrawal — see §4.1). Calculated at write time and stored on the row. |
| **Net** | `amount − commission` for deposits; `amount` for withdrawals (already negative). See §5. |
| **Base currency** | The org's primary currency (from `organizations.base_currency`). In practice always `TRY` / `TL`. |
| **USDT** | Tether stablecoin. Stored as `currency='USDT'` since migration 140 (was `'USD'` historically — see [§13](#13-migrations-timeline) and [memory note](../../../.claude/projects/c--Users-ACER-Desktop-PipLineProV2/memory/project_usdt_currency_alignment_2026_04_24.md)). |
| **Blocked** | A transfer type where funds are flagged as stalled. Excluded from every aggregate. |
| **Payment-type / Ödeme** | A transfer type for internal-movement records. Segregated in reports so they don't pollute "client deposits" KPIs. |
| **Exchange rate** (`exchange_rate`) | USD-to-base rate snapshot at transfer time. Used to compute `amount_try` and `amount_usd`. Stored per row. |
| **Amount / amount_try / amount_usd** | `amount` is signed in the transfer's native currency. `amount_try` and `amount_usd` are always TL and USD equivalents at the snapshotted rate. See §5. |
| **IB partner** | Introducing Broker who brought the client. Optional attribution field. |
| **Employee** | HR employee (Marketing / Retention / etc.) credited for the transfer. Drives auto-bonus calculations. |

---

## 3. Data model

### 3.1 `transfers` table

Defined in [supabase/migrations/008_transfers_and_operations.sql:353–386](../../supabase/migrations/008_transfers_and_operations.sql#L353-L386), amended by migrations 080, 110, 118, 124, 140.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `organization_id` | UUID (FK org) | RLS boundary |
| `full_name` | TEXT | Customer name as displayed |
| `transfer_date` | TIMESTAMPTZ | Grouped by local day (Europe/Istanbul) in UI |
| `amount` | NUMERIC(15,2) | **Signed in native currency**: positive for deposit, negative for withdrawal |
| `commission` | NUMERIC(15,2) | Always **≥ 0 and only set for deposits** (see §4.1) |
| `net` | NUMERIC(15,2) | Pre-computed. `amount - commission` for deposit, `amount` for withdrawal |
| `currency` | TEXT | `'TL' \| 'USD' \| 'USDT'` (CHECK widened over time — migration 080, 121, 140) |
| `category_id` | TEXT FK → `transfer_categories.id` | `'deposit' \| 'withdrawal'` |
| `payment_method_id` | TEXT FK → `payment_methods.id` | `'bank' \| 'tether' \| 'credit-card' \| …org-custom` |
| `type_id` | TEXT FK → `transfer_types.id` | `'client' \| 'blocked' \| 'payment' \| …org-custom` |
| `psp_id` | UUID FK → `psps.id`, `ON DELETE SET NULL` | Nullable when PSP was deleted |
| `crm_id` | TEXT | External CRM reference |
| `meta_id` | TEXT | External metadata reference |
| `exchange_rate` | NUMERIC(10,4) | USD→base snapshot at write |
| `amount_try` | NUMERIC(15,2) | Precomputed TRY equivalent |
| `amount_usd` | NUMERIC(15,2) | Precomputed USD equivalent |
| `commission_rate_snapshot` | NUMERIC(5,4) | PSP's rate at write time — source of truth for historical commission recomputation |
| `employee_id` | UUID FK → `hr_employees.id` | Optional, drives HR bonuses |
| `ib_partner_id` | UUID FK → `ib_partners.id`, `ON DELETE SET NULL` (migration 135) | Optional attribution |
| `is_first_deposit` | BOOLEAN | Marketing flag |
| `notes` | TEXT | Free-form notes |
| `created_by` / `updated_by` | UUID FK → `auth.users` | Audit |
| `created_at` / `updated_at` | TIMESTAMPTZ | Audit |
| `deleted_at` / `deleted_by` | TIMESTAMPTZ / UUID | **Soft-delete** — all queries filter `deleted_at IS NULL` |

**Indexes** ([008:389–398](../../supabase/migrations/008_transfers_and_operations.sql#L389-L398)): `(organization_id)`, `(transfer_date DESC)`, `(organization_id, transfer_date DESC)`, per-FK indexes, partial indexes on `crm_id` and `meta_id`.

### 3.2 Lookup tables

| Table | Rows are | Scope | Notes |
|---|---|---|---|
| `transfer_categories` | `deposit`, `withdrawal` | **Global only** — never org-custom | Drives `is_deposit` |
| `payment_methods` | Global defaults (`bank`, `tether`, `credit-card`) + org-custom | `organization_id IS NULL` = global; `organization_id = <uuid>` = org-specific | Migration 084 made custom |
| `transfer_types` | Global defaults (`client`, `blocked`, `payment`) + org-custom | Same dual-scope | `is_system=true` protects `blocked`; `exclude_from_net=true` on `payment` (migration 110) |
| `psps` | Per-org | All PSPs are org-scoped (or global unipayment since 067) | Has `commission_rate`, `is_active`, `is_internal`, `psp_scope`, `currency` |
| `psp_commission_rates` | Dated overrides per PSP | Per-org | Looked up via `effective_from <= transfer_date` |

**Alias matching:** lookup IDs are slug-like strings, but CSV imports tolerate aliases (`'USDT' → 'tether'`, `'BANKA' → 'bank'`, `'MUSTERI' → 'client'`). See [src/lib/transferLookups.ts](../../src/lib/transferLookups.ts).

### 3.3 `transfer_audit_log`

Added by migration 008 and extended by migration 118. Every INSERT/UPDATE/DELETE writes a row with the changed JSONB diff. Not user-visible except via `TransferAuditDialog.tsx`.

### 3.4 `exchange_rates`

Per-org, per-date, per-currency (practically always `currency='USD'`, storing USD→TRY). UNIQUE constraint on `(organization_id, currency, rate_date)`. Used to **suggest** a default `exchange_rate` when creating a transfer, but the snapshot on the transfer row is the source of truth at read time.

---

## 4. Business rules

### 4.1 Commission applies to deposits only

**Enforced by:**
- Frontend: [useTransfers.ts:131–134](../../src/hooks/useTransfers.ts#L131-L134) — `commission = amount × effectiveRate` but `net` adds it only when `is_deposit`.
- RPC: [112_bugfixes.sql:79–96](../../supabase/migrations/112_bugfixes.sql#L79-L96) — `CASE WHEN is_deposit THEN commission`.
- Migration 111 (`withdrawal_zero_commission`) also hardens this rule server-side.

**UI:** Withdrawal rows render `—` in the Commission column with a tooltip, not `0.00` ([TransferRowItem.tsx:95–109](../../src/pages/transfers/TransferRowItem.tsx#L95-L109)).

**Why:** PSP fees are charged on deposits. Withdrawals are outbound — the PSP doesn't take a cut again.

### 4.2 Blocked transfers are excluded from totals

**Detection:** `type.name` contains `'bloke'` or `'blocked'` (case-insensitive) — see `isBlockedType` in [transfersTableUtils.ts:42–45](../../src/pages/transfers/transfersTableUtils.ts#L42-L45).

**Effects:**
- `commission_rate_snapshot = 0` on create/update ([useTransfersQuery.ts:85–86, 189–190](../../src/hooks/queries/useTransfersQuery.ts#L85-L86)).
- `computeDaySummary` filters blocked out **before any math** ([transfersTableUtils.ts:125–128](../../src/pages/transfers/transfersTableUtils.ts#L125-L128)).
- `get_monthly_summary` filters `NOT tt.is_excluded` via `transfer_types.is_excluded` flag (migration 084+110).
- `TransferRowItem` renders the row at `opacity-60` with a `BLOCKED` tag ([TransferRowItem.tsx:51](../../src/pages/transfers/TransferRowItem.tsx#L51)).

**Rule:** any new aggregate you add **must** filter blocked out. If you're writing `SUM(amount)` anywhere, prefix with `WHERE NOT tt.is_excluded` or the client-side equivalent.

### 4.3 Payment-type transfers are split into a separate section

**Detection:** `type.name` contains `'payment'`, `'ödeme'`, or `'odeme'` — see `isPaymentType` in [transfersTableUtils.ts:47–50](../../src/pages/transfers/transfersTableUtils.ts#L47-L50).

**Effects:**
- Daily Summary has a dedicated "Payment Transfers" section showing `pmtDeposits`, `pmtWithdrawals`, and `pmtTotalTry` separately from client transfers ([transfersTableUtils.ts:195–206](../../src/pages/transfers/transfersTableUtils.ts#L195-L206), UI at [DailySummaryDialog.tsx:310–357](../../src/pages/transfers/DailySummaryDialog.tsx#L310-L357)).
- Migration 110 added `transfer_types.exclude_from_net`; `get_monthly_summary` respects it (`WHERE NOT exclude_from_net`) when computing net cash.
- Row shows a blue `PAYMENT` tag ([TransferRowItem.tsx:157–161](../../src/pages/transfers/TransferRowItem.tsx#L157-L161)).

**Why:** payments are internal money movements (e.g. paying a partner). They aren't customer revenue; including them in "net deposits" would inflate KPIs.

### 4.4 Currency semantics: TL vs USDT

**After migration 140 (2026-04-24):**

| `currency` value | Meaning | `amount` is in |
|---|---|---|
| `'TL'` | Turkish Lira (default, legacy-compatible) | TRY |
| `'USDT'` | Tether stablecoin | USD |
| `'USD'` | **Not used anywhere** | — |

**Rule:** any code reading `transfers.currency` must treat `'USDT'` (not `'USD'`) as the USDT bucket. The KPI RPC (`get_monthly_summary`) was updated in migration 140 to match. If you ever see `currency='USD'` in the DB, it's a data bug — `UPDATE` it to `'USDT'`.

**Rate snapshot semantics** (driving `amount_try` / `amount_usd` in [useTransfers.ts:111–129](../../src/hooks/useTransfers.ts#L111-L129)):

- `currency = base` (TRY): `amount_try = amount`; `amount_usd = amount / exchange_rate`.
- `currency ∈ {'USD', 'USDT'}`: `amount_usd = amount`; `amount_try = amount × exchange_rate`.
- `currency = custom` (e.g. EUR): `amount_try = amount × exchange_rate`; `amount_usd = amount_try / usd_to_base_rate` (falls back to raw `amount` if not provided).

### 4.5 Exchange rate is snapshotted

Every row stores `exchange_rate` at write time. **Never recompute `amount_try` or `amount_usd` retroactively** from today's rate — the stored snapshot is intentional. The Daily Summary dialog allows overriding the *display* rate for a given date (stored in `customRates` state, not persisted to the DB) via the PIN-gated rate editor ([DailySummaryDialog.tsx:81–89](../../src/pages/transfers/DailySummaryDialog.tsx#L81-L89)).

### 4.6 Soft delete everywhere

Every read adds `.is('deleted_at', null)`. Bulk-delete writes `deleted_at = now(), deleted_by = user.id` in batches of 50 ([useTransfersQuery.ts:316–346](../../src/hooks/queries/useTransfersQuery.ts#L316-L346)). The Trash tab is the only place that queries `WHERE deleted_at IS NOT NULL`.

---

## 5. Computed amounts (`computeTransfer`)

Source: [src/hooks/useTransfers.ts:99–137](../../src/hooks/useTransfers.ts#L99-L137).

### Signature

```ts
computeTransfer(
  rawAmount:       number,                // absolute value from form input
  category:        { id, is_deposit },
  exchangeRate:    number,                // USD→base
  currency:        Currency | string,
  commissionRate:  number = 0,            // from PSP
  typeId?:         string,                // to check for 'blocked'
  baseCurrency:    string = 'TRY',
  usdToBaseRate?:  number                 // only for custom currencies
) → { amount, amountTry, amountUsd, commission, net }
```

### Algorithm

1. **Sign `amount` from category:** `amount = is_deposit ? rawAmount : -rawAmount`.
2. **Convert to TRY and USD** based on `currency` relative to `baseCurrency` (see §4.4).
3. **Effective commission rate:** `typeId === 'blocked' ? 0 : commissionRate` (belt-and-suspenders — the PSP's rate is zeroed for blocked even if the row was never touched by migration 111).
4. **Commission:** `round(|amount| × effectiveRate × 100) / 100` — always non-negative, in the transfer's native currency unit.
5. **Net:** `amount − (is_deposit ? commission : -commission)`. For a deposit of 100 with 5 commission: `net = 95`. For a withdrawal of 100 (stored as -100) with commission 0: `net = -100`.

### Invariants

- `commission ≥ 0` always.
- `net ≤ amount` for deposits.
- `net == amount` for withdrawals (commission is zero).
- `amount_try` and `amount_usd` are never NULL — default 0 if the rate is 0.

---

## 6. Daily summary formulas (`computeDaySummary`)

Source: [src/pages/transfers/transfersTableUtils.ts:123–233](../../src/pages/transfers/transfersTableUtils.ts#L123-L233). Drives the Daily Summary dialog.

### Pipeline

```
transfers[] → exclude blocked → split into clientTransfers / paymentTransfers
                                        ↓                         ↓
                                DaySummary root              DaySummary.payment
```

### Client-transfer outputs (the main KPIs)

| Field | Formula |
|---|---|
| `deposits` | `Σ |amount_try| for is_deposit` |
| `withdrawals` | `Σ |amount_try| for NOT is_deposit` |
| `net` | `deposits − withdrawals` |
| `commission` | `Σ commission × exchange_rate for is_deposit` (normalize USDT commissions back to TRY) |
| `commissionUsd` | `Σ commission / exchange_rate for is_deposit` (normalize TRY commissions to USD) |
| `depositCount` / `withdrawalCount` | `count(is_deposit)` / `count(NOT is_deposit)` |
| `totalBank` | `Σ amount_try where payment_method.name matches 'bank'`; signed by deposit/withdrawal |
| `totalCreditCard` | `Σ amount_try where payment_method.name matches 'credit'`; signed |
| `totalUsd` | `Σ |amount| where currency = 'USDT'`; signed by deposit/withdrawal |
| `netWithoutCommUsd` | `Σ amount_usd` across all client transfers |
| `netWithCommUsd` | `netWithoutCommUsd − commissionUsd` |
| `dayRate` | Average of non-TL `exchange_rate` values that day (0 if no non-TL transfers) |

### Payment-transfer outputs (segregated section)

`payment.count`, `payment.totalTry`, `payment.depositCount`, `payment.withdrawalCount`, `payment.totalDeposits`, `payment.totalWithdrawals`, `payment.net = totalDeposits − totalWithdrawals`. All in TRY.

### UI-level adjusted values (not in DaySummary; computed in the dialog)

[DailySummaryDialog.tsx:82–89](../../src/pages/transfers/DailySummaryDialog.tsx#L82-L89):

```
effectiveRate         = customRate ?? s.dayRate    // PIN-gated override
adjNetWithoutCommUsd  = s.net / effectiveRate      // TRY net → USD
adjNetWithCommUsd     = (s.net − s.commission) / effectiveRate
```

These are the "Net Cash (USDT)" and "Gross Cash (USDT)" cards at the bottom of the summary.

**Rule:** when adding a new KPI derived from `computeDaySummary`, add it to the return shape in `DaySummary` *and* the dialog — not to feature-specific ad-hoc code.

---

## 7. RPC contract: `get_monthly_summary`

Source (latest): [supabase/migrations/140_migrate_transfers_usd_to_usdt.sql:35–334](../../supabase/migrations/140_migrate_transfers_usd_to_usdt.sql#L35-L334). Called by the Monthly tab, the Dashboard, and the AI Assistant's `get_monthly_summary` tool.

### Signature

```sql
public.get_monthly_summary(_org_id uuid, _year int, _month int) RETURNS json
```

`SECURITY DEFINER`, `SET timezone = 'Europe/Istanbul'` (so local-day grouping matches the UI). Access guard: `private.is_god() OR _org_id IN private.get_user_org_ids()`.

### Output shape (top-level)

```json
{
  "kpis":                     { ... },         // current month
  "prev_kpis":                { ... } | null,  // previous month (null if empty)
  "insights":                 { peak_day, peak_day_volume, active_days, avg_daily_volume, avg_per_transfer },
  "daily_volume":             [{ day, deposits, withdrawals }],
  "daily_net":                [{ day, net }],
  "daily_detailed":           [{ day, bank_try, kk_try, commission_try, usdt_net, bank_usd, commission_usd, avg_rate, usd_cevirim, kom_son_usd, finans_pct }],
  "psp_breakdown":            [{ name, volume, count }],
  "payment_method_breakdown": [{ name, volume, count }],
  "category_breakdown":       [{ name, is_deposit, volume, count }],
  "currency_split":           [{ currency, volume_try, count }],
  "commission_by_psp":        [{ name, commission }],
  "top_customers":            [{ name, volume, count }],        // TOP 20
  "type_breakdown":           [{ name, volume, count }]
}
```

### KPI fields (`kpis`)

| Field | Meaning |
|---|---|
| `total_deposits_try` / `total_deposits_usd` | `Σ amount_try` / `Σ amount_usd` across deposits |
| `total_withdrawals_try` / `total_withdrawals_usd` | Same, for withdrawals |
| `total_bank_volume` / `total_credit_card_volume` | `Σ amount_try` by payment method |
| `total_usdt_volume` | `Σ |amount| WHERE currency='USDT'` |
| `total_commission_try` | Commission summed in TRY (USDT commissions multiplied by rate) |
| `transfer_count` / `deposit_count` / `withdrawal_count` | Row counts |
| `usdt_deposits_usd` / `usdt_withdrawals_usd` / `usdt_net` | USDT bucket directional |
| `bank_cc_deposits_usd` / `bank_cc_withdrawals_usd` | Non-USDT directional (USD-equivalent) |
| `commission_usd` | Commission normalized to USD |
| `bank_usd_gross` | `Σ amount_usd WHERE currency != 'USDT'` |
| `usd_cevirim` | `bank_usd_gross + usdt_net` — "USD çevirim" (total USD turnover) |
| `kom_son_usd` | `usd_cevirim − commission_usd` — post-commission USD |
| `finans_pct` | `commission_usd / usd_cevirim × 100` — effective commission % |

### Exclusions

The RPC filters all of:
- `t.deleted_at IS NULL`
- `NOT tt.is_excluded` (blocked types)
- `NOT exclude_from_net` for the KPI aggregates (payment types) — but `currency_split`, `psp_breakdown`, etc. include them

**Rule:** if you add a new field to this RPC, update this spec table in the same PR.

---

## 8. UI architecture

### 8.1 Page route and scaffold

- Route: `/transfers` → [src/pages/transfers/index.tsx](../../src/pages/transfers/index.tsx)
- Top-level layout: `<PageHeader>` with Export / Import / Add buttons, then a `<Tabs>` with 4 tabs: **List**, **Monthly**, **Trash**, **Settings**.
- Mobile: actions wrap below title per `PageHeader` responsive default.

### 8.2 List tab

The main surface. Composition:

1. **Filter bar** (search + DatePicker + Filters button + Clear).
2. **Bulk toolbar** (appears when any row is selected): Export CSV, Bulk Edit (PSP + Type), Clear selection.
3. **Grouped table:** transfers grouped by local date; each group has a header (`DD MMM YYYY`, transfer count, running daily net as a compact chip) + a Daily Summary trigger button.
4. **Pagination footer:** page size selector (25 / 50 / 100), prev/next, and a Load-More toggle.

Key files:
- [TransfersTable.tsx](../../src/pages/transfers/TransfersTable.tsx) — orchestrates filter drawer, bulk ops, grouping, pagination.
- [TransferRowItem.tsx](../../src/pages/transfers/TransferRowItem.tsx) — a single row; 10 columns (Checkbox, Full name, Payment method, Category, Amount, Commission, Net, Net USD, Currency, PSP, Type, Actions).
- [transfersTableUtils.ts](../../src/pages/transfers/transfersTableUtils.ts) — `isBlockedType`, `isPaymentType`, `groupByDate`, `computeDaySummary`, formatters.

### 8.3 Filter drawer (Sheet)

Opened via the Filters button. Eight filter fields (the URL-serialized `TransferFilters` type from [useTransfersQuery.ts:366–379](../../src/hooks/queries/useTransfersQuery.ts#L366-L379)):

| Field | Key | Type |
|---|---|---|
| Transaction Type | `categoryType` | `'deposit' \| 'withdrawal'` |
| Currency | `currency` | `'TL' \| 'USDT'` |
| Payment Method | `paymentMethodId` | lookup id |
| Type | `typeId` | lookup id |
| PSP | `pspId` | UUID |
| Employee | `employeeId` | UUID |
| IB Partner | `ibPartnerId` | UUID (since migration 124) |
| Min / Max Amount | `amountMin`, `amountMax` | numeric string |
| Date range | `dateFrom`, `dateTo` | YYYY-MM-DD |

**State rules:**
- Filters sync to URL search params (replace, not push) so the back button isn't flooded.
- Changing an org resets `EMPTY_FILTERS` + `setPage(1)` ([useTransfersQuery.ts:462–468](../../src/hooks/queries/useTransfersQuery.ts#L462-L468)).
- Changing a filter resets `setPage(1)` and clears `accumulated[]` (Load More mode).
- `dateFrom` / `dateTo` queries use `localDayStart` / `localDayEnd` to respect Europe/Istanbul timezone.

### 8.4 Bulk operations

Selection is row-level checkboxes + a group-level "select all" in the date header. Bulk toolbar exposes:

- **Export CSV** — client-side export of selected rows.
- **Bulk Edit** — opens a dialog that updates **PSP and Type only** (the two fields most frequently wrong after a CSV import).
- **Clear selection**.

Bulk delete is in `BulkDeleteConfirmDialog.tsx`, batched 50 at a time ([useTransfersQuery.ts:333–340](../../src/hooks/queries/useTransfersQuery.ts#L333-L340)).

### 8.5 Pagination vs Load More

Two modes coexist:

- **Paginate (default):** `page / pageSize` controls; `displayTransfers = currentPage`.
- **Load More:** toggled in the footer; accumulates pages in `accumulated[]`; `displayTransfers = accumulated`. First click seeds the array from the current page data and advances; subsequent clicks just advance.

Page-size options: **25 (default), 50, 100**.

### 8.6 Daily Summary dialog

Trigger: per-date-group button in the table group header. Fetches *all* transfers for that date (via `fetchTransfersByDate` — not capped to the page window) then passes them to `computeDaySummary`.

Sections (in render order):

1. **Hero** — date label + transfer/deposit/withdrawal count + **Net** value (big, colored green/red).
2. **Deposits / Withdrawals / Commission cards** — TRY totals with counts. Commission card also shows USD equivalent and % of deposits.
3. **Proportion bar** — horizontal green/red bar showing deposits vs withdrawals ratio.
4. **Breakdown** — 3-column grid: Total Bank (TRY), Total Credit Card (TRY), Total USDT (**USD**). Colored by sign.
5. **Payment Transfers section** — shown only when `payment.count > 0`. 3-column grid: deposits, withdrawals, net in TRY.
6. **USD Conversion section:**
   - **Day rate** — editable via pencil icon (PIN-gated, see §10). Persists to `customRates` client state (not DB). A reset × appears when an override is active.
   - **Net Cash (USDT)** — `(net − commission) / effectiveRate`, labeled "After commission".
   - **Gross Cash (USDT)** — `net / effectiveRate`, labeled "Before commission".

Dialog size: `2xl`, custom `md:max-w-[720px]` and `max-h-[85vh]`.

### 8.7 Trash tab

Queries `deleted_at IS NOT NULL`. Shows a read-only list with Restore (set `deleted_at = null`) and Permanent Delete. Migration 117 hardened permissions (admins only).

### 8.8 Settings tab

Manages org-custom transfer types and payment methods (migration 084). Visible to everyone, but CRUD is locked behind the PIN dialog for non-admins (operations role gets a warm "read-only" message). Uses `useLookupMutations` hooks and `AliasTagInput` for multi-alias entry.

---

## 9. Auto-bonus integration (HR)

When a transfer is created or updated with `employee_id` set, the mutation may also insert/update a row in `hr_bonus_payments`. Two roles get auto-bonus:

| Employee role | Condition | Amount |
|---|---|---|
| `Marketing` | Deposit only | Tier-based lookup from `hr_mt_config.deposit_tiers` against `|amount_usd|` |
| `Retention` | Deposit **and** withdrawal | `|amount_usd| × 0.0575`, **sign flipped** for withdrawal (retention claws back on withdrawal) |

Implementation: `calcAutoBonus` in [useTransfersQuery.ts:32–46](../../src/hooks/queries/useTransfersQuery.ts#L32-L46). On update, the existing auto-row is deleted before a recompute ([useTransfersQuery.ts:231–237](../../src/hooks/queries/useTransfersQuery.ts#L231-L237)).

**Rule:** when you change `transfers.amount_usd` semantics (e.g. another migration-140-shaped currency rename), you **must** also check that auto-bonus calculation still uses the right input.

---

## 10. PIN gate

Writes that affect business-critical settings are PIN-gated:

- **Settings tab CRUD** (for non-admins).
- **Daily Summary day-rate override** — opens PIN before enabling the rate editor.

Implementation: [PinDialog.tsx](../../src/pages/transfers/PinDialog.tsx) + `useVerifyOrgPin` hook calling the `verify_org_pin` RPC. Server-side rate limiting via `should_rate_limit_device` (5 failed attempts / 15 min, migration 112 BUG-13). After 5 failures the hook throws `RATE_LIMITED`; UI renders a warm "wait a few minutes" message.

**Rule:** any new gated action uses **the same dialog**. Don't invent a second PIN UX.

---

## 11. Import pipeline

### 11.1 Manual CSV (in-app)

`CsvImportDialog.tsx` → 3-step wizard: **Upload → Preview → Import → Results**. Parses with `papaparse`, normalizes headers, maps aliases via [src/lib/transferLookups.ts](../../src/lib/transferLookups.ts) (`findPaymentMethodByAlias`, `findTypeByAlias`, `findCategoryByAlias`). Runs client-side inserts through the same mutation hooks as manual entry.

### 11.2 Bulk script (one-off yearly re-imports)

[scripts/import-transfers-2026.mjs](../../scripts/import-transfers-2026.mjs) — builds a SQL migration file (e.g. `136_transfers_2026_data_import.sql`) from KASA CSV files. Flow:

1. Parse 4 CSV files (OCAK / ŞUBAT / MART / NİSAN) with TR decimal handling.
2. Resolve PSP names, dedupe.
3. Build a daily `exchange_rates` set from CSV.
4. Derive `amount_try` / `amount_usd` using JS math that mirrors `computeTransfer`.
5. Emit a `BEGIN; DELETE (backup first); INSERT; COMMIT;` transaction.

**Conventions:**
- Currency normalization (line 119): `USD / $ / USDT → 'USDT'` (post-migration 140).
- `amount_usd` branch (lines 474, 618): `t.currency === "USDT" ? amt : amt / rate`.
- Re-runnable: backs up existing rows to `transfers_backup_YYYY_import` before deleting.
- Audit triggers are disabled during bulk insert (`ALTER TABLE ... DISABLE TRIGGER`) and re-enabled at the end.

**Rule:** when writing a new yearly import (e.g. 2027), copy this script and **update the currency normalization to match current migration state**. The 2026 USD→USDT drift came from this exact oversight.

### 11.3 Excel export

[ExcelExportDialog.tsx](../../src/pages/transfers/ExcelExportDialog.tsx) — client-side export of the currently filtered list. Ctrl+E keyboard shortcut wired in `index.tsx`.

---

## 12. RLS & permissions

### 12.1 Who can do what

| Operation | God | Org Admin | Manager | Operation |
|---|---|---|---|---|
| SELECT transfers in own org | ✓ | ✓ | ✓ | ✓ |
| INSERT transfer | ✓ | ✓ | ✓ | ✓ |
| UPDATE transfer | ✓ | ✓ | ✓ | ✓ |
| DELETE transfer (soft) | ✓ | ✓ | ✗ | ✗ |
| Restore from Trash | ✓ | ✓ | ✗ | ✗ |
| Lookup CRUD (custom types/methods) | ✓ | ✓ | ✗ | ✗ |
| Override day rate (Daily Summary) | ✓ (via PIN) | ✓ (via PIN) | ✓ (via PIN) | ✓ (via PIN) — PIN-holder test is org-wide |
| See Trash tab | ✓ | ✓ | ✗ | ✗ (hidden) |

### 12.2 RLS policies

[008_transfers_and_operations.sql:406–442](../../supabase/migrations/008_transfers_and_operations.sql#L406-L442):

```sql
SELECT: is_god() OR organization_id IN get_user_org_ids()
INSERT: is_god() OR organization_id IN get_user_org_ids()
UPDATE: is_god() OR organization_id IN get_user_org_ids()
DELETE: is_god() OR is_org_admin(organization_id)   -- only god/admin
```

Operations and managers **can't DELETE** (hard) at the RLS level. The soft-delete pattern writes an UPDATE to `deleted_at`, so the allowed UPDATE policy governs it — which means the *feature code* must gate the trash button for non-admins. Migration 117 (`117_transfer_fix_trash_permissions.sql`) adjusts this.

### 12.3 Realtime subscription

[index.tsx:27](../../src/pages/transfers/index.tsx#L27) subscribes to the `transfers` table and invalidates `queryKeys.transfers.all` + `['dashboard']` on any change. New transfers from another session appear without refresh.

---

## 13. Migrations timeline

Chronological list of every migration that touches Transfers behavior. When a new migration lands, add it here.

| # | File | Effect |
|---|---|---|
| 008 | `008_transfers_and_operations.sql` | Base schema: transfers, lookups, exchange_rates, audit log, `get_monthly_summary` v1 |
| 045 / 045b | `045_*` | Monthly-exchange-rate helper |
| 056 | `056_enhance_monthly_kpis_usd_breakdown.sql` | Added USD breakdown fields to KPI RPC |
| 057 | `057_add_daily_breakdown_and_usd_kpis.sql` | Added `daily_detailed` block to RPC |
| 060 | `060_fix_commission_deposit_only.sql` | Server-side: commission only on deposits in RPC aggregates |
| 061 | `061_security_and_schema_fixes.sql` | Re-issued RPCs with stricter RLS |
| 065 | `065_fix_timezone_daily_grouping.sql` | Added `SET timezone = 'Europe/Istanbul'` to RPC |
| 067 | `067_psp_global_unipayment.sql` | PSPs can be global (null org) |
| 080 | `080_migrate_tether_to_usdt.sql` | `currency` check widened to include `'USDT'`; Tether-PSP transfers updated to `currency='USDT'` |
| 084 | `084_org_configurable_lookups.sql` | Payment methods & transfer types made org-configurable; `is_system`, `exclude_from_net` flags |
| 110 | `110_payment_exclude_from_net.sql` | `exclude_from_net` honored by `get_monthly_summary` |
| 111 | `111_withdrawal_zero_commission.sql` | Server-side invariant: withdrawal commission is 0 |
| 112 | `112_bugfixes.sql` | Timezone re-set; RPC bugs fixed; PIN rate limiting |
| 113 | `113_ozet_summary.sql` | New `get_ozet_summary` RPC (sibling) |
| 117 | `117_transfer_fix_trash_permissions.sql` | Trash tab perms |
| 118 | `118_extend_audit_logging.sql` | More audit fields |
| 121 | `121_seed_net_kasa_data.sql` | `currency` check widened to include `'TRY'` |
| 124 | `124_add_ib_partner_to_transfers.sql` | `ib_partner_id` column + filter |
| 135 | `135_ib_partner_cascade_set_null.sql` | `ib_partner_id` nulled on partner delete |
| 136 | `136_transfers_2026_data_import.sql` | Bulk re-import of 2026 Jan–Apr transfers from CSVs |
| 140 | `140_migrate_transfers_usd_to_usdt.sql` | **`currency='USD' → 'USDT'` for all rows; `get_monthly_summary` rewritten to match** (2026-04-24) |

---

## 14. Known gaps / open questions

Tracked so nobody thinks they're intentional.

- **`transfers.currency` is TEXT** with a CHECK constraint that's been widened repeatedly (migrations 080, 121). It's effectively an enum. Consider promoting to a Postgres `ENUM` type the next time we touch schema — but migrations become harder, so not a priority.
- **No PSP **in** the bulk-edit dialog.** Only PSP and Type are editable in bulk. If you need to bulk-fix currency (as we did 2026-04-24), you write SQL. Consider adding if it happens a third time.
- **No export-all-filtered-rows server-side.** Excel / CSV exports are client-side and only export what's currently loaded. For big exports, Load More first or ship a server-side export RPC.
- **`custom day rate` is client state.** Overriding a day's rate in the Daily Summary does **not** persist to the DB — reload the page and it's gone. If we want persistent overrides, we need a new `daily_rate_overrides` table.
- **`get_monthly_summary` does not surface IB partner breakdown.** IB partner attribution exists on the row since 124 but the KPI RPC has no `ib_partner_breakdown`. Add if IB reporting becomes a primary use case.
- **Alias matching is case-insensitive** for payment-method / type / category in CSV import, but **currency alias matching is hardcoded** in the import script — `'usdt' | 'tether' | 'usd' | '$' → 'USDT'`. If a currency grows more aliases, centralize into `transferLookups.ts` like the other three.
- **Audit log size.** `transfer_audit_log` has no retention policy. On a 500k-row org this will bloat. Consider a partitioning or retention strategy before shipping to another large org.
- **Post-migration 140 stranded USD rows.** If any workflow outside the Transfers page was writing `currency='USD'` historically (accounting entries? wallet snapshots?), migration 140 didn't touch them. Audit separately if accounting analysis shows drift.
