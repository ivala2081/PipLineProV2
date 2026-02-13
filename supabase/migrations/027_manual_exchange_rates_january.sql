-- ============================================================================
-- 027: Manual Exchange Rates for January 2026 (USD to TL)
-- ============================================================================

do $$
declare
  v_org_id uuid;
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
  -- Insert Manual Exchange Rates for January 2026
  -- ============================================================================
  
  -- January 1-5: 43.05 TL per USD
  insert into public.exchange_rates (organization_id, currency, rate_to_tl, rate_date, source)
  values 
    (v_org_id, 'USD', 43.05, '2026-01-01'::date, 'manual'),
    (v_org_id, 'USD', 43.05, '2026-01-02'::date, 'manual'),
    (v_org_id, 'USD', 43.05, '2026-01-03'::date, 'manual'),
    (v_org_id, 'USD', 43.05, '2026-01-04'::date, 'manual'),
    (v_org_id, 'USD', 43.05, '2026-01-05'::date, 'manual'),
    
    -- January 6-14: 43.20 TL per USD
    (v_org_id, 'USD', 43.20, '2026-01-06'::date, 'manual'),
    (v_org_id, 'USD', 43.20, '2026-01-07'::date, 'manual'),
    (v_org_id, 'USD', 43.20, '2026-01-08'::date, 'manual'),
    (v_org_id, 'USD', 43.20, '2026-01-09'::date, 'manual'),
    (v_org_id, 'USD', 43.20, '2026-01-10'::date, 'manual'),
    (v_org_id, 'USD', 43.20, '2026-01-11'::date, 'manual'),
    (v_org_id, 'USD', 43.20, '2026-01-12'::date, 'manual'),
    (v_org_id, 'USD', 43.20, '2026-01-13'::date, 'manual'),
    (v_org_id, 'USD', 43.20, '2026-01-14'::date, 'manual'),
    
    -- January 15: 43.30 TL per USD
    (v_org_id, 'USD', 43.30, '2026-01-15'::date, 'manual'),
    
    -- January 16-31: 43.40 TL per USD
    (v_org_id, 'USD', 43.40, '2026-01-16'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-17'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-18'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-19'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-20'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-21'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-22'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-23'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-24'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-25'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-26'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-27'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-28'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-29'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-30'::date, 'manual'),
    (v_org_id, 'USD', 43.40, '2026-01-31'::date, 'manual')
  on conflict (organization_id, currency, rate_date) 
  do update set 
    rate_to_tl = excluded.rate_to_tl,
    source = excluded.source;

  raise notice 'Successfully inserted 31 manual exchange rates for January 2026';
  
  -- Show summary
  raise notice 'Summary:';
  raise notice '  Jan 1-5:   43.05 TL/USD (5 days)';
  raise notice '  Jan 6-14:  43.20 TL/USD (9 days)';
  raise notice '  Jan 15:    43.30 TL/USD (1 day)';
  raise notice '  Jan 16-31: 43.40 TL/USD (16 days)';

end $$;
