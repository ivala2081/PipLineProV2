# Transfer Import Guide for ORDERINVEST

This guide explains how to import 1,147 transfers from January and February 2026 CSV data into the ORDERINVEST organization with full PSP (Payment Service Provider) tracking.

## 📋 Overview

- **Total Transfers**: 1,147 records
- **Date Range**: January 1 - February 28, 2026
- **Organization**: ORDERINVEST
- **PSPs**: 7 unique payment service providers
- **Categories**: 900 deposits (dep) + 247 withdrawals (wd)
- **Currencies**: 796 TL + 351 USD

## 🚀 Import Process

### Step 1: Run PSP Migration

Open Supabase SQL Editor and run:
```
supabase/migrations/046_add_psps_to_transfers.sql
```

This migration will:
- Create the `psps` table with RLS policies
- Add `psp_id` column to the `transfers` table
- Insert 7 PSP records for ORDERINVEST with 1% commission rate
- Create necessary indexes

**Expected Output:**
```
✅ PSPs Created | total_psps: 7 | psp_names: #70 CRYPPAY, #72 CRYPPAY, #72 CRYPPAY 10, 70 BLOKE, 72 BLOKE, FSK, TETHER
```

### Step 2: Run Transfer Import

Open Supabase SQL Editor and run:
```
insert-transfers-orderinvest.sql
```

This will:
- Import all 1,147 transfers for ORDERINVEST organization
- Map each transfer to its corresponding PSP
- Calculate TRY and USD amounts using exchange rates

**Expected Output:**
```
✅ Import Complete
total_transfers: 1147
deposits: 900
withdrawals: 247
tl_count: 796
usd_count: 351
unique_psps_used: 7
total_try: [calculated sum]
total_usd: [calculated sum]
```

## 📊 PSP Details

| PSP Name | Commission Rate | Status |
|----------|----------------|--------|
| #70 CRYPPAY | 1% | Active |
| #72 CRYPPAY | 1% | Active |
| #72 CRYPPAY 10 | 1% | Active |
| 70 BLOKE | 1% | Active |
| 72 BLOKE | 1% | Active |
| FSK | 1% | Active |
| TETHER | 1% | Active |

## 🔍 Data Mapping

The import script maps CSV columns to database fields as follows:

| CSV Column | Field | Notes |
|------------|-------|-------|
| 0 | crm_id | Customer CRM ID |
| 1 | meta_id | Meta transaction ID |
| 2 | full_name | Customer full name |
| 4 | payment_method_id | BANKA→bank, IBAN→bank, Tether→tether |
| 6 | transfer_date | DD.MM.YYYY → YYYY-MM-DD |
| 7 | category_id | YATIRIM→dep, ÇEKME→wd |
| 8 | amount | Turkish decimal format (1.000,00 → 1000.00) |
| 11 | currency | TL or USD |
| 12 | psp_id | Mapped from KASA column (PSP name) |
| 13 | type_id | MÜŞTERİ→client, ÖDEME→payment, BLOKE→blocked |
| 16 | exchange_rate | Carry-forward logic for empty values |

## ⚠️ Important Notes

1. **Run migrations in order**: 046 must run before insert SQL
2. **Organization must exist**: ORDERINVEST organization must exist in the database
3. **Lookups required**: transfer_categories, payment_methods, and transfer_types must be populated
4. **Exchange rates**: Empty rate values use the previous row's rate (carry-forward)
5. **Amounts**: All amounts are stored as positive values (withdrawals are NOT negative)

## 🔄 Optional: Clear Existing Data

If you need to clear existing transfers for ORDERINVEST before importing:

```sql
DELETE FROM public.transfers
WHERE organization_id = (
  SELECT id FROM public.organizations WHERE name = 'ORDERINVEST'
);
```

## ✅ Verification Queries

### Check PSPs
```sql
SELECT * FROM public.psps
WHERE organization_id = (
  SELECT id FROM public.organizations WHERE name = 'ORDERINVEST'
)
ORDER BY name;
```

### Check Transfers by PSP
```sql
SELECT
  p.name as psp_name,
  COUNT(*) as transfer_count,
  SUM(CASE WHEN t.category_id = 'dep' THEN 1 ELSE 0 END) as deposits,
  SUM(CASE WHEN t.category_id = 'wd' THEN 1 ELSE 0 END) as withdrawals,
  ROUND(SUM(t.amount_try), 2) as total_try,
  ROUND(SUM(t.amount_usd), 2) as total_usd
FROM public.transfers t
LEFT JOIN public.psps p ON t.psp_id = p.id
WHERE t.organization_id = (
  SELECT id FROM public.organizations WHERE name = 'ORDERINVEST'
)
GROUP BY p.name
ORDER BY p.name;
```

## 📝 Files Generated

1. **046_add_psps_to_transfers.sql** - Migration to add PSP functionality
2. **insert-transfers-orderinvest.sql** - 1,147 transfer INSERT statements with PSP mapping
3. **psp-names.txt** - List of 7 unique PSP names extracted from CSV
4. **import-transfers-clean.cjs** - Node.js script that generated the SQL

## 🎯 Next Steps After Import

1. Verify import using the verification queries above
2. Update the Transfer form/dialog UI to include PSP selection dropdown
3. Add PSP column to the Transfers table display
4. Test creating new transfers with PSP selection
