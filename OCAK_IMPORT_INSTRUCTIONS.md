# OCAK CSV Import Instructions

## Overview
Successfully generated migration to import **791 transfers** from ocak.csv into the transfers system.

### Statistics:
- **791 transfers** (January 2026 data)
- **2 payment methods** (BANKA, Tether)
- **2 categories** (YATIRIM, ÇEKME)
- **7 PSPs** (TETHER, #72 CRYPPAY 10, #70 CRYPPAY, 70 BLOKE, 72 BLOKE, FSK, #72 CRYPPAY)
- **3 transfer types** (MÜŞTERİ, BLOKE HESAP, ÖDEME)

## Prerequisites

⚠️ **IMPORTANT**: Make sure the **ORDERINVEST** organization exists in your database before running the migration!

## Option 1: Using Supabase CLI (Recommended)

### Step 1: Login to Supabase
```bash
npx supabase login
```

### Step 2: Link your project (if not already linked)
```bash
npx supabase link --project-ref your-project-ref
```

### Step 3: Push the migration
```bash
npx supabase db push
```

This will apply the migration `026_import_ocak_csv.sql` to your remote database.

## Option 2: Using Supabase SQL Editor (Alternative)

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Go to **SQL Editor**
3. Open the file: `supabase/migrations/026_import_ocak_csv.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run**

## Option 3: Using Direct Database Connection

If you have the database connection string:

```bash
npx supabase db push --db-url "your-postgres-connection-string"
```

## Verification

After running the migration, verify the import:

### Check if data was imported:
```sql
-- Check transfer count for ORDERINVEST
SELECT COUNT(*) as transfer_count
FROM public.transfers t
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST';
-- Should return: 791

-- Check date range
SELECT 
  MIN(transfer_date) as first_transfer,
  MAX(transfer_date) as last_transfer
FROM public.transfers t
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST';
-- Should show: 2026-01-01 to 2026-01-31

-- Check currency breakdown
SELECT 
  currency,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM public.transfers t
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST'
GROUP BY currency;
```

### Check lookups were created:
```sql
-- Check payment methods
SELECT * FROM public.payment_methods 
WHERE organization_id = (SELECT id FROM public.organizations WHERE name = 'ORDERINVEST');

-- Check categories
SELECT * FROM public.transfer_categories 
WHERE organization_id = (SELECT id FROM public.organizations WHERE name = 'ORDERINVEST');

-- Check PSPs
SELECT * FROM public.psps 
WHERE organization_id = (SELECT id FROM public.organizations WHERE name = 'ORDERINVEST');

-- Check transfer types
SELECT * FROM public.transfer_types 
WHERE organization_id = (SELECT id FROM public.organizations WHERE name = 'ORDERINVEST');
```

## Troubleshooting

### "ORDERINVEST organization not found"
The migration will fail if the organization doesn't exist. Create it first:

```sql
INSERT INTO public.organizations (name, display_name)
VALUES ('ORDERINVEST', 'Order Invest')
RETURNING id, name;
```

### Character encoding issues
If you see garbled Turkish characters, make sure your database client is set to UTF-8 encoding.

### Migration already applied
If you need to re-run the migration:

1. The migration uses `ON CONFLICT DO NOTHING` for lookups, so it's safe to re-run
2. For transfers, you may need to delete existing data first:

```sql
-- Delete transfers for ORDERINVEST (BE CAREFUL!)
DELETE FROM public.transfers
WHERE organization_id = (SELECT id FROM public.organizations WHERE name = 'ORDERINVEST');
```

## Exchange Rates (Optional but Recommended)

After importing transfers, you should also apply the exchange rate migrations:

### Step 1: Insert manual exchange rates for January 2026
```bash
npx supabase db push
```

This applies migration `027_manual_exchange_rates_january.sql` which inserts:
- Jan 1-5: 43.05 TL/USD (5 days)
- Jan 6-14: 43.20 TL/USD (9 days)
- Jan 15: 43.30 TL/USD (1 day)
- Jan 16-31: 43.40 TL/USD (16 days)

### Step 2: Update transfers with exchange rates
The migration `028_update_transfers_with_exchange_rates.sql` will:
- Apply the correct exchange rate to each USD transfer based on its date
- Calculate `amount_base` (TL equivalent) for all transfers
- Update TL transfers with 1:1 rate

This is applied automatically when you run `npx supabase db push`.

## Files Generated

- **Migration 026**: `supabase/migrations/026_import_ocak_csv.sql` - Import transfers
- **Migration 027**: `supabase/migrations/027_manual_exchange_rates_january.sql` - Exchange rates
- **Migration 028**: `supabase/migrations/028_update_transfers_with_exchange_rates.sql` - Apply rates to transfers
- **Generator Script**: `scripts/generate-ocak-import.ts`
- **Source CSV**: `ocak.csv`

## Need to Re-generate?

If you need to modify and re-generate the transfer import migration:

```bash
npx tsx scripts/generate-ocak-import.ts
```

This will regenerate `026_import_ocak_csv.sql` from `ocak.csv`.
