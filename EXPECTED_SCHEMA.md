# Expected Schema Based on Migrations

## What SHOULD Exist After Running Migrations 001-038

### Core Tables

#### 1. **organizations**
```sql
- id: uuid (PK)
- name: text (unique)
- created_at: timestamptz
- updated_at: timestamptz
```

#### 2. **profiles**
```sql
- id: uuid (PK, FK to auth.users)
- system_role: text ('god' | 'user')
- created_at: timestamptz
- updated_at: timestamptz
```

#### 3. **organization_members**
```sql
- id: uuid (PK)
- organization_id: uuid (FK)
- user_id: uuid (FK to auth.users)
- role: text ('admin' | 'operation')
- created_at: timestamptz
- updated_at: timestamptz
UNIQUE(organization_id, user_id)
```

#### 4. **organization_invitations**
```sql
- id: uuid (PK)
- organization_id: uuid (FK)
- email: text
- role: text
- invited_by: uuid (FK to auth.users)
- created_at: timestamptz
```

### Lookup Tables (Multi-Tenant)

#### 5. **psps** (Payment Service Providers)
```sql
- id: uuid (PK)
- organization_id: uuid (FK) ✅ REQUIRED
- name: text
- commission_rate: numeric(5,4)
- is_active: boolean (default true)
- is_internal: boolean (default false) -- Added in 038
- created_at: timestamptz
- updated_at: timestamptz
UNIQUE(organization_id, name)
```

#### 6. **psp_commission_rates** (Rate History)
```sql
- id: uuid (PK)
- psp_id: uuid (FK to psps)
- organization_id: uuid (FK)
- commission_rate: numeric(5,4)
- effective_from: date
- created_by: uuid (FK to auth.users)
- created_at: timestamptz
UNIQUE(psp_id, effective_from)
```

#### 7. **psp_settlements** (Tahsilatlar)
```sql
- id: uuid (PK)
- psp_id: uuid (FK to psps)
- organization_id: uuid (FK)
- settlement_date: date
- amount: numeric(15,2)
- currency: text ('TL' | 'USD')
- notes: text
- created_by: uuid (FK to auth.users)
- created_at: timestamptz
- updated_at: timestamptz
```

#### 8. **transfer_types**
```sql
- id: uuid (PK)
- organization_id: uuid (FK) ✅ REQUIRED
- name: text
- is_active: boolean (default true)
- aliases: text[] (default '{}') -- Added in 037
- created_at: timestamptz
- updated_at: timestamptz
UNIQUE(organization_id, name)
```

#### 9. **transfer_categories**
```sql
- id: uuid (PK)
- organization_id: uuid (FK) ✅ REQUIRED
- name: text
- is_deposit: boolean
- is_active: boolean (default true)
- aliases: text[] (default '{}') -- Added in 037
- created_at: timestamptz
- updated_at: timestamptz
UNIQUE(organization_id, name)
```

#### 10. **payment_methods**
```sql
- id: uuid (PK)
- organization_id: uuid (FK) ✅ REQUIRED
- name: text
- is_active: boolean (default true)
- aliases: text[] (default '{}') -- Added in 037
- created_at: timestamptz
- updated_at: timestamptz
UNIQUE(organization_id, name)
```

### Transaction Tables

#### 11. **transfers**
```sql
- id: uuid (PK)
- organization_id: uuid (FK) ✅ REQUIRED
- full_name: text
- payment_method_id: uuid (FK)
- transfer_date: timestamptz
- category_id: uuid (FK to transfer_categories)
- amount: numeric(15,2)
- commission: numeric(15,2) ✅ REQUIRED for PSP summary
- net: numeric(15,2) ✅ REQUIRED for PSP summary
- currency: text ('TL' | 'USD')
- psp_id: uuid (FK to psps) -- nullable after migration 025
- type_id: uuid (FK to transfer_types)
- crm_id: text
- meta_id: text
- commission_rate_snapshot: numeric(5,4) -- Added in 016
- created_by: uuid (FK to auth.users)
- created_at: timestamptz
- updated_at: timestamptz
```

### Critical RPC Functions

#### **get_psp_summary(_org_id uuid)**
Created in: 035, Updated in: 036, 038
```sql
Returns:
- psp_id: uuid
- psp_name: text
- commission_rate: numeric
- is_active: boolean
- is_internal: boolean (added in 038)
- total_deposits: numeric
- total_withdrawals: numeric
- total_commission: numeric ✅ Uses tr.commission column
- total_net: numeric ✅ Uses tr.net column
- total_settlements: numeric
- last_settlement_date: date
```

#### **calculate_transfer_commission()**
Trigger function that auto-calculates commission and net on INSERT/UPDATE
```sql
- Reads commission_rate_snapshot or PSP's commission_rate
- Calculates: commission = amount * rate
- Calculates: net = amount - commission
```

### Critical Triggers

1. **on_psp_rate_inserted** - Syncs psps.commission_rate when rate history changes
2. **calculate_commission_trigger** - Auto-calculates transfer commission/net
3. **on_transfer_updated** - Updates updated_at timestamp

---

## Common Issues and Why They Happen

### Issue 1: "column tr.commission does not exist"
**Cause:** The `transfers` table is missing `commission` and `net` columns
**Fix:** Run `add-commission-net-columns.sql` BEFORE migration 035

### Issue 2: "column organization_id does not exist in transfer_types"
**Cause:** Lookup tables were created without multi-tenancy support
**Fix:** Either:
- Re-run migration 008 properly, OR
- Run a schema fix that adds organization_id to lookup tables

### Issue 3: "RPC function get_psp_summary not found (404)"
**Cause:** Migrations 035-038 haven't been run
**Fix:** Run migrations 035, 036, 037, 038 in order

### Issue 4: "Policy violation" when inserting PSPs
**Cause:** Either RLS policies missing or JWT hook not enabled
**Fix:** Check Auth Hooks in Supabase Dashboard

---

## Migration Order

**Base Schema (Required First):**
1. 001-007: Organizations, profiles, members, invitations, RLS helpers
2. 008: Lookup tables (psps, transfer_types, categories, payment_methods) + transfers table
3. 009-015: Additional features, accounting, etc.

**PSP Rate History & Settlements:**
4. 016: psp_commission_rates table + triggers
5. Add commission/net columns (if missing): `add-commission-net-columns.sql`
6. 035: psp_settlements + get_psp_summary RPC
7. 036: Update get_psp_summary to exclude blocked
8. 037: Add aliases, cleanup data
9. 038: Add is_internal flag to PSPs

**Key Dependency:**
- Migration 035 (get_psp_summary) REQUIRES transfers.commission and transfers.net columns
- Migration 037 REQUIRES organization_id in all lookup tables
