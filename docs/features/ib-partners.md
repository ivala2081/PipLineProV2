# IB Partners

**Status:** Living spec · reflects codebase as of `main` on 2026-04-24
**Owner (feature):** Brokztech team
**Related:** [features/transfers.md](./transfers.md), [features/accounting.md](./accounting.md), [features/hr.md](./hr.md), [api/README.md §7](../api/README.md#7-ib-partner-rpcs)

> An **IB (Introducing Broker)** is an affiliate who refers clients to the org. They earn commissions based on a per-IB agreement (CPA, lot rebate, revenue share, salary, or hybrid). Every IB payment writes an accounting entry. Transfers may be attributed to an IB for downstream reporting. One of the most-migrated feature areas — added in 117, reshaped across 119, 124–135.

---

## Table of contents

1. [Scope](#1-scope)
2. [Domain vocabulary](#2-domain-vocabulary)
3. [Data model](#3-data-model)
4. [Agreement types](#4-agreement-types)
5. [Business rules](#5-business-rules)
6. [Commission calculation](#6-commission-calculation)
7. [Payments & accounting integration](#7-payments--accounting-integration)
8. [Transfers & HR cross-refs](#8-transfers--hr-cross-refs)
9. [RPCs](#9-rpcs)
10. [UI architecture](#10-ui-architecture)
11. [RLS & permissions](#11-rls--permissions)
12. [Migrations timeline](#12-migrations-timeline)
13. [Known gaps / open questions](#13-known-gaps--open-questions)

---

## 1. Scope

**In scope:**
- `ib_partners`, `ib_referrals`, `ib_commissions`, `ib_payments` tables.
- `calculate_ib_commission` RPC.
- IB payment → accounting auto-entry trigger (117 + 130).
- IB ↔ HR employee attribution (`managed_by`, `secondary_employee_id`).
- IB attribution on transfers via `transfers.ib_partner_id` (124).

**Out of scope:**
- Accounting entry consumption of IB payments — covered in [accounting.md §8.1](./accounting.md#81-ib-payments-migration-117--130).
- HR employee lifecycle — covered in [hr.md](./hr.md). This file only covers the IB side of the link.

---

## 2. Domain vocabulary

| Term | Definition |
|---|---|
| **IB Partner** | An introducing broker / affiliate. Referenced by a unique `referral_code` per org. |
| **Referral** | A client the IB brought. Carries `ftd_date`, `ftd_amount`, `lots_traded`, `status`. |
| **FTD** | First Time Deposit — the inflection point when a referral converts from `registered` to `ftd`. |
| **Commission** | Calculated (or manually entered) amount owed to an IB for a period. Stored in `ib_commissions`. Has `draft → confirmed → paid` lifecycle. |
| **Payment** | Actual payout. Inserts into `ib_payments` → auto-creates matching `accounting_entries` row. |
| **Agreement type** | How commission is earned: `salary \| cpa \| lot_rebate \| revenue_share \| hybrid`. |
| **Managed by** (`ib_partners.managed_by`) | HR employee assigned to this IB. Auto-nulls on employee deactivation (migration 133). |
| **Secondary employee** | Backup employee attribution. Not auto-nulled. |

---

## 3. Data model

### 3.1 `ib_partners` · [117:13–27](../../supabase/migrations/117_ib_management.sql#L13-L27)

| Column | Notes |
|---|---|
| `id` UUID PK | |
| `organization_id` | FK |
| `name` | TEXT |
| `contact_email`, `contact_phone` | Optional |
| `referral_code` | TEXT — UNIQUE per org (see unique index) |
| `agreement_type` | CHECK IN `('salary', 'cpa', 'lot_rebate', 'revenue_share', 'hybrid')` (migration 125 widened — see [§4](#4-agreement-types)) |
| `agreement_details` | JSONB for per-type parameters |
| `status` | CHECK IN `('active', 'paused', 'terminated')` DEFAULT `'active'` |
| `notes`, `created_by`, `created_at`, `updated_at` | |
| `managed_by` (migration 126) | UUID FK → `hr_employees` ON DELETE SET NULL via trigger 133 |
| `secondary_employee_id` (migration 128) | UUID FK → `hr_employees` — backup attribution, not auto-nulled |
| `referral_code` + `company_name` status | Migration 127 dropped `referral_code` company_name fields as unused |

### 3.2 `ib_referrals` · [117:36–50](../../supabase/migrations/117_ib_management.sql#L36-L50)

One row per client referred by an IB.

| Column | Notes |
|---|---|
| `ib_partner_id` FK | |
| `client_name` | TEXT |
| `ftd_date`, `ftd_amount` | First-time-deposit snapshot |
| `is_ftd` | BOOLEAN — has FTD been recorded |
| `lots_traded` | NUMERIC — driver for lot-rebate commissions |
| `status` | CHECK IN `('registered', 'ftd', 'active', 'churned')` |
| `notes`, `created_by`, `created_at`, `updated_at` | |

### 3.3 `ib_commissions` · [117:59–79](../../supabase/migrations/117_ib_management.sql#L59-L79)

Monthly (or arbitrary-period) commission records.

| Column | Notes |
|---|---|
| `ib_partner_id` FK | |
| `period_start`, `period_end` | DATE range |
| `agreement_type` | Snapshot of the agreement type used for this period (IB's type may have changed since) |
| `calculated_amount` | From `calculate_ib_commission` RPC |
| `override_amount` | Manual override (nullable) |
| `final_amount` | GENERATED: `COALESCE(override_amount, calculated_amount)` — the actual owed amount |
| `override_reason` | Why the override was applied |
| `currency` | DEFAULT `'USD'` |
| `breakdown` | JSONB of per-source breakdown (CPA count, lots, revenue share, etc.) |
| `status` | CHECK IN `('draft', 'confirmed', 'paid')` — lifecycle |
| `confirmed_at`, `confirmed_by` | Audit |
| `UNIQUE (org, partner, period_start, period_end)` | One commission row per period per IB |

### 3.4 `ib_payments` · [117:89–104](../../supabase/migrations/117_ib_management.sql#L89-L104)

Actual money moved to the IB.

| Column | Notes |
|---|---|
| `ib_partner_id` FK | |
| `ib_commission_id` FK nullable | Links payment to the commission it settles (can be partial) |
| `amount` | NUMERIC CHECK `> 0` |
| `currency` | DEFAULT `'USD'` |
| `register` | CHECK IN `('USDT', 'NAKIT_TL', 'NAKIT_USD', 'TRX')` — accounting register |
| `payment_method` | TEXT (free-form) |
| `reference` | TEXT — e.g. tx hash |
| `payment_date` | DATE |
| `description`, `notes`, `created_by`, `created_at` | |

**Auto-entry trigger** (migrations 117 + 130): `trg_ib_payment_accounting` — `AFTER INSERT` creates an `accounting_entries` row with `entry_type='ODEME'`, `direction='out'`, `category_id = <'ib_payment' global category>`, `ib_payment_id = NEW.id`. See [§7](#7-payments--accounting-integration).

---

## 4. Agreement types

| Type | Commission driver | Agreement details (JSONB) |
|---|---|---|
| `salary` | Flat per-period amount | `{ amount, currency }` |
| `cpa` | Per FTD | `{ per_ftd_usd }` × count of FTDs in period |
| `lot_rebate` | Per lot traded | `{ per_lot_usd }` × Σ lots_traded |
| `revenue_share` | % of net revenue from referred clients | `{ rate_percent }` — **removed as a standalone source in migration 129** |
| `hybrid` | Combination | Combines fields from above |

**Migration 125** introduced multi-type support — a single IB can have multiple active sources (e.g. CPA + lot_rebate). `agreement_type = 'hybrid'` signals this, and the details JSONB carries each sub-type's config.

**Migration 129** removed `cpa` and `revenue_share` as standalone top-level types (kept as hybrid sub-sources only). Simplified the commission calculation path.

---

## 5. Business rules

### 5.1 One referral_code per org

`UNIQUE INDEX (organization_id, referral_code)`. Two IBs can share a code across different orgs but not within.

### 5.2 Commission lifecycle

- **`draft`** — calculated but not yet approved. Editable.
- **`confirmed`** — approved by an admin. `confirmed_at` + `confirmed_by` set. Locked from casual edits.
- **`paid`** — an `ib_payments` row has been created referencing this commission. The status usually flips via a manual action after payment.

### 5.3 `final_amount` is a generated column

`final_amount GENERATED ALWAYS AS (COALESCE(override_amount, calculated_amount)) STORED`. You cannot directly SET `final_amount` — UPDATE `override_amount` instead.

### 5.4 Payment and commission can mismatch

An `ib_payments` row can be created without an `ib_commission_id` (ad-hoc payment), and a single commission can be settled by multiple partial payments. The trigger-created accounting entry still fires either way.

### 5.5 Manager-employee auto-unassign

When an `hr_employees.is_active` flips to `false`, the trigger `unassign_ib_partners_on_employee_deactivation` (migration 133) nulls out `ib_partners.managed_by` for that employee. `secondary_employee_id` is **not** touched (intentional — the secondary is expected to cover temporary gaps).

### 5.6 Transfer attribution doesn't drive commission

Setting `transfers.ib_partner_id` attributes the transfer to an IB for reporting purposes. It does **not** automatically create an `ib_commissions` record. Commission calculation is done by the RPC on demand (see [§6](#6-commission-calculation)).

### 5.7 IB with `status = 'terminated'` still has history

Terminated IBs aren't deleted. Their referrals, commissions, and payments remain. UI hides them from default lists (toggle to show).

---

## 6. Commission calculation

### 6.1 RPC

`calculate_ib_commission(p_ib_partner_id uuid, p_period_start date, p_period_end date) → jsonb` — latest at [129_ib_remove_cpa_revenue_share_sources.sql:89](../../supabase/migrations/129_ib_remove_cpa_revenue_share_sources.sql#L89).

**Does not write** to `ib_commissions`. Returns a JSONB preview; the UI takes the result and either creates a `draft` row or updates an existing one.

### 6.2 Output shape

```json
{
  "calculated_amount": <number>,
  "currency": "USD",
  "breakdown": {
    "cpa":           { "count": N, "per_ftd_usd": X, "amount": N*X },
    "lot_rebate":    { "lots":  L, "per_lot_usd": X, "amount": L*X },
    "revenue_share": { "base":  B, "rate": R,        "amount": B*R },
    "salary":        { "amount": X }
  },
  "type_details":  [ ... ]          // per-agreement-type details
}
```

Fields appear only when the IB's agreement includes that type. `base` for revenue share is typically `Σ amount_usd` of referred clients' deposits in the period.

### 6.3 Semantics

- **CPA:** counts `ib_referrals` rows with `ftd_date` in `[period_start, period_end]` and `is_ftd = true`.
- **Lot rebate:** sums `lots_traded` for referrals in the period (careful — `lots_traded` is cumulative in the schema, so the RPC must delta the period's increment).
- **Revenue share:** aggregates client deposits attributed via `ib_referrals.client_name` → transfers `full_name` match. ⚠ **Fragile:** relies on string name match, not a referral_id on transfers. See [§13](#13-known-gaps--open-questions).

---

## 7. Payments & accounting integration

### 7.1 Auto-entry on INSERT

Every `ib_payments` INSERT → `create_ib_payment_accounting_entry()` trigger fires:

```sql
INSERT INTO accounting_entries (
  organization_id, entry_type, direction, amount, currency,
  register, description, entry_date, ib_payment_id, created_by, category_id
) VALUES (
  NEW.organization_id, 'ODEME', 'out', NEW.amount, NEW.currency,
  NEW.register,
  COALESCE(NEW.description, 'IB Payment: ' || <partner_name>),
  NEW.payment_date, NEW.id, NEW.created_by,
  <global 'ib_payment' category id>   -- migration 130 added this
);
```

See [117:117–150](../../supabase/migrations/117_ib_management.sql#L117-L150) and [130_accounting_ib_integration.sql:34](../../supabase/migrations/130_accounting_ib_integration.sql#L34).

### 7.2 Audit log skip

The accounting entry created by this trigger is **skipped** by `audit_org_table_change` (migration 130) — the `ib_payments` row is already audited; the derived entry would be a duplicate.

### 7.3 Editing payments

Editing an `ib_payments` row **does not** update the linked `accounting_entries` automatically (no UPDATE trigger). The UI routes edits via [accounting.md §11.3](./accounting.md#113-ledger-tab) — user clicks the auto-entry in the ledger, the app navigates to the IB payment form, the UPDATE affects both. Direct SQL UPDATE of a payment desyncs the entry.

### 7.4 Deleting payments

`ON DELETE SET NULL` on `accounting_entries.ib_payment_id`. Same orphan problem as PSP settlements — see [psp.md §5.4](./psp.md#54-delete-handling).

---

## 8. Transfers & HR cross-refs

### 8.1 `transfers.ib_partner_id` (migration 124)

Transfer can carry an IB attribution. `ON DELETE SET NULL` (migration 135) — deleting the IB nulls the column on all historical transfers.

Filter in Transfers page drawer uses this column — see [transfers.md §8.3](./transfers.md#83-filter-drawer-sheet). Filtering by IB lets admins see what a given IB's clients produced.

### 8.2 `ib_partners.managed_by` (migration 126)

FK to `hr_employees`. Read by the UI to show "Assigned to: X" on the IB list.

**Trigger** (migration 133): when an employee is deactivated, all IBs with `managed_by = <that employee>` have `managed_by` set to NULL. **Secondary employee** is untouched.

### 8.3 `ib_partners.secondary_employee_id` (migration 128)

Optional backup employee. Not auto-nulled on deactivation. Used by reports to show "if primary is out, who covers."

### 8.4 Open write access (migration 134)

Migration 134 relaxed IB tables' write RLS — all org members (not just admins) can INSERT/UPDATE/DELETE IB rows. Implication: operation-role users can create and modify IB partners via SQL/API. The UI should still gate edits to admin, but the RLS layer doesn't enforce it.

---

## 9. RPCs

See [api/README.md §7](../api/README.md#7-ib-partner-rpcs).

| RPC | Purpose | Latest |
|---|---|---|
| `calculate_ib_commission(partner_id, period_start, period_end)` | Preview commission for a period | [129](../../supabase/migrations/129_ib_remove_cpa_revenue_share_sources.sql) |

**No other IB-specific RPCs** — direct table queries handle reads (commissions / payments lists, referrals).

---

## 10. UI architecture

### 10.1 Routes

- `/ib` — IB list page (partners + filters).
- `/ib/:id` — Detail page with tabs: Partner info, Referrals, Commissions, Payments.

### 10.2 List page features

- Filter by `status`, `agreement_type`, `managed_by` employee.
- Show/hide terminated (default: hide).
- Inline "Preview commission" button → opens a dialog that calls `calculate_ib_commission` and lets admin create a `draft` row.

### 10.3 Detail tabs

- **Partner info:** edit name, contact, agreement type, managed_by, secondary_employee, status.
- **Referrals:** CRUD + CSV import/export.
- **Commissions:** periodic rows with `draft/confirmed/paid` status pills. "Confirm" and "Pay" buttons transition states.
- **Payments:** list of `ib_payments`. Click → routes to the accounting entry editor ([§7.3](#73-editing-payments)).

### 10.4 IB Partners tab in Accounting

[IBPartnersTab.tsx](../../src/pages/accounting/IBPartnersTab.tsx) — a summary view from the Accounting side showing who's owed what. Cross-link, not primary UI.

---

## 11. RLS & permissions

### 11.1 Who can do what

Per [`private.default_permission`](../../supabase/migrations/120_accounting_overhaul.sql#L528-L532) and [migration 134](../../supabase/migrations/134_ib_open_write_to_all_org_members.sql):

| Op | God | Admin | Manager | Operation | IK |
|---|---|---|---|---|---|
| SELECT IB tables | ✓ | ✓ | ✓ | ✓ | ✓ |
| INSERT / UPDATE / DELETE IB tables | ✓ | ✓ | ✓ | ✓ | ✓ (since 134) |
| View `page:ib` | ✓ | ✓ | ✓ | ✓ | ✓ |

**Migration 134** opened write access to all org members — previously admin-only. The stated reason was "IB data entry is an operational task." The UI should gate edits to admin/manager for destructive actions; the RLS doesn't.

---

## 12. Migrations timeline

| # | File | Effect |
|---|---|---|
| 117 | `117_ib_management.sql` | Created 4 tables + accounting trigger + page permissions + `calculate_ib_commission` v1 |
| 119 | `119_ib_partner_extended_fields.sql` | Extended partner columns (contact info, etc.) |
| 124 | `124_add_ib_partner_to_transfers.sql` | `transfers.ib_partner_id` |
| 125 | `125_ib_multi_agreement_types.sql` | Multi-type agreements (hybrid) |
| 126 | `126_ib_partner_managed_by.sql` | `managed_by` FK → hr_employees |
| 127 | `127_drop_ib_referral_code_company_name.sql` | Removed unused columns |
| 128 | `128_ib_partner_secondary_employee.sql` | `secondary_employee_id` |
| 129 | `129_ib_remove_cpa_revenue_share_sources.sql` | Simplified commission types |
| 130 | `130_accounting_ib_integration.sql` | Category linkage + audit skip |
| 131 | `131_psp_settlement_accounting_integration.sql` | *(PSP — not IB, but shares the audit-skip pattern)* |
| 133 | `133_ib_auto_reassign_on_employee_deactivation.sql` | Auto-null `managed_by` trigger |
| 134 | `134_ib_open_write_to_all_org_members.sql` | Opened IB write RLS to all org members |
| 135 | `135_ib_partner_cascade_set_null.sql` | `transfers.ib_partner_id` ON DELETE SET NULL |

---

## 13. Known gaps / open questions

- **Revenue share uses name-matching on transfers.** `ib_referrals.client_name` (string) matched against `transfers.full_name` (string) — not a FK. A client named "Ahmet Yılmaz" referred by IB A will match *any* "Ahmet Yılmaz" transfer in the org, including unrelated ones. Add a `transfers.ib_referral_id` FK for precise attribution.
- **Open write RLS (migration 134) is a footgun.** Operation role can create/edit/delete IB rows at the RLS level. The UI must gate admin actions or risk accidental writes via direct API / AI assistant. Consider reverting to `private.has_role_permission` gating.
- **No soft delete on IB tables.** IB partners / referrals / commissions / payments are hard-deleted. Restoring requires SQL. If an IB is deleted mid-month, their commission history is lost except via the accounting entries that reference them.
- **Orphan accounting entries on payment delete.** Same pattern as PSP — `ON DELETE SET NULL`. Cascade-delete or refuse delete if linked.
- **No commission calculation for hybrid auto-sub-sources.** Migration 125 added hybrid, 129 simplified. Current RPC may not correctly handle all 3 sub-source combos — verify with business when next commission period rolls over.
- **`lots_traded` is cumulative, not per-period.** The commission RPC must delta against the previous period's value, or the same lots get paid twice. Audit the RPC.
- **`managed_by` auto-nulls, `secondary_employee_id` does not.** Intentional but subtle. Document for operators.
- **No IB-level reporting in Transfers' `get_monthly_summary`.** [api/README.md §14](../api/README.md#14-known-gaps--open-questions) flagged this. Add `ib_partner_breakdown` if IB reporting becomes primary.
- **Referral status has no automation.** `registered` → `ftd` transition requires a manual edit. Could be driven by a trigger watching `transfers` for the referral's first deposit.
- **Audit log coverage on IB tables.** Not confirmed whether `audit_org_table_change` trigger (migration 118) is attached to IB tables. Verify.
