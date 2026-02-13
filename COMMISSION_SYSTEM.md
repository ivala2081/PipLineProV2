# Commission System Explained

## 🎯 How Commissions Work

### Design Philosophy

**Commissions are ONLY charged on DEPOSITS (YATIRIM)**

- ✅ **Deposits (YATIRIM)**: Commission = amount × PSP rate
- ❌ **Withdrawals (ÇEKME)**: Commission = 0 (no fee)

This matches the business logic in `src/hooks/useTransfers.ts` lines 94-96.

---

## 📊 Commission Calculation

### For Deposits (YATIRIM):
```
Amount:      1000.00 USD
PSP Rate:    1% (0.01)
Commission:  1000 × 0.01 = 10.00 USD
Net:         1000 - 10 = 990.00 USD
```

### For Withdrawals (ÇEKME):
```
Amount:      -1000.00 USD
Commission:  0.00 USD (always 0)
Net:         -1000.00 USD (same as amount)
```

---

## 🔄 When PSP Rates Change

**Problem:** When you change PSP commission rates in settings, existing transfers keep their old commission values.

**Why?** This is intentional for audit purposes:
- The `commission_rate_snapshot` column stores the rate used at the time of transfer
- This creates an audit trail and preserves historical accuracy

**Solution:** Use the recalculation function to update existing transfers with new rates.

---

## 🛠️ How to Recalculate Commissions

### Option 1: Run the SQL Function

After changing PSP rates, run this query in Supabase SQL Editor:

```sql
select * from public.recalculate_commissions_by_name('ORDERINVEST');
```

**Returns:**
- `updated_count`: Number of deposit transfers updated
- `total_commission`: Total commission across all transfers

### Option 2: Use the Helper Script

Run `recalculate_commissions.sql` in Supabase SQL Editor.

### Option 3: Apply Migration 031

```bash
npx supabase db push
```

This applies migration 031 which:
1. Creates the recalculation functions
2. Automatically recalculates for ORDERINVEST

---

## 📁 Files

### Migrations
- `030_calculate_commissions.sql` - Initial commission calculation (fixed logic)
- `031_recalculate_commissions_function.sql` - Creates reusable recalculation functions

### Scripts
- `recalculate_commissions.sql` - Quick script to recalculate manually

### Source Code
- `src/hooks/useTransfers.ts` - Commission calculation logic (lines 94-96)

---

## ✅ Verification Queries

### Check current commissions:
```sql
SELECT 
  tc.name as category,
  tc.is_deposit,
  COUNT(*) as count,
  SUM(t.commission) as total_commission,
  AVG(t.commission) as avg_commission
FROM public.transfers t
JOIN public.transfer_categories tc ON t.category_id = tc.id
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST'
GROUP BY tc.name, tc.is_deposit;
```

### Check PSP rates vs transfer rates:
```sql
SELECT 
  p.name as psp,
  p.commission_rate as current_psp_rate,
  COUNT(*) as transfer_count,
  MIN(t.commission_rate_snapshot) as min_snapshot_rate,
  MAX(t.commission_rate_snapshot) as max_snapshot_rate,
  SUM(t.commission) as total_commission
FROM public.transfers t
JOIN public.psps p ON t.psp_id = p.id
JOIN public.organizations o ON t.organization_id = o.id
WHERE o.name = 'ORDERINVEST'
GROUP BY p.name, p.commission_rate;
```

This shows if any transfers have different rates than the current PSP rates.

---

## 🎓 Summary

1. **Commissions only apply to deposits** (not withdrawals)
2. **Commission = amount × PSP rate** for deposits
3. **Changing PSP rates doesn't auto-update** existing transfers
4. **Use the recalculation function** after changing PSP rates
5. **commission_rate_snapshot** preserves the historical rate used

---

## 🚀 Next Steps

1. Apply migration 031: `npx supabase db push`
2. Check your commissions are now calculated correctly
3. Whenever you change PSP rates, run the recalculation function
4. Verify with the queries above
