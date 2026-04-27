# HR / Payroll

**Status:** Living spec · reflects codebase as of `main` on 2026-04-24
**Owner (feature):** Brokztech team
**Related:** [features/transfers.md §9](./transfers.md#9-auto-bonus-integration-hr), [features/accounting.md §8.3](./accounting.md#83-hr-salary--bulk-payments-migration-103), [features/ib-partners.md](./ib-partners.md) (TBD)

> HR owns **who works at the org, what they earn, and when**. It touches three other systems:
> 1. **Transfers** — Marketing/Retention employees earn auto-bonuses from transfer activity.
> 2. **Accounting** — every salary, bonus, and bank deposit writes an accounting entry (bulk or single).
> 3. **IB Partners** — each IB can be `managed_by` an employee; deactivating the employee auto-reassigns.
>
> Getting HR wrong means wrong paychecks. Every invariant in [§6 Business rules](#6-business-rules) exists because a real payroll bug happened.

---

## Table of contents

1. [Scope](#1-scope)
2. [Domain vocabulary](#2-domain-vocabulary)
3. [Data model](#3-data-model)
4. [Employee roles](#4-employee-roles)
5. [Salary model](#5-salary-model)
6. [Business rules](#6-business-rules)
7. [Bonus system](#7-bonus-system)
8. [Auto-bonus (Marketing & Retention)](#8-auto-bonus-marketing--retention)
9. [Barem — targets & failures](#9-barem--targets--failures)
10. [Attendance & leaves](#10-attendance--leaves)
11. [QR check-in](#11-qr-check-in)
12. [Bulk payments](#12-bulk-payments)
13. [HR settings](#13-hr-settings)
14. [Employee documents](#14-employee-documents)
15. [Accounting integration](#15-accounting-integration)
16. [IB partner cross-refs](#16-ib-partner-cross-refs)
17. [RLS & permissions](#17-rls--permissions)
18. [Migrations timeline](#18-migrations-timeline)
19. [Known gaps / open questions](#19-known-gaps--open-questions)

---

## 1. Scope

**In scope:**
- `hr_employees` and related tables (documents, salary_payments, bonus_agreements, bonus_payments, attendance, leaves, settings, mt_config, re_config, barem_targets, barem_failures, bulk_payments, bulk_payment_items).
- The `/hr` page and all its tabs (Employees, Attendance, Salaries, Bonuses, Leaves, Settings, QR Code).
- Auto-bonus logic for Marketing & Retention (calls out from Transfers — [transfers.md §9](./transfers.md#9-auto-bonus-integration-hr)).
- QR-code check-in flow and `hr_checkin_by_qr` RPC.
- Bulk salary / bonus / bank-deposit payout flows and their accounting-entry side effects.

**Out of scope:**
- Org-member roles (admin/manager/operation/ik) — those are **auth** concepts, not HR (see [auth/README.md](../auth/README.md)). HR employees are a separate dataset.
- Members page at `/members` — that shows *org members* (login-able users), not HR employees. A user can be both, but the tables are disjoint.

---

## 2. Domain vocabulary

| Term | Definition |
|---|---|
| **Employee** (`hr_employees`) | A person on payroll. **Not** the same as an org member — employees usually don't have login accounts, org members usually aren't on HR payroll. The only link is matching emails (QR check-in uses email). |
| **Role** (`hr_employees.role`) | Job title: `Manager`, `Marketing`, `Marketing Manager`, `Operation`, `Retention`, `Retention Manager`, `Project Management`, `Social Media`, `Sales Development`, `Programmer`, `Sales`. Plus org-custom. **Not** the same as org member `role`. |
| **Insured** (`is_insured`) | Employee is on the books (SGK). Insured employees get their salary split: a portion declared to the bank (`bank_salary_tl`), the rest paid in cash. |
| **Supplement** (`receives_supplement`) | A fixed monthly top-up paid in cash, above the nominal salary. Configured in `hr_settings.supplement_tl`. |
| **Insured bank salary** (`bank_salary_tl`) | The portion of salary deposited in the employee's bank account. Typically `hr_settings.insured_bank_amount_tl` (28,075.50 default) for insured employees. |
| **Bonus agreement** (`hr_bonus_agreements`) | A contract describing how a bonus is computed: fixed, percentage, tier, or variable. |
| **Bonus payment** (`hr_bonus_payments`) | An actual bonus payout instance for a given period. May be manual or auto-generated from a transfer. Always denominated in **USDT**. |
| **Auto-bonus** | Bonus payment auto-inserted by the Transfers mutation hook when a transfer is saved with an employee attached. Two roles qualify: Marketing (per-deposit tier lookup) and Retention (flat 5.75% of amount_usd). |
| **Salary payment** (`hr_salary_payments`) | Monthly salary disbursement with deductions applied. |
| **Barem** | Monthly performance target system for Marketing role. Targets = goals; failures = records of missed targets; penalties = commission rate cuts. |
| **Attendance** (`hr_attendance`) | Daily record per employee: status, check_in, check_out, absent_hours, deduction_exempt, leave_id. |
| **Leave** (`hr_leaves`) | Time off: `leave_type`, date range. An attendance row may link to a leave via `leave_id` so the day is counted correctly. |
| **QR token** (`hr_settings.qr_token`) | A stable per-org UUID. Employees scan a QR with this token + enter their email to record check-in without logging in. |
| **Bulk payment** (`hr_bulk_payments`) | Groups multiple salary / bonus / bank-deposit items into a single accounting entry for clean ledger display. |
| **Variable bonus** | A bonus agreement where the amount is decided at payment time (not computed from formula). Introduced by migration 068. |
| **Standard check-in / check-out** | Org-wide default office hours (`'10:00'` / `'18:30'` defaults). Drives late/on-time status on QR check-ins. |

---

## 3. Data model

> ⚠ **Note:** The base HR tables (`hr_employees`, `hr_salary_payments`, `hr_bonus_agreements`, `hr_bonus_payments`, `hr_attendance`, `hr_settings`, `hr_mt_config`, `hr_re_config`, `hr_employee_documents`) do not have their initial `CREATE TABLE` statements in the migrations folder visible to this repo — they were likely applied via a pre-repo migration or directly via the Supabase dashboard. **The TypeScript types in [useHrQuery.ts](../../src/hooks/queries/useHrQuery.ts) are the authoritative shape**, cross-checked against usage in the frontend + the later `ALTER TABLE` migrations.

### 3.1 `hr_employees`

Authoritative type: [useHrQuery.ts:20–39](../../src/hooks/queries/useHrQuery.ts#L20-L39).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `organization_id` | UUID FK | |
| `full_name` | TEXT | |
| `email` | TEXT | Unique per org; used by QR check-in to match employees |
| `role` | TEXT | Free-form; validated client-side against `HR_EMPLOYEE_ROLES` list |
| `salary_tl` | NUMERIC | Nominal monthly salary in the employee's `salary_currency` (despite the column name) |
| `salary_currency` | TEXT `'TL' \| 'USD'` | **Real cash USD**, not USDT. USD salaries hit `NAKIT_USD` register; TL hit `NAKIT_TL` |
| `is_insured` | BOOLEAN | On the books? |
| `receives_supplement` | BOOLEAN | Gets the monthly supplement? |
| `bank_salary_tl` | NUMERIC | Nullable. Split portion for insured employees (migration 102) |
| `is_active` | BOOLEAN | Payroll status |
| `hire_date` | DATE | |
| `exit_date` | DATE (migration 109) | When employee left. Check-in/queries filter on this |
| `notes` | TEXT | |
| `created_by`, `created_at`, `updated_at` | | Standard audit |

**Indexes:** per `(organization_id)`, `(email)`, `(is_active)`.

### 3.2 `hr_employee_documents`

One row per uploaded document. Types enumerated in `HR_DOCUMENT_TYPES` ([useHrQuery.ts:131–137](../../src/hooks/queries/useHrQuery.ts#L131-L137)):

| `document_type` | TR label | EN label |
|---|---|---|
| `ikametgah` | İkametgâh Belgesi | Residence Certificate |
| `adli_sicil` | Adli Sicil Kaydı | Criminal Record |
| `saglik_raporu` | Sağlık Raporu | Health Report |
| `kimlik_on` | Kimlik Ön Yüz | ID Card (Front) |
| `kimlik_arka` | Kimlik Arka Yüz | ID Card (Back) |

Files stored in Supabase Storage under a bucket; `file_url` + `storage_path` on the row.

### 3.3 `hr_attendance`

Daily per-employee attendance. Type: [useHrQuery.ts:68–82](../../src/hooks/queries/useHrQuery.ts#L68-L82).

| Column | Notes |
|---|---|
| `employee_id`, `organization_id`, `date` | `(employee_id, date)` is effectively unique |
| `status` | Enum: `on_time`, `late`, `absent`, `leave`, (etc.) — see `HrAttendanceStatus` in `database.types.ts` |
| `check_in` / `check_out` | `HH:MM` strings (TEXT) |
| `absent_hours` | NUMERIC (migration 138 made this numeric explicitly) |
| `deduction_exempt` | BOOLEAN — if true, no salary deduction even when absent |
| `leave_id` | FK → `hr_leaves(id)`. Links the day to a leave record |
| `notes`, `recorded_by`, `created_at` | |

### 3.4 `hr_leaves` · [075](../../supabase/migrations/075_add_hr_leaves.sql)

| Column | Notes |
|---|---|
| `employee_id`, `organization_id` | |
| `leave_type` | `paid \| unpaid \| sick \| marriage \| bereavement \| other` (see `HrLeaveType` enum) |
| `start_date`, `end_date` | DATE range inclusive |
| `notes`, `created_by`, `created_at` | |

**Integration with attendance** (migration 104): leave days automatically flip `hr_attendance.status = 'leave'` and link via `leave_id`.

### 3.5 `hr_bonus_agreements`

Per-employee bonus contract. Type: [useHrQuery.ts:96–114](../../src/hooks/queries/useHrQuery.ts#L96-L114).

| Column | Notes |
|---|---|
| `employee_id`, `organization_id` | |
| `title`, `description` | Human-readable |
| `bonus_type` | `fixed \| percentage \| tier \| variable` (migration 068 added `variable`) |
| `currency` | Usually `USDT` |
| `fixed_amount` | For `fixed` type |
| `percentage_rate`, `percentage_base` | For `percentage` type |
| `tier_rules` | JSONB for `tier` type |
| `is_active` | |
| `effective_from`, `effective_until` | Date range |

### 3.6 `hr_bonus_payments`

Actual payouts. Type: [useHrQuery.ts:116–129](../../src/hooks/queries/useHrQuery.ts#L116-L129).

| Column | Notes |
|---|---|
| `agreement_id` | Nullable (auto-bonuses have no agreement) |
| `employee_id`, `organization_id` | |
| `period` | `'YYYY-MM'` |
| `amount_usdt` | Always USDT (regardless of employee's salary currency) |
| `notes` | |
| `paid_at` | Nullable — null = pending, set = paid |
| `transfer_id` | FK → `transfers(id)`. Set when auto-bonus was driven by a specific transfer |
| `status` | `'pending' \| 'paid'` (migration 069b) |
| `created_by`, `created_at` | |

### 3.7 `hr_salary_payments`

Monthly salary disbursement with all the deductions. Columns (inferred from `BulkSalaryPayoutItem` usage in [useHrQuery.ts:1588–1644](../../src/hooks/queries/useHrQuery.ts#L1588-L1644)):

- `employee_id`, `organization_id`, `period`
- `amount_tl` (nominal before deductions)
- `advance_tl` (prior advance to offset)
- `attendance_deduction_tl`
- `unpaid_leave_deduction_tl`
- `bank_deposit_tl` (split for insured)
- `supplement_tl` / `supplement_currency`
- `salary_currency`
- `paid_at`, `created_by`, `created_at`

### 3.8 `hr_settings`

Per-org HR configuration. One row per org. Type: [useHrQuery.ts:191–208](../../src/hooks/queries/useHrQuery.ts#L191-L208). Defaults in [useHrQuery.ts:210–239](../../src/hooks/queries/useHrQuery.ts#L210-L239).

| Setting | Default | Meaning |
|---|---|---|
| `roles` | 11 default roles | List of allowed `role` values |
| `supplement_tl` | `4000` | Monthly supplement amount |
| `supplement_currency` | `'TL'` | |
| `insured_bank_amount_tl` | `28075.50` | Bank-deposit portion for insured salaries |
| `insured_bank_currency` | `'TL'` | |
| `absence_full_day_divisor` | `30` | Full-day absence = salary / 30 |
| `absence_half_day_divisor` | `60` | Half-day absence = salary / 60 |
| `absence_hourly_divisor` | `240` | 1 hour absence = salary / 240 |
| `daily_deduction_enabled` | `true` | Toggle daily deductions |
| `hourly_deduction_enabled` | `true` | Toggle hourly deductions |
| `standard_check_in` | `'10:00'` | Office standard start |
| `standard_check_out` | `'18:30'` | Office standard end |
| `timezone` | `'Europe/Istanbul'` | Local TZ for check-ins |
| `weekend_off` | `true` (migration 079) | Weekends don't accrue absence |
| `barem_roles` | `['Marketing']` (migration 106) | Which roles are subject to barem targets |
| `qr_token` | auto-gen UUID (migration 136) | Per-org QR check-in token |

**Migrations touching `hr_settings`:** 073 (RLS fix include manager), 079 (weekend_off), 106 (barem_roles), 136 (qr_token).

### 3.9 `hr_mt_config`

Marketing-specific bonus configuration. Type: [useHrQuery.ts:163–171](../../src/hooks/queries/useHrQuery.ts#L163-L171). Defaults at [useHrQuery.ts:241–](../../src/hooks/queries/useHrQuery.ts#L241).

```ts
{
  deposit_tiers: MtTier[],   // per-deposit USDT bonus: [{min, bonus}]
  count_tiers:   MtTier[],   // monthly deposit count tiers
  volume_tiers:  MtTier[],   // monthly volume tiers
  weekly_prize_amount: number,
  weekly_prize_min_sales: number,
  monthly_prize_amount: number,
  monthly_prize_min_sales: number,
}
```

Default `deposit_tiers` (descending by `min`):
```
{ min: 10000, bonus: 750 }
{ min:  7500, bonus: 500 }
{ min:  5000, bonus: 350 }
{ min:  4000, bonus: 300 }
{ min:  3000, bonus: 200 }
{ min:  2500, bonus: 175 }
{ min:  2000, bonus: 150 }
{ min:  1000, bonus: 100 }
```

### 3.10 `hr_re_config`

Retention-specific bonus configuration. Type: [useHrQuery.ts:177–185](../../src/hooks/queries/useHrQuery.ts#L177-L185).

```ts
{ rate_tiers: [{ min: 0, rate: 5.75 }] }   // flat 5.75% default
```

The auto-bonus code uses a **hardcoded 5.75% rate** ([useTransfersQuery.ts:26](../../src/hooks/queries/useTransfersQuery.ts#L26)) — the `rate_tiers` table is not yet consulted. See [§19](#19-known-gaps--open-questions).

### 3.11 `hr_mt_barem_failures` · [105](../../supabase/migrations/105_hr_mt_barem_failures.sql), [107](../../supabase/migrations/107_fix_barem_failures_rls.sql)

Records of failed monthly targets for Marketing employees.

### 3.12 `hr_barem_targets` · [108](../../supabase/migrations/108_hr_barem_targets.sql)

Per-employee monthly targets.

### 3.13 `hr_bulk_payments` + `hr_bulk_payment_items` · [103](../../supabase/migrations/103_hr_bulk_payments.sql)

Groups multiple salary/bonus/bank-deposit items into one accounting entry.

`hr_bulk_payments`:
| Column | Notes |
|---|---|
| `batch_type` | `'salary' \| 'bonus' \| 'bank_deposit'` (CHECK) |
| `period` | TEXT (e.g. "Mart 2026") |
| `total_amount` | Sum of all items |
| `currency` | `'TL' \| 'USD' \| 'USDT'` |
| `item_count` | |
| `paid_at` | DATE |

`hr_bulk_payment_items`:
| Column | Notes |
|---|---|
| `bulk_payment_id` FK | |
| `employee_id` FK | |
| `amount`, `currency`, `description` | Net disbursement |
| `salary_currency`, `supplement_amount` / `currency`, `bank_deposit_amount`, `attendance_deduction`, `unpaid_leave_deduction` | Salary-specific |
| `agreement_id`, `bonus_payment_id` | Bonus-specific (FK back) |
| `salary_payment_id` | Salary-specific (FK back) |
| `advance_type` | `'insured_salary'` for bank deposits |

**FK from `accounting_entries.hr_bulk_payment_id`** (added by 103). On bulk payout, exactly one `accounting_entries` row is inserted with this FK set; editing the entry routes the user to `/accounting/bulk/<id>` ([accounting.md §11.3](./accounting.md#113-ledger-tab)).

---

## 4. Employee roles

Eleven default roles ([useHrQuery.ts:139–151](../../src/hooks/queries/useHrQuery.ts#L139-L151)):

1. Manager
2. Marketing
3. Marketing Manager
4. Operation
5. Retention
6. Retention Manager
7. Project Management
8. Social Media
9. Sales Development
10. Programmer
11. Sales

Admins can customize via `hr_settings.roles[]`. The role name is a TEXT free-form — roles added to `roles[]` aren't enforced as a CHECK on `hr_employees.role`, just **displayed in the dropdown**. If someone edits an employee via SQL and sets `role = 'Unicorn'`, the UI renders it.

**Role → color tag mapping:** [src/pages/hr/utils/hrConstants.ts](../../src/pages/hr/utils/hrConstants.ts) — `getRoleVariant(role)` maps to a `<Tag variant>`.

**Role display aliases** ([hr/index.tsx:80–83](../../src/pages/hr/index.tsx#L80-L83)):
- `Project Management` → shown as `Project Mgmt`
- `Sales Development` → shown as `Sales Dev`

---

## 5. Salary model

### 5.1 Nominal salary

`hr_employees.salary_tl` stores the nominal monthly salary. Unit is `hr_employees.salary_currency` (`'TL'` or `'USD'`). The `_tl` suffix on the column name is **misleading** — it's historical; the actual currency is the `salary_currency` field.

### 5.2 Insured employees (salary split)

An insured employee's salary is paid in **two pieces**:

1. **Bank deposit** — `bank_salary_tl` (defaults to `hr_settings.insured_bank_amount_tl`). This is the declared SGK amount. Hits register `NAKIT_TL` or `NAKIT_USD` depending on currency. Disbursed via `hr_bulk_payments` with `batch_type = 'bank_deposit'`.
2. **Cash remainder** — `salary_tl − bank_salary_tl`. Paid in cash. Hits same register.

Migration 102 added the split capability.

### 5.3 Supplement

Insurance gap top-up. If `receives_supplement = true`, pay `hr_settings.supplement_tl` (`4000` default) in the supplement currency (usually TL). Creates a **separate accounting entry** inside the same bulk payment ([useHrQuery.ts:1666–1687](../../src/hooks/queries/useHrQuery.ts#L1666-L1687)).

### 5.4 Deductions

Three types:

| Deduction | Formula |
|---|---|
| **Full-day absence** | `salary_tl / absence_full_day_divisor` per day (default: `salary / 30`) |
| **Half-day absence** | `salary_tl / absence_half_day_divisor` per day (default: `salary / 60`) |
| **Hourly absence** | `salary_tl / absence_hourly_divisor` per hour (default: `salary / 240`) |

**Flags:** `daily_deduction_enabled` and `hourly_deduction_enabled` in `hr_settings`. If false, the corresponding type is skipped regardless of attendance.

**Unpaid leave** is deducted separately (at the same divisors) and stored on `hr_salary_payments.unpaid_leave_deduction_tl`.

**Exemption:** if `hr_attendance.deduction_exempt = true` for a day, no deduction even if status is `absent`.

### 5.5 Prorated salary

Partial month (hire mid-month / exit mid-month): see [src/pages/hr/utils/proratedSalary.ts](../../src/pages/hr/utils/proratedSalary.ts). Pro-rates on working days within the month.

### 5.6 Net salary formula (simplified)

```
net = salary_tl
    − advance_tl
    − attendance_deduction_tl
    − unpaid_leave_deduction_tl
    − bank_deposit_tl                // for insured only, separated out
```

Salary's accounting entry amount = `net` (for non-insured) or `net` + separate bank_deposit entry.

---

## 6. Business rules

### 6.1 HR `role` is distinct from org `role`

Never conflate `hr_employees.role` (job title) with `organization_members.role` (RBAC role). An employee may not be an org member at all. An org member may not be an HR employee. The overlap is **only** by email string when both exist.

### 6.2 Auto-bonus fires at transfer-write, not at salary-payout

Marketing and Retention auto-bonuses are created by the Transfers mutation hook immediately — **not** aggregated at month end. This means the bonus payment appears the moment the transfer is saved. Payouts happen later via the Bonuses tab.

### 6.3 Auto-bonus is recomputed on transfer edit

If a transfer with `employee_id` set is edited, the existing auto-bonus is deleted and recomputed ([useTransfersQuery.ts:231–269](../../src/hooks/queries/useTransfersQuery.ts#L231-L269)). Don't rely on stable bonus IDs across transfer edits.

### 6.4 Bonus payments are USDT

Regardless of transfer currency or employee salary currency, `hr_bonus_payments.amount_usdt` is **always** USDT. The auto-bonus calculator uses `amount_usd` from the transfer — but the bonus is labeled USDT, not USD. See [features/transfers.md §4.4](./transfers.md#44-currency-semantics-tl-vs-usdt) for the USD-vs-USDT nuance.

### 6.5 Retention negative bonuses

Retention auto-bonus is **signed**: deposits earn positive bonus, withdrawals earn negative bonus (5.75% of `amount_usd`, sign flipped). Over a period this nets out naturally for revenue-share accounting.

### 6.6 Marketing auto-bonus is deposit-only

Marketing employees get bonus only on **deposit** transfers. Withdrawals produce zero bonus. See `calcAutoBonus` at [useTransfersQuery.ts:32–46](../../src/hooks/queries/useTransfersQuery.ts#L32-L46).

### 6.7 Active employee check for bonus attribution

When you attribute a transfer to an employee, the employee must be active. The bonus calculation doesn't validate this in code — **the frontend form should**. If an inactive employee is attributed, their bonus is still created. Clean up by deactivating *before* processing any late transfers attributed to them.

### 6.8 QR check-in first-scan-wins

First successful QR check-in of the day writes the row. Subsequent scans return "already checked in" with the existing `check_in` time. Managers can still manually override via Attendance tab (migration 136 comment confirms COALESCE logic).

### 6.9 Exit date hides employees

An employee with `exit_date IS NOT NULL AND exit_date < today` is treated as exited. They're filtered out of QR check-in lookups ([136:68–70](../../supabase/migrations/136_hr_qr_checkin.sql#L68-L70)). The Employees tab has a "show exited" toggle.

### 6.10 Salary currency determines register

`salary_currency = 'TL'` → hits `NAKIT_TL` register. `salary_currency = 'USD'` → hits `NAKIT_USD`. Same for supplement currency ([useHrQuery.ts:1604–1606, 1671](../../src/hooks/queries/useHrQuery.ts#L1604-L1606)).

---

## 7. Bonus system

### 7.1 Agreement types

From `hr_bonus_agreements.bonus_type`:

| Type | Meaning |
|---|---|
| `fixed` | A constant `fixed_amount` per `period` |
| `percentage` | `percentage_rate` × `percentage_base` where base is looked up by name (e.g. `'deposits'`, `'net'`) |
| `tier` | Tier-based via `tier_rules` JSONB |
| `variable` (migration 068) | No formula — amount is entered at payout time |

### 7.2 Manual vs auto bonus

- **Manual:** admin creates a `hr_bonus_payments` row directly via the Bonuses tab. `agreement_id` may or may not be set.
- **Auto:** Transfers mutation creates the row. `agreement_id = null`, `transfer_id = <id>`, `notes = 'Otomatik: Marketing' / 'Otomatik: Retention'`.

### 7.3 Pending vs paid

`status = 'pending'` (default) → not yet disbursed. `status = 'paid'` → paid out via a bulk payout or individual settlement. `paid_at` is set on transition.

---

## 8. Auto-bonus (Marketing & Retention)

Already documented in [transfers.md §9](./transfers.md#9-auto-bonus-integration-hr). Summary:

| Role | Condition | Formula | Notes |
|---|---|---|---|
| `Marketing` | Deposit only | Tier lookup from `hr_mt_config.deposit_tiers` against `|amount_usd|` | Always positive |
| `Retention` | Any transfer | `|amount_usd| × 0.0575` | Signed: positive for deposit, negative for withdrawal |

**Where the match happens:** by `hr_employees.role` string (`'Marketing'` or `'Retention'` exactly). Custom variants like `'Marketing Manager'` do **not** auto-bonus. If the org wants managers in the auto-bonus pool, either rename them or extend the match logic.

**Currency/format:** stored as `amount_usdt` (USDT, not USD). Employee salary currency is irrelevant to the bonus — bonus is always USDT.

**Source code:** [useTransfersQuery.ts:32–46](../../src/hooks/queries/useTransfersQuery.ts#L32-L46) (`calcAutoBonus`) + the mutation paths around it.

---

## 9. Barem — targets & failures

**Who:** Marketing role (configurable via `hr_settings.barem_roles`).

**What:**
- `hr_barem_targets` ([108](../../supabase/migrations/108_hr_barem_targets.sql)) — per-employee monthly target (count / volume / deposit threshold).
- `hr_mt_barem_failures` ([105](../../supabase/migrations/105_hr_mt_barem_failures.sql), [107](../../supabase/migrations/107_fix_barem_failures_rls.sql)) — records of missed targets.

**Why:** if an employee misses their target, a failure is recorded, which may reduce their auto-bonus rate the next period (policy detail — verify with business rules owner).

**Current impl status:** tables exist; failures are recorded; the *penalty effect on next-period bonus rate* is **not yet wired into `calcAutoBonus`** (as of 2026-04-24). Verify with code if implementing — this may be a gap.

---

## 10. Attendance & leaves

### 10.1 Daily flow

Every working day, each active employee gets (or should get) an `hr_attendance` row:

- Status: `on_time` / `late` / `absent` / `leave` (+ custom org values).
- `check_in` / `check_out` times.
- `absent_hours` if partial.
- `deduction_exempt` if excused.

### 10.2 Leave integration (migration 104)

When a leave is created, attendance rows for the date range are auto-filled:
- Status flipped to `'leave'`.
- `leave_id` set.
- `deduction_exempt = true` if `leave_type = 'paid'`, else `false` for unpaid.

### 10.3 Absence deductions

Only `absent` and `leave` (unpaid) rows trigger deductions, subject to `hr_settings.daily_deduction_enabled` / `hourly_deduction_enabled` flags. See [§5.4](#54-deductions).

### 10.4 Weekend behavior

If `hr_settings.weekend_off = true` (default since 079), weekends don't accrue absence. No attendance row is expected; missing rows are treated as off-days.

---

## 11. QR check-in

### 11.1 Flow

1. Admin generates a QR image from `/hr` → **QR Code** tab ([QrCodeTab.tsx](../../src/pages/hr/QrCodeTab.tsx)). The encoded URL is `<app>/checkin?token=<qr_token>`.
2. Employee scans the QR → taken to `/checkin` page.
3. Employee enters their email.
4. Frontend calls `hr_checkin_by_qr(p_token, p_email)` RPC.
5. Server:
   - Resolves `organization_id` + `timezone` + `standard_check_in` from `hr_settings` by `qr_token`.
   - Resolves `employee_id` by email, filtering out inactive or exited.
   - Computes current time in org TZ.
   - Determines status (`late` if past `standard_check_in`, else `on_time`).
   - UPSERT `hr_attendance` row for today — **COALESCE** on `check_in` so first scan wins.
6. Returns `{ ok: true, employee_name, check_in, status, already_checked_in }` or `{ ok: false, error }`.

### 11.2 RPC: `hr_checkin_by_qr(p_token uuid, p_email text, p_lat numeric, p_lng numeric) → jsonb`

Documented in [api/README.md §6.1](../api/README.md#61-hr_checkin_by_qrp_token-uuid-p_email-text--jsonb). Latest at [143_hr_checkin_geofence.sql](../../supabase/migrations/143_hr_checkin_geofence.sql) (migration 143). `p_lat` and `p_lng` are optional with `DEFAULT NULL`; older 2-arg callers still work because of the default values.

**Error codes returned:**
- `'invalid_input'` — token/email empty.
- `'invalid_token'` — no org found for token.
- `'employee_not_found'` — no active employee with that email in that org.
- `'gps_required'` — geofence is enabled but the client did not send GPS. Geofence guard runs **before** the employee lookup so we don't leak which emails exist to off-site attackers.
- `'out_of_range'` — GPS sent but distance exceeds `office_radius_meters`. Response includes `distance_meters` and `radius_meters` so the UI can tell the employee how far away they are.

### 11.3 Geofence (migration 143)

Optional GPS-based location verification. Off by default for existing orgs.

**Config (per-org, in `hr_settings`):**
- `geofence_enabled` (default `false`) — master switch
- `office_latitude`, `office_longitude` (NUMERIC(10,7), nullable) — office centroid in WGS84 decimal degrees
- `office_radius_meters` (default `200`, CHECK 1..100000) — allowed radius

**DB-level safeguard:** `chk_hr_settings_geofence_requires_coords` — `geofence_enabled` cannot be `true` without coordinates. The UI mirrors this by disabling the toggle.

**Forensic columns (on `hr_attendance`, captured even when geofence is disabled):**
- `check_in_lat`, `check_in_lng` — raw GPS reported by client
- `check_in_distance_meters` — computed distance from office centroid via `haversine_distance_m()` SQL helper

**RPC behavior:**
- If `geofence_enabled = false` → no enforcement; lat/lng (if present) are still recorded for forensic spot-checks.
- If `geofence_enabled = true` and lat/lng missing → return `'gps_required'`.
- If `geofence_enabled = true` and Haversine distance > `office_radius_meters` → return `'out_of_range'` with `distance_meters` for UX.
- Otherwise: normal first-scan-wins UPSERT, GPS columns also follow `COALESCE` (first scan's location wins).

**Closes vectors** documented in the security threat model:
- ✅ Leaked QR token (off-site attacker can't bypass geofence)
- ✅ Off-site / from-home check-in
- ✅ Most buddy check-ins (when buddy is not at the office)

**Does NOT close** (still open, see [§19](#19-known-gaps--open-questions)):
- Buddy check-in where both employees are at the office
- Check-out tracking (still admin-manual)
- GPS spoofing apps (raises bar but not bulletproof — selfie/biometric would close)

### 11.4 Public RPC note

`hr_checkin_by_qr` is callable **without authentication** — it's `SECURITY DEFINER` and only needs the QR token. This is intentional: employees don't log in to check in. The token acts as a capability.

**Implication:** anyone with the QR token can submit any email and attempt check-in. Non-existent emails return `'employee_not_found'`. Existing emails trigger a real INSERT — treat the QR token as a per-org secret (shown to employees, but not posted publicly on the internet). Geofence (§11.3) is the recommended hardening when token leakage is a concern.

### 11.5 Migrations timeline (QR)

| # | Fix |
|---|---|
| 136 | Initial implementation + `qr_token` column |
| 137 | Fix time casting bug (`time` vs `text`) |
| 138 | `absent_hours` numeric type fix |
| 139 | Return actual status in response (was always `'on_time'`) |
| 143 | Geofence: `office_latitude/longitude/radius_meters/geofence_enabled` on `hr_settings`; forensic GPS columns on `hr_attendance`; RPC accepts optional `p_lat/p_lng`; new error codes `gps_required` and `out_of_range`; `haversine_distance_m()` helper (2026-04-27) |

---

## 12. Bulk payments

Three `batch_type` variants in `hr_bulk_payments`:

### 12.1 `'salary'` — [Bulk Salary Payout](../../src/pages/hr/payments/BulkSalaryPayoutPage.tsx)

Payout for the month. Groups by currency → creates one bulk_payment per currency. Within each group:
1. Creates `hr_salary_payments` per employee (captures deduction breakdown).
2. Creates `hr_bulk_payments` parent row.
3. Creates `hr_bulk_payment_items` per employee.
4. Creates **one** `accounting_entries` row for the total → `register = NAKIT_TL` or `NAKIT_USD`.
5. If any employees have supplement, creates a **second** `accounting_entries` row for the supplement total.

Code reference: [useHrQuery.ts:1597–1688](../../src/hooks/queries/useHrQuery.ts#L1597-L1688).

### 12.2 `'bonus'` — [Bulk Bonus Payout](../../src/pages/hr/payments/BulkBonusPayoutPage.tsx)

Pay pending bonuses. Updates `hr_bonus_payments.paid_at` + `status = 'paid'`. Groups by currency (usually all USDT). Accounting register: `USDT`.

### 12.3 `'bank_deposit'` — [Bulk Bank Deposit](../../src/pages/hr/payments/BulkBankDepositPage.tsx)

The insured-salary bank-deposit portion. Separate bulk from the cash salary flow (sometimes bank deposits happen on a different day). Accounting register: `NAKIT_TL` or `NAKIT_USD` depending on currency.

---

## 13. HR settings

See [§3.8](#38-hr_settings) for fields. Operationally:

- Only **admins** can edit. RLS updated by migration 073 to include manager (but writes still require admin per `default_permission`).
- **Timezone** drives QR check-in local-time resolution. Changing it retroactively doesn't re-compute historical attendance.
- **`barem_roles`** is an array — adding a role here makes its employees subject to barem targets. No migration required.
- **QR token rotation:** to invalidate existing QR codes, regenerate `qr_token` (SQL update). No UI for this today — see [§19](#19-known-gaps--open-questions).

---

## 14. Employee documents

5 document types ([§3.2](#32-hr_employee_documents)). Stored in Supabase Storage bucket. Uploaded via the Documents dialog from the employee row.

**File size / type constraints:** enforced client-side. Server-side MIME type enforcement requires Storage bucket policies — audit current config.

---

## 15. Accounting integration

HR writes to Accounting in **two ways**:

### 15.1 Direct entry insertion (salary, supplement, bank deposit)

Mutation code in [useHrQuery.ts:1651+ / 1673+ / bank deposit paths](../../src/hooks/queries/useHrQuery.ts#L1651) inserts `accounting_entries` rows directly with:
- `entry_type = 'ODEME'`
- `direction = 'out'`
- `hr_bulk_payment_id = <parent bulk>`
- `register = 'NAKIT_TL' | 'NAKIT_USD' | 'USDT'`
- `payment_period = <period>`

No trigger does this — it's all in the mutation hook. **No `source_type` is set** (unlike IB / PSP). The `hr_bulk_payment_id` FK is the only link. This is an inconsistency — see [accounting.md §16](./accounting.md#16-known-gaps--open-questions).

### 15.2 Indirect via Transfers auto-bonus

Auto-bonus payments (`hr_bonus_payments`) are **not** yet written to accounting automatically — they're cash-due records. A separate "Bulk Bonus Payout" flow writes the accounting entry when the bonus is actually paid.

---

## 16. IB partner cross-refs

Two edges between HR and IB:

- `ib_partners.managed_by` → `hr_employees.id` (migration 126). Assigns an IB to an employee for attribution.
- `ib_partners.secondary_employee_id` → `hr_employees.id` (migration 128). Backup/secondary attribution.

**Auto-reassign on deactivation** (migration 133): `unassign_ib_partners_on_employee_deactivation()` trigger. When `hr_employees.is_active` flips from `true` to `false`, all IB partners with `managed_by = <this id>` have `managed_by` set to NULL. `secondary_employee_id` is **not** touched.

---

## 17. RLS & permissions

### 17.1 Who can do what

From [`private.default_permission`](../../supabase/migrations/120_accounting_overhaul.sql#L521-L526):

| Table | Admin | Manager | Operation | IK |
|---|---|---|---|---|
| `hr_employees` | CRUD | CRUD | **no access** | CRUD |
| `hr_employee_documents` | CRUD | CRUD | **no access** | CRUD |
| `hr_bonus_agreements` | CRUD | CRUD | **no access** | CRUD |
| `hr_bonus_payments` | CRUD | CRUD | **no access** | CRUD |
| `hr_attendance` | CRUD | CRUD | **no access** | CRUD |
| `hr_salary_payments` | CRUD | CRUD | **no access** | CRUD |
| `hr_settings` | CRUD | CRUD | **no access** | CRUD |
| `hr_leaves` | CRUD | CRUD | **no access** | CRUD |
| `hr_mt_config`, `hr_re_config` | CRUD | CRUD | **no access** | CRUD |
| `hr_bulk_payments`, `hr_bulk_payment_items` | CRUD (via `has_role_permission`) | CRUD | **no access** | CRUD |

### 17.2 Page access

`page:hr` → admin + ik only (not manager, not operation). See [120:450–452](../../supabase/migrations/120_accounting_overhaul.sql#L450-L452).

> **Quirk:** `hr_*` tables are writable by manager per `default_permission`, but the HR **page** is not visible to manager. A manager can hit HR tables via the AI Assistant or direct API — not via the UI.

### 17.3 QR check-in RLS

`hr_checkin_by_qr` is **unauthenticated** (SECURITY DEFINER). The RPC itself reads/writes `hr_settings`, `hr_employees`, `hr_attendance` bypassing RLS. The only access control is token validity + email match.

---

## 18. Migrations timeline

| # | File | Effect |
|---|---|---|
| *pre-repo* | (base HR schema) | `hr_employees`, `hr_salary_payments`, `hr_bonus_agreements`, `hr_bonus_payments`, `hr_attendance`, `hr_settings`, `hr_mt_config`, `hr_re_config`, `hr_employee_documents` created outside visible migrations |
| 068 | `068_add_variable_bonus_type.sql` | Added `variable` bonus type |
| 069b | `069b_bonus_payment_status.sql` | Added `status` field to `hr_bonus_payments` |
| 073 | `073_fix_hr_settings_rls_include_manager.sql` | Manager role can now read hr_settings |
| 075 | `075_add_hr_leaves.sql` | Created `hr_leaves` |
| 079 | `079_add_weekend_off_to_hr_settings.sql` | Added `weekend_off` to hr_settings |
| 102 | `102_add_insured_bank_salary_split.sql` | Added `bank_salary_tl` split for insured employees |
| 103 | `103_hr_bulk_payments.sql` | Created `hr_bulk_payments` + `hr_bulk_payment_items`; linked to accounting |
| 104 | `104_attendance_leave_integration.sql` | Leaves auto-fill attendance |
| 105 | `105_hr_mt_barem_failures.sql` | Created `hr_mt_barem_failures` |
| 106 | `106_hr_barem_roles_setting.sql` | Added `barem_roles` to hr_settings |
| 107 | `107_fix_barem_failures_rls.sql` | RLS fix |
| 108 | `108_hr_barem_targets.sql` | Created `hr_barem_targets` |
| 109 | `109_hr_employee_exit_date.sql` | Added `exit_date` to `hr_employees` |
| 128 | `128_ib_partner_secondary_employee.sql` | IB → secondary employee link (cross-domain) |
| 133 | `133_ib_auto_reassign_on_employee_deactivation.sql` | Trigger to null IB `managed_by` |
| 136 | `136_hr_qr_checkin.sql` | QR check-in: `qr_token` + `hr_checkin_by_qr` RPC |
| 137 | `137_fix_hr_checkin_time_cast.sql` | Time cast bug |
| 138 | `138_absent_hours_numeric.sql` | `absent_hours` numeric fix |
| 139 | `139_hr_checkin_return_actual_status.sql` | Return actual status in RPC response |

---

## 19. Known gaps / open questions

- **Base HR tables aren't in the migrations folder.** `hr_employees`, `hr_salary_payments`, `hr_bonus_agreements`, `hr_bonus_payments`, `hr_attendance`, `hr_settings`, `hr_mt_config`, `hr_re_config`, `hr_employee_documents` have no visible `CREATE TABLE` statements. Recovering to a fresh Supabase project requires the tables to exist first — consider adding a `008b_hr_base.sql` migration that backfills `CREATE TABLE IF NOT EXISTS` for all HR tables based on their current production shape.
- **Retention rate is hardcoded at 5.75%.** `hr_re_config.rate_tiers` is read from the DB but the auto-bonus code hardcodes `RE_BONUS_RATE = 0.0575` ([useTransfersQuery.ts:26](../../src/hooks/queries/useTransfersQuery.ts#L26)). Wire the config through or drop the table.
- **Barem penalty on auto-bonus not wired.** `hr_mt_barem_failures` records failures but `calcAutoBonus` doesn't read them. If the business policy is "failed barem → reduced bonus rate," this is still missing.
- **`hr_*` tables have no `source_type` on auto-written accounting entries.** Inconsistent with IB / PSP auto-entries (which set `source_type`). Normalize.
- **No audit log for HR.** Salary edits, bonus deletions, role changes on employees — none are logged. Transfer audit log captures transfers; HR has nothing equivalent. If HR data is ever disputed, there's no trace.
- **QR token rotation has no UI.** Admins must SQL-update `hr_settings.qr_token` to invalidate existing QR codes. Add a "Regenerate QR" button.
- **Role matching is exact-string for auto-bonus.** `'Marketing'` triggers bonus; `'Marketing Manager'` does not. Intentional or oversight? Clarify with business.
- **No employee → user linking.** An HR employee with an email matching an `auth.users.email` is not automatically linked as an org member or vice versa. QR check-in uses email as a matching key (to the employee), but that's it. If the business wants unified identity, add a link.
- **Deductions for partial hours assume a continuous workday.** Someone checking out at 14:00 for a 2-hour errand isn't modeled — `absent_hours` is a single number per day.
- **Exit date processing is passive.** Setting `exit_date` hides the employee but doesn't cancel pending bonuses or auto-reassign scheduled salary payments. The active/exit_date check is the only gate.
- **`salary_tl` column name is a lie** when `salary_currency = 'USD'`. Rename to `salary_amount` next chance, or at minimum document loudly.
- **Bulk payment description strings are hardcoded Turkish.** (`'Toplu Maaş Ödemesi — …'`, `'Toplu Sigorta Elden Ödeme — …'`). Move to i18n if the app ever targets non-TR orgs.
- **No cascade on employee delete.** `hr_employees` deletion (rare) cascades to attendance / leaves / bonuses via FK. Bulk payment items reference employee — if deleted, the `hr_bulk_payment_items.employee_id` FK has no `ON DELETE` → audit before deleting an employee.
- **`hr_mt_barem_failures.organization_id` RLS** had a fix in 107; verify no other barem tables have the same issue.
