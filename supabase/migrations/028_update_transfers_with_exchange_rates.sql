-- ============================================================================
-- 028: Update transfers with exchange rates and calculate amount_try/amount_usd
-- ============================================================================

do $$
declare
  v_org_id uuid;
  v_updated_count integer := 0;
  v_currency text;
  v_count bigint;
  v_min_rate numeric;
  v_max_rate numeric;
  v_total_amount numeric;
  v_total_try numeric;
  v_total_usd numeric;
begin
  -- Get ORDERINVEST organization ID
  select id into v_org_id
  from public.organizations
  where name = 'ORDERINVEST'
  limit 1;

  if v_org_id is null then
    raise exception 'ORDERINVEST organization not found. Please create it first.';
  end if;

  raise notice 'Using organization: %', v_org_id;

  -- ============================================================================
  -- Update USD transfers with exchange rates and calculate TL equivalent
  -- ============================================================================
  
  -- Update USD transfers with the corresponding daily exchange rate
  update public.transfers t
  set 
    exchange_rate = er.rate_to_tl,
    amount_try = round(t.amount * er.rate_to_tl, 2),
    amount_usd = t.amount
  from public.exchange_rates er
  where t.organization_id = v_org_id
    and t.currency = 'USD'
    and er.organization_id = v_org_id
    and er.currency = 'USD'
    and date(t.transfer_date) = er.rate_date;

  get diagnostics v_updated_count = row_count;
  
  raise notice 'Updated % USD transfers with exchange rates', v_updated_count;

  -- ============================================================================
  -- Update TL transfers (exchange rate = 1, amount_try = amount, amount_usd = 0)
  -- ============================================================================
  
  update public.transfers t
  set 
    exchange_rate = 1,
    amount_try = t.amount,
    amount_usd = 0
  where t.organization_id = v_org_id
    and t.currency = 'TL'
    and (t.exchange_rate != 1 or t.amount_try != t.amount or t.amount_usd != 0);

  get diagnostics v_updated_count = row_count;
  
  raise notice 'Updated % TL transfers (1:1 rate)', v_updated_count;

  -- ============================================================================
  -- Show summary statistics
  -- ============================================================================
  
  raise notice '--- Exchange Rate Summary ---';
  
  -- Show currency breakdown
  for v_currency, v_count, v_min_rate, v_max_rate, v_total_amount, v_total_try, v_total_usd in (
    select 
      t.currency::text,
      count(*),
      min(t.exchange_rate),
      max(t.exchange_rate),
      sum(t.amount),
      sum(t.amount_try),
      sum(t.amount_usd)
    from public.transfers t
    where t.organization_id = v_org_id
    group by t.currency
  ) loop
    raise notice 'Currency: %, Count: %, Rate Range: %-%, Total Amount: %, Total TRY: %, Total USD: %', 
      v_currency, v_count, v_min_rate, v_max_rate, v_total_amount, v_total_try, v_total_usd;
  end loop;

end $$;
