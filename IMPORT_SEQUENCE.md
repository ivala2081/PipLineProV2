# OCAK CSV Import Sequence

## Complete Import Process

Follow these steps in order to import OCAK CSV data with exchange rates:

### Step 1: Remove Existing Data (Migration 029)
```bash
# Apply via Supabase CLI
npx supabase db push
```

Or via SQL Editor - run: `supabase/migrations/029_remove_all_transfers.sql`

**What it does:**
- Deletes all transfers for ORDERINVEST
- Clears lookup data (PSPs, payment methods, categories, types, exchange rates)

---

### Step 2: Import Transfers (Migration 026)
**What it does:**
- Imports 791 transfers from ocak.csv
- Creates lookup data (2 payment methods, 2 categories, 7 PSPs, 3 transfer types)

The migration is already generated. Just continue with `npx supabase db push` or run via SQL Editor.

---

### Step 3: Add Exchange Rates (Migration 027)
**What it does:**
- Inserts 31 daily exchange rates for January 2026:
  - Jan 1-5: 43.05 TL/USD
  - Jan 6-14: 43.20 TL/USD
  - Jan 15: 43.30 TL/USD
  - Jan 16-31: 43.40 TL/USD

Continue with `npx supabase db push` or run via SQL Editor.

---

### Step 4: Apply Exchange Rates to Transfers (Migration 028)
**What it does:**
- Adds `exchange_rate` and `amount_base` columns if missing
- Updates USD transfers with daily exchange rates
- Calculates TL equivalent amounts
- Updates TL transfers with 1:1 rate

Continue with `npx supabase db push` or run via SQL Editor.

---

## Quick Apply (All at Once)

If you're using Supabase CLI and all migrations are ready:

```bash
npx supabase db push
```

This will apply all pending migrations in order:
- 029: Clear data
- 026: Import transfers
- 027: Add exchange rates
- 028: Apply rates to transfers

---

## Verification Queries

After import, verify the data:

```sql
-- Check transfer count
SELECT COUNT(*) as total_transfers
FROM public.transfers t
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST';
-- Expected: 791

-- Check currency breakdown with exchange rates
SELECT 
  currency,
  COUNT(*) as count,
  MIN(exchange_rate) as min_rate,
  MAX(exchange_rate) as max_rate,
  SUM(amount) as total_amount,
  SUM(amount_base) as total_amount_tl
FROM public.transfers t
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST'
GROUP BY currency;

-- Check exchange rates
SELECT 
  rate_date,
  rate_to_tl,
  source
FROM public.exchange_rates
WHERE organization_id = (SELECT id FROM public.organizations WHERE name = 'ORDERINVEST')
ORDER BY rate_date;
-- Expected: 31 rows
```

---

## Status

All migrations are ready:
- ✅ 029_remove_all_transfers.sql
- ✅ 026_import_ocak_csv.sql (791 transfers)
- ✅ 027_manual_exchange_rates_january.sql (31 daily rates)
- ✅ 028_update_transfers_with_exchange_rates.sql (apply rates)
