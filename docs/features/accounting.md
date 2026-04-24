# Accounting

**Status:** Living spec · reflects codebase as of `main` on 2026-04-24
**Owner (feature):** Brokztech team
**Related:** [features/transfers.md](./transfers.md), [data-model/README.md](../data-model/README.md), [api/README.md](../api/README.md)

> Accounting is the **money-in / money-out ledger** that reconciles every cash/crypto register the org runs. Transfers, PSP settlements, HR salaries, and IB commissions all write into the same ledger through different paths. Drift here means the portfolio number at the top of the dashboard is a lie.

---

## Table of contents

1. [Scope](#1-scope)
2. [Domain vocabulary](#2-domain-vocabulary)
3. [Data model](#3-data-model)
4. [Registers](#4-registers)
5. [Categories](#5-categories)
6. [Business rules](#6-business-rules)
7. [Opening balances & DEVİR](#7-opening-balances--devİr)
8. [Auto-entry integrations](#8-auto-entry-integrations)
9. [`get_accounting_summary` RPC contract](#9-get_accounting_summary-rpc-contract)
10. [`get_category_breakdown` RPC contract](#10-get_category_breakdown-rpc-contract)
11. [UI architecture](#11-ui-architecture)
12. [Wallets & snapshots](#12-wallets--snapshots)
13. [Reconciliation](#13-reconciliation)
14. [RLS & permissions](#14-rls--permissions)
15. [Migrations timeline](#15-migrations-timeline)
16. [Known gaps / open questions](#16-known-gaps--open-questions)

---

## 1. Scope

**In scope:**
- The `accounting_entries` ledger (every in/out money movement).
- Register system (`accounting_registers` + `seed_default_registers`).
- Category system (`accounting_categories` — global + org-custom).
- Opening balances (`register_opening_balances` — migration 123).
- Daily snapshots (`accounting_register_snapshots`).
- The Overview / Ledger / Reconciliation / Settings tabs on `/accounting`.
- Auto-entry triggers from IB payments and PSP settlements.
- Wallet tracking (`wallets`, `wallet_snapshots`) and the `daily-wallet-snapshot` Edge Function.
- `get_accounting_summary` and `get_category_breakdown` RPCs.

**Out of scope:**
- HR salary payments (referenced here as a write-source via `hr_salary_payments.register` — full spec in `docs/features/hr.md`, TBD).
- Transfers themselves (documented in [transfers.md](./transfers.md) — accounting's "ledger" tab surfaces them but doesn't own them).
- Reconciliation UI logic details beyond the data flow (covered in [§13](#13-reconciliation)).

---

## 2. Domain vocabulary

| Term | Definition |
|---|---|
| **Entry** | One row in `accounting_entries`. A single money movement in or out of a register. |
| **Direction** | `'in'` (money received) or `'out'` (money paid). Not signed — `amount ≥ 0`; the sign comes from `direction`. |
| **Register (Kasa)** | A cash/crypto pool the org tracks balances for: `USDT`, `NAKIT_TL`, `NAKIT_USD`, `TL_BANKA`, `TRX`. Every entry writes to exactly one register. |
| **Category** | What kind of expense/income this is: `salary`, `ib_payment`, `bonus`, `office`, `conversion`, `psp_transfer`, `legal`, `hardware`, `marketing`, `other` — plus org-custom. |
| **Entry type** | `'ODEME'` (one-sided payment) or `'TRANSFER'` (internal — two linked entries, one OUT from source register and one IN to destination). |
| **Cost period** (`cost_period`) | `'YYYY-MM'` — when this entry belongs for KPIs (the month it *costs* for). |
| **Payment period** (`payment_period`) | `'YYYY-MM'` — when the cash actually moved (the month of `entry_date`). Often equal to `cost_period` but not always (e.g. December salary paid in January). |
| **Opening balance (DEVİR)** | Per-register carry-over into a month. Can be set manually in `register_opening_balances` **or** derived from the previous month's closing via snapshots. |
| **Closing balance** | `opening + (incoming − outgoing)` for the period. |
| **Portfolio** | Sum of closing balances across all active registers (plus wallet balances). The "total org value" number. |
| **Conversion** | A TRANSFER entry type that moves money between registers (e.g. USDT → NAKIT_TL after selling on exchange). Creates two linked entries with `linked_entry_id`. |
| **Linked entry** | For TRANSFER/conversion: the counterpart entry in the *other* register. `linked_entry_id` points at it. |
| **Source type / source ID** | When an entry is auto-created by a trigger (from IB payment or PSP settlement), `source_type` and `source_id` mark the source. |
| **Snapshot** | A frozen daily closing balance per register. Drives "opening" for later periods. |
| **Wallet** | A crypto wallet address (on-chain). Balances are polled daily via Tatum and snapshot into `wallet_snapshots`. |

---

## 3. Data model

### 3.1 `accounting_entries` (ledger)

Base table: [008:563–580](../../supabase/migrations/008_transfers_and_operations.sql#L563-L580). Extended by [120:199–216](../../supabase/migrations/120_accounting_overhaul.sql#L199-L216).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `organization_id` | UUID FK | |
| `description` | TEXT | Free-form label (e.g. "January salary - Ahmet") |
| `entry_type` | TEXT CHECK IN (`'ODEME'`, `'TRANSFER'`) | ODEME = payment, TRANSFER = internal |
| `direction` | TEXT CHECK IN (`'in'`, `'out'`) | Money flow |
| `amount` | NUMERIC(15,2) CHECK ≥ 0 | Unsigned — sign comes from `direction` |
| `currency` | TEXT CHECK IN (`'TL'`, `'USD'`, `'USDT'`) | Unlike transfers, accounting keeps all three |
| `entry_date` | DATE DEFAULT CURRENT_DATE | When the money actually moved |
| `cost_period` / `payment_period` | TEXT (`'YYYY-MM'`) | Accounting periods |
| `register` | TEXT CHECK IN (`'USDT'`, `'NAKIT_TL'`, `'NAKIT_USD'`, `'TRX'`) | **Legacy** string reference (kept for backwards compat) |
| `register_id` | UUID FK → `accounting_registers(id)` (migration 120) | **Current** FK — prefer this |
| `category_id` | UUID FK → `accounting_categories(id)` (migration 120) | Nullable (uncategorized) |
| `payee` | TEXT (migration 120) | Counterparty name |
| `exchange_rate_used` | NUMERIC (migration 120) | Rate snapshot if conversion was applied |
| `exchange_rate_override` | BOOLEAN DEFAULT false (migration 120) | True if user manually set rate |
| `linked_entry_id` | UUID self-FK ON DELETE SET NULL (migration 120) | For TRANSFER pairs |
| `source_type` / `source_id` | TEXT / UUID (migration 120) | Auto-entry provenance (`'ib_payment'`, `'psp_settlement'`, `'hr_salary_payment'`, `'hr_bulk_payment'`) |
| `hr_bulk_payment_id` | UUID (via HR migration 103) | Marker for bulk-payment membership |
| `created_by`, `created_at`, `updated_at` | | Standard audit |

**Indexes:** `(organization_id)`, `(entry_date DESC)`, `(register)`, plus migration 120 indexes on `category_id`, `register_id`, `linked_entry_id`, `source_type/source_id`, `(organization_id, payee)`, `(organization_id, cost_period)`.

**Soft delete:** *Not currently implemented on `accounting_entries`*. Deletes are hard. See [§16](#16-known-gaps--open-questions).

### 3.2 `accounting_registers`

[120:22–38](../../supabase/migrations/120_accounting_overhaul.sql#L22-L38).

| Column | Notes |
|---|---|
| `organization_id` | FK |
| `name` | TEXT — machine id (`'USDT'`, `'NAKIT_TL'`, …) |
| `label` | TEXT — display label (may differ per locale) |
| `currency` | TEXT DEFAULT `'TRY'` — denomination of this register |
| `is_system` | BOOLEAN — seeded by `seed_default_registers`, cannot be deleted |
| `is_active` | BOOLEAN — hide from UI without deleting |
| `sort_order` | INT — display order |
| `UNIQUE (organization_id, name)` | One row per register name per org |

### 3.3 `accounting_categories`

[120:84–102](../../supabase/migrations/120_accounting_overhaul.sql#L84-L102). Follows the dual-scope pattern (see [data-model/README.md §2.2](../data-model/README.md#22-multi-tenancy)):

- `organization_id IS NULL` → global default (seeded in migration 120).
- `organization_id = <uuid>` → org-custom.

| Column | Notes |
|---|---|
| `id` | UUID PK |
| `organization_id` | Nullable |
| `name` / `label` / `icon` | Identity + display |
| `is_system` | Global defaults set this to `true`; protected from edit/delete |
| `sort_order` | INT |

**Unique constraints** ([120:94–99](../../supabase/migrations/120_accounting_overhaul.sql#L94-L99)):
- `(organization_id, name) WHERE organization_id IS NOT NULL` — uniqueness within an org.
- `(name) WHERE organization_id IS NULL` — uniqueness across globals.

### 3.4 `accounting_register_snapshots`

[120:222–239](../../supabase/migrations/120_accounting_overhaul.sql#L222-L239). Daily closing balances per register.

| Column | Notes |
|---|---|
| `organization_id`, `register_id` | FKs |
| `snapshot_date` | DATE |
| `opening_balance` / `total_in` / `total_out` / `closing_balance` | NUMERIC |
| `usd_equivalent` | Optional USD conversion |
| `UNIQUE (organization_id, register_id, snapshot_date)` | One snapshot per register per day |

**Written by:** the Reconciliation UI on month close (and by admin actions). *Not* written automatically on every entry insert — the spec is "snapshots live at month-close, in-period totals are computed on the fly."

### 3.5 `register_opening_balances`

[123_register_opening_balances.sql:12](../../supabase/migrations/123_register_opening_balances.sql#L12). Per-register, per-period manual opening balance override.

| Column | Notes |
|---|---|
| `organization_id`, `register` | Composite identity (note: by `register` name, not `register_id`) |
| `period` | TEXT (`'YYYY-MM'`) |
| `opening_balance` | NUMERIC |

**Why two opening-balance sources?** Snapshots are time-series (auto-advance from last closing). `register_opening_balances` is a *manual override* for specific months (e.g. when we seed initial balances after migrating a new org). `get_accounting_summary` (post-123) uses opening_balances first, defaults to 0 if not set ([features/transfers.md §…](../data-model/README.md#23-timestamps) notwithstanding). See [§7](#7-opening-balances--devİr) for the full decision.

### 3.6 `accounting_monthly_config`

[008:734–750+](../../supabase/migrations/008_transfers_and_operations.sql#L734). Per-year-month config for an org (e.g. `devir_usdt`, closed/open flag).

Used by reconciliation tab. See [§13](#13-reconciliation).

### 3.7 `wallets` and `wallet_snapshots`

`wallets` base: [008:626–636](../../supabase/migrations/008_transfers_and_operations.sql#L626-L636). `wallet_snapshots` base: [008:682–691](../../supabase/migrations/008_transfers_and_operations.sql#L682-L691).

| Table | Purpose |
|---|---|
| `wallets` | One row per tracked address: `label`, `address`, `chain` (`'tron' \| 'ethereum' \| 'bsc' \| 'bitcoin' \| 'solana'`), `is_active`, `UNIQUE (organization_id, address, chain)` |
| `wallet_snapshots` | One row per `(wallet_id, snapshot_date)`: `balances` JSONB (per-asset), `total_usd` |

---

## 4. Registers

### 4.1 The five defaults

Seeded by [`seed_default_registers(p_org_id)`](../../supabase/migrations/120_accounting_overhaul.sql#L179-L193) — called once when the org first opens the Accounting page:

| Name | Label | Currency |
|---|---|---|
| `USDT` | USDT | `USD` |
| `NAKIT_TL` | Nakit TL | `TRY` |
| `NAKIT_USD` | Nakit USD | `USD` |
| `TL_BANKA` | Banka TL | `TRY` |
| `TRX` | TRX | `USD` |

All seeded with `is_system=true` → cannot be deleted, even by admin. Can be renamed / deactivated.

**Note:** the base `accounting_entries.register` CHECK constraint ([008:574](../../supabase/migrations/008_transfers_and_operations.sql#L574)) only lists `'USDT', 'NAKIT_TL', 'NAKIT_USD', 'TRX'` — it does **not** include `TL_BANKA`. Migration 120's `seed_default_registers` includes it, which means writing a `TL_BANKA` entry via the string-based `register` column fails the CHECK. The FK-based `register_id` path works. **Consequence:** new code should use `register_id`; the legacy `register` string should only be read, not written for non-CHECK-listed names.

### 4.2 Custom registers

Admins can add custom registers in **Settings → Registers**. Written to `accounting_registers` with `is_system=false`. Entries must be written via `register_id` (the name won't match the legacy CHECK).

---

## 5. Categories

### 5.1 The ten globals

Seeded in [120:161–173](../../supabase/migrations/120_accounting_overhaul.sql#L161-L173) with `organization_id IS NULL`, `is_system=true`:

| name | label | icon |
|---|---|---|
| `salary` | Salary | Money |
| `ib_payment` | IB Payment | Handshake |
| `bonus` | Bonus | Trophy |
| `office` | Office Expenses | Buildings |
| `conversion` | Conversion | ArrowsLeftRight |
| `psp_transfer` | PSP Transfer | ArrowSquareOut |
| `legal` | Legal | Scales |
| `hardware` | Hardware | Desktop |
| `marketing` | Marketing | Megaphone |
| `other` | Other | DotsThree |

Icons are Phosphor Icon names (see [design-system/patterns.md §9](../design-system/patterns.md#9-iconography)).

### 5.2 Custom categories

Admins add in **Settings → Categories**. Written with `organization_id = <org>`, `is_system=false`. Cannot edit/delete globals (RLS enforced at [120:126–155](../../supabase/migrations/120_accounting_overhaul.sql#L126-L155)).

---

## 6. Business rules

### 6.1 Sign via direction, not amount

`amount` is always `≥ 0` (CHECK constraint). The sign comes from `direction`:
- `'in'` → money came in → add to balance.
- `'out'` → money went out → subtract from balance.

**Rule:** never multiply by -1 to represent a "negative entry." Flip the direction instead.

### 6.2 Conversion = two linked entries

A conversion (e.g. "sold 1000 USDT, received 33,000 TL") creates **two entries**:
- OUT of `USDT` register: `amount=1000, currency=USDT, direction='out', entry_type='TRANSFER', category='conversion'`.
- IN to `NAKIT_TL` register: `amount=33000, currency=TL, direction='in', entry_type='TRANSFER', category='conversion', linked_entry_id=<first entry id>`.

The two entries share `entry_date`. `exchange_rate_used` is stored on the IN entry (or both). The [ConversionDialog](../../src/pages/accounting/ConversionDialog.tsx) is the only UI that creates conversion pairs — ad-hoc conversions via the generic Add Entry dialog are discouraged.

### 6.3 Cost period vs payment period

`cost_period` is the **business-month assignment**; `payment_period` is the **when-did-cash-move** month.

Example: December salary paid on January 5 →
- `entry_date = '2026-01-05'`
- `payment_period = '2026-01'`
- `cost_period = '2025-12'` (January expense, but reported against December)

`get_accounting_summary` groups by `cost_period`, so setting it correctly matters for monthly KPIs. If the app doesn't prompt for it, it defaults to `entry_date`'s month.

### 6.4 Auto-entries can't be edited out-of-source

An entry with `source_type IS NOT NULL` was written by a trigger. Editing it directly breaks the invariant with its source. The UI routes edits to the source:

- `source_type = 'ib_payment'` → edit the IB payment, not the entry.
- `source_type = 'psp_settlement'` → edit the PSP settlement.
- `source_type = 'hr_bulk_payment'` → bulk-payment detail page (`/accounting/bulk/<id>`) — see [index.tsx:74–79](../../src/pages/accounting/index.tsx#L74-L79).

See [§8](#8-auto-entry-integrations).

### 6.5 Currency inconsistency by register

Some registers hold one currency only (`NAKIT_TL` = TRY, `NAKIT_USD` = USD, `USDT` = USD, `TRX` = USD). But `accounting_entries.currency` is independently CHECKed — you *could* write a `TL` entry into the `USDT` register. **Don't.** UI should enforce the register's declared currency at write time.

**Rule:** new code adding entries must read `accounting_registers.currency` and match it on the entry.

---

## 7. Opening balances & DEVİR

Multiple paths exist. The current (post-123) logic:

### 7.1 Snapshot-based (base design)

[120:318–328](../../supabase/migrations/120_accounting_overhaul.sql#L318-L328) — `get_accounting_summary` originally looked up the latest `accounting_register_snapshots.closing_balance` before `p_period` and used that as opening.

### 7.2 Manual override (migration 123)

[123:112–119](../../supabase/migrations/123_register_opening_balances.sql#L112-L119) — the post-123 `get_accounting_summary` uses `register_opening_balances` if a row exists, defaults to 0 otherwise.

**Winner:** migration 123's CREATE OR REPLACE supersedes 120's. Current behavior: **manual `register_opening_balances` takes precedence; snapshots are not consulted by `get_accounting_summary` as of migration 123.**

> ⚠ **Subtle gap:** this means new orgs that never set `register_opening_balances` see opening = 0 every month, regardless of prior-month snapshots. To carry forward, either:
> (a) set `register_opening_balances` at month close, or
> (b) restore snapshot-based fallback in a future migration.
> Add to [§16](#16-known-gaps--open-questions).

### 7.3 UI flow

The Reconciliation tab lets admins set monthly opening balances per register. Values go into `register_opening_balances` on save.

---

## 8. Auto-entry integrations

Three features write into the ledger automatically via triggers / mutation hooks:

### 8.1 IB payments (migration 117 + 130)

**Trigger:** `create_ib_payment_accounting_entry()` on `INSERT` of `ib_payments`. Latest version at [130_accounting_ib_integration.sql:34](../../supabase/migrations/130_accounting_ib_integration.sql#L34).

Creates an entry in the target register with:
- `entry_type = 'ODEME'`
- `direction = 'out'`
- `category_id = <id of 'ib_payment' category>`
- `source_type = 'ib_payment'`, `source_id = <ib_payments.id>`
- `description` includes the partner's name
- `amount` / `currency` match the payment

**Deleting the IB payment** cascades to the entry (via `source_id` trigger cleanup — check current impl).

### 8.2 PSP settlements (migration 131)

**Trigger:** `create_psp_settlement_accounting_entry()` on `INSERT` of `psp_settlements`. [131_psp_settlement_accounting_integration.sql:41](../../supabase/migrations/131_psp_settlement_accounting_integration.sql#L41).

Creates an entry with:
- `entry_type = 'TRANSFER'`
- `direction = 'in'` (settlement is money coming in)
- `category_id = <id of 'psp_transfer' category>`
- `source_type = 'psp_settlement'`, `source_id = <psp_settlements.id>`
- Register: mapped from settlement currency (TL → `NAKIT_TL`, USD → `NAKIT_USD`)

**Inconsistency alert:** `psp_settlements.currency` CHECK is still `('TL', 'USD')` — see [features/transfers.md §13](./transfers.md#13-migrations-timeline). Settlements in USDT are *not yet supported*.

### 8.3 HR salary / bulk payments (migration 103)

Salary mutation hooks in [src/hooks/queries/useHrQuery.ts](../../src/hooks/queries/useHrQuery.ts) create accounting entries directly (no trigger — mutation-level). Bulk payments group multiple salary entries under one `hr_bulk_payments.id`, referenced via `accounting_entries.hr_bulk_payment_id`.

The UI routes edits of these entries to `/accounting/bulk/<id>` so the whole bulk run is edited together.

### 8.4 Invariant

Any auto-entry has `source_type` set. Manual (user-created) entries do not.

**Rule:** a PR adding a new auto-entry source *must* introduce a new `source_type` value, document it here, and update the `handleEditEntry` routing in [index.tsx](../../src/pages/accounting/index.tsx) so the user doesn't accidentally edit the derived entry directly.

---

## 9. `get_accounting_summary` RPC contract

Latest: [123_register_opening_balances.sql:69–](../../supabase/migrations/123_register_opening_balances.sql#L69). Also see [api/README.md §5.1](../api/README.md#51-get_accounting_summaryp_org_id-uuid-p_period-text--jsonb).

### 9.1 Signature

```sql
public.get_accounting_summary(p_org_id uuid, p_period text) RETURNS jsonb
```

`p_period` is `'YYYY-MM'`. `SECURITY DEFINER`, guards on `is_god() OR p_org_id IN get_user_org_ids()`.

### 9.2 Output shape

```json
{
  "registers": [
    {
      "id": "<uuid>",
      "name": "USDT",
      "label": "USDT",
      "currency": "USD",
      "opening":  0,
      "incoming": 0,
      "outgoing": 0,
      "net":      0,           // incoming - outgoing
      "closing":  0            // opening + net
    },
    ...
  ],
  "totals": {
    "portfolio_usd": 0,        // Σ (opening + net) across registers
    "net_pl":        0,        // Σ net across registers
    "pl_percent":    0         // (net_pl / (portfolio_usd - net_pl)) × 100
  }
}
```

### 9.3 Semantics

- **`opening`** per register comes from `register_opening_balances` for the exact `(org, register_name, period)` — else 0.
- **`incoming` / `outgoing`** are `Σ amount WHERE direction = 'in'/'out' AND cost_period = p_period`, filtered to `register_id = r.id` (with a fallback to legacy `register = r.name`).
- **`net`** is the sum, simple.
- **`closing = opening + net`**.
- **`portfolio_usd`** is a naïve sum — it assumes every register's currency is already USD-equivalent (1:1 for USDT/NAKIT_USD/TRX; TL registers are summed *as if USD*, which is wrong). ⚠ This is the single biggest accuracy gap in the summary. See [§16](#16-known-gaps--open-questions).
- **`pl_percent`**: rounding to 2 decimals; `0` when denominator ≤ 0.

### 9.4 Filters that the RPC does *not* apply

- Does not filter by `payment_period` (that's on the frontend).
- Does not filter by currency (TL and USDT entries in the same register are summed together — a bug if your register mixes currencies, which you shouldn't).
- Does not join with `accounting_categories` — use `get_category_breakdown` for that.

---

## 10. `get_category_breakdown` RPC contract

Latest: [122_fix_accounting_summary_rpc.sql:97](../../supabase/migrations/122_fix_accounting_summary_rpc.sql#L97).

### 10.1 Signature

```sql
public.get_category_breakdown(p_org_id uuid, p_period text) RETURNS jsonb
```

Returns an array of per-category spending totals for `direction = 'out'` only (expenses).

### 10.2 Output shape

```json
[
  { "category_name": "salary",    "category_label": "Salary",    "category_icon": "Money", "total_amount": 12500, "entry_count": 4 },
  { "category_name": "ib_payment", "category_label": "IB Payment", "category_icon": "Handshake", "total_amount": 8200, "entry_count": 3 },
  ...
]
```

Sorted by `total_amount DESC`. Entries without a category appear as `{ category_name: 'uncategorized', category_label: 'Uncategorized' }`.

**Currency is not disambiguated** — `total_amount` aggregates all currencies. Break down by currency at the caller if needed.

---

## 11. UI architecture

### 11.1 Route and scaffold

- Route: `/accounting` → [src/pages/accounting/index.tsx](../../src/pages/accounting/index.tsx).
- Page header with Export (CSV/XLSX dropdown) + Import CSV + Add Entry + Conversion buttons.
- 4 tabs: **Overview**, **Ledger**, **Reconciliation**, **Settings**.

### 11.2 Overview tab

[index.tsx:180–190](../../src/pages/accounting/index.tsx#L180-L190).

Period selector (YYYY-MM, default = current month) drives 3 components:

1. **`AccountingSummary`** — per-register cards (opening/incoming/outgoing/net/closing) + portfolio totals. Calls `get_accounting_summary`.
2. **`CategoryBreakdown`** — "Where did money go?" chart. Calls `get_category_breakdown`.
3. **`PortfolioVerification`** — compares the computed portfolio against wallet snapshots to flag discrepancies.

Grid layout: `AccountingSummary` full-width on top; `CategoryBreakdown` + `PortfolioVerification` side-by-side on `lg:`.

### 11.3 Ledger tab

[LedgerTable.tsx](../../src/pages/accounting/LedgerTable.tsx).

Paginated list of entries, 25 per page. Filter bar (11 filters per [useAccountingQuery.ts:51–63](../../src/hooks/queries/useAccountingQuery.ts#L51-L63)):
- `register`, `direction`, `entryType`, `currency`, `costPeriod`, `paymentPeriod`, `dateFrom`, `dateTo`, `amountMin`, `amountMax`, `search` (ILIKE on description).

Per-row actions: edit (routes to `/accounting/<id>/edit`, or to `/accounting/bulk/<id>` if `hr_bulk_payment_id` is set), delete (hard delete via dialog).

Daily summary popup per date-group (`LedgerDailySummaryDialog.tsx`) — parallels the Transfers Daily Summary pattern.

### 11.4 Reconciliation tab

[ReconciliationTab.tsx](../../src/pages/accounting/ReconciliationTab.tsx).

Monthly close flow: for each register, compare the computed `closing` against the user's "I counted this much" input → compute discrepancy → record a snapshot. Opening balances for the next month carry forward via `register_opening_balances`.

See [§13](#13-reconciliation).

### 11.5 Settings tab

Admin-only (`isAdmin = isGod || membership?.role === 'admin'`). Two sub-sections:

1. **RegisterSettingsTab** — CRUD org-custom registers. System registers shown as read-only pills.
2. **CategorySettingsTab** — CRUD org-custom categories. Global categories read-only.

Non-admins see a warm "admins only" message.

### 11.6 Entry form (Add/Edit)

Routes: `/accounting/new`, `/accounting/<id>/edit`. Component: [AccountingEntryFormContent.tsx](../../src/pages/accounting/AccountingEntryFormContent.tsx).

Fields: description, entry_type, direction, amount, currency, register (dropdown from `accounting_registers`), category (dropdown from `accounting_categories` — globals + org-custom merged), entry_date, cost_period (defaults to entry_date month), payment_period (defaults to same), payee, notes.

Uses react-hook-form + zod via `src/schemas/accountingSchema.ts`.

### 11.7 Wallets / IB Partners

Also exposed as tabs in the Accounting area (mixed routing):
- `WalletsTab.tsx` — list of wallets, balance cards, daily closing values. Uses `daily-wallet-snapshot` Edge Function.
- `IBPartnersTab.tsx` — IB partners view surfaced from Accounting.

Not on the main Accounting tab bar — they're routed separately (check `src/app/routes.tsx` for current binding).

---

## 12. Wallets & snapshots

### 12.1 Write path

1. Admin adds a wallet in the Wallets page (address + chain + label).
2. The [`daily-wallet-snapshot`](../../supabase/functions/daily-wallet-snapshot/index.ts) Edge Function runs on a Supabase Cron (dashboard-configured).
3. For each active wallet, calls Tatum (v4 for `ethereum|bsc|solana|polygon|celo`, v3 for others).
4. Upserts a row into `wallet_snapshots` keyed by `(wallet_id, snapshot_date)` — idempotent.
5. `balances` column is a JSONB array: `[{ asset, amount, usdValue }, ...]`.
6. `total_usd` is the sum.

### 12.2 Read path

- `WalletsTab` queries `wallets` + latest `wallet_snapshots` per wallet.
- `PortfolioVerification` compares `Σ total_usd` from snapshots with the computed `portfolio_usd` from `get_accounting_summary` → flags discrepancy if |delta| > 1% (exact threshold in the component).

### 12.3 Secret

`TATUM_API_KEY` must be set in Supabase Edge Function secrets. See [api/README.md §12](../api/README.md#12-edge-functions).

### 12.4 Manual refresh

Not implemented — snapshots are cron-driven only. If you need a mid-day refresh you invoke the Edge Function manually from an admin page (or wait for the next cron).

---

## 13. Reconciliation

The Reconciliation tab is the **monthly closing ritual**. Flow:

1. Pick a month.
2. For each register, enter the real-world counted balance.
3. System computes `expected_closing = opening + Σ in − Σ out` for the period.
4. System shows the delta (variance) → admin investigates.
5. On "close the month": writes one `accounting_register_snapshots` row per register with the agreed `closing_balance`, and writes the next month's `opening_balance` to `register_opening_balances`.

**Not implemented today** (as best I can tell from static reads):
- Auto-rollover. Admins manually confirm each month.
- Re-open-after-close. Once a month is snapshot, there's no UI to re-open it — you'd have to delete the snapshot directly.

See also `accounting_monthly_config` — per-month metadata like "is closed" and org-wide DEVİR values. The Reconciliation UI should own this; audit before assuming.

---

## 14. RLS & permissions

### 14.1 Who can do what

From [120 + default_permission](../../supabase/migrations/120_accounting_overhaul.sql#L499-L519):

| Op | God | Admin | Manager | Operation | IK |
|---|---|---|---|---|---|
| SELECT `accounting_entries` | ✓ | ✓ | ✓ | ✗ | ✓ |
| INSERT / UPDATE / DELETE `accounting_entries` | ✓ | ✓ | ✓ | ✗ | ✓ |
| SELECT `accounting_registers` / `categories` / `snapshots` | ✓ | ✓ | ✓ | ✗ | ✓ |
| INSERT / UPDATE / DELETE registers / categories / snapshots | ✓ | ✓ | ✗ | ✗ | ✗ (admin-only) |
| View `page:accounting` | ✓ | ✓ | ✓ | ✗ | ✓ |

**Operation users cannot see Accounting at all** — the page is hidden from the sidebar and direct URL access 403s via `get_my_page_permissions`.

### 14.2 RLS policies

Uniform pattern: org members read; admins/IK write/delete on config tables. Detailed policies live in migration 120 (registers §42–78, categories §106–155, snapshots §243–267).

### 14.3 `accounting_entries` update/delete is *open to all org members*

[008:604–620](../../supabase/migrations/008_transfers_and_operations.sql#L604-L620). At the RLS level, any member can UPDATE/DELETE any entry in their org. The role gating (operation can't enter the page at all) is enforced at the **page-permission** level via `get_my_page_permissions`, not RLS.

**Consequence:** if a future change lets operation role reach a URL that does a direct write, RLS won't block it. Defense-in-depth is weak here. See [§16](#16-known-gaps--open-questions).

---

## 15. Migrations timeline

| # | File | Effect |
|---|---|---|
| 008 | `008_transfers_and_operations.sql` | Base: `accounting_entries` (simple ledger), `wallets`, `wallet_snapshots`, `accounting_monthly_config` |
| 015 | (HR etc.) | Route added in app (no DB migration for routing) |
| 120 | `120_accounting_overhaul.sql` | **The big overhaul**: `accounting_registers`, `accounting_categories` (+ 10 globals), `accounting_register_snapshots`, `seed_default_registers`, `get_accounting_summary` v1, `get_category_breakdown` v1, extended `accounting_entries` columns, permission-matrix update |
| 122 | `122_fix_accounting_summary_rpc.sql` | Bugfixes to summary + category RPCs |
| 123 | `123_register_opening_balances.sql` | New table + `get_accounting_summary` uses manual openings (see [§7](#7-opening-balances--devİr)) |
| 130 | `130_accounting_ib_integration.sql` | IB-payment trigger (auto-entries) |
| 131 | `131_psp_settlement_accounting_integration.sql` | PSP-settlement trigger (auto-entries) |
| 103 | `103_hr_bulk_payments.sql` | Bulk-payment association (via `hr_bulk_payment_id` on entries) |

Cron / Edge Function: [`daily-wallet-snapshot`](../../supabase/functions/daily-wallet-snapshot/index.ts) — scheduled via Supabase Dashboard (not in migrations).

---

## 16. Known gaps / open questions

- **Portfolio USD is naïve.** `get_accounting_summary.totals.portfolio_usd` sums all registers' `(opening + net)` without converting TL→USD. For orgs with significant TL balances, this number is wrong. Either rename to `portfolio_base` or apply FX.
- **Opening-balance source conflict.** Migration 123 replaced snapshot-based lookup with a manual table. New orgs without `register_opening_balances` see opening = 0 every month. Decide: (a) auto-populate from previous month's snapshot, or (b) document the expected workflow (admin sets openings at month close).
- **`TL_BANKA` is broken via legacy path.** `accounting_entries.register` CHECK doesn't include `TL_BANKA`, but `seed_default_registers` creates it. Writes via `register` string fail; `register_id` path works. Either widen the CHECK or drop the legacy column.
- **Soft-delete missing.** Accounting entries are hard-deleted. Transfers have `deleted_at`; accounting doesn't. An auditor can't trace deleted entries. Add if regulatory pressure applies.
- **RLS is too permissive on entries.** Org members have full CRUD access at the RLS layer — gating is only at the page-permission layer. A bug that bypasses page permissions would let any member edit any entry.
- **Currency-register mismatch.** Nothing server-side prevents writing a TL entry to a USDT register. Enforce at write time (RPC or CHECK).
- **`psp_settlements.currency` still `('TL', 'USD')`.** Won't accept USDT settlements. Will reject when first crypto settlement lands.
- **No retention on `accounting_register_snapshots`.** Daily wallet snapshots grow forever. Consider purging snapshots older than 2 years.
- **Conversion flow is fragile.** If one of the two linked entries fails to insert, you're left with a half-conversion. Wrap in a transaction; consider an RPC that creates both atomically.
- **Wallet balance → portfolio gap.** `wallet_snapshots.total_usd` is computed via Tatum at snapshot time; the `accounting_register_snapshots` system is separate. `PortfolioVerification` tries to reconcile them but there's no canonical cross-link (wallets aren't modeled as registers).
- **No audit trail on accounting entries.** `transfer_audit_log` captures every transfer change. Accounting has no equivalent — edits and deletes leave no trace beyond `updated_at`. Add an `accounting_audit_log` if this becomes a regulatory issue.
- **Manual month close.** No cron closes months automatically. If an admin forgets, `register_opening_balances` for the next month won't be written and the opening stays 0.
- **Bulk-payment entry handling.** Entries tied to `hr_bulk_payments` should probably be marked `source_type = 'hr_bulk_payment'`. Today it's only linked via `hr_bulk_payment_id`. Normalize on next touch.
