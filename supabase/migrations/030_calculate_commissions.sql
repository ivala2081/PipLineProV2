-- ============================================================================
-- 030: Calculate commissions based on PSP rates
-- ============================================================================

do $$
declare
  v_org_id uuid;
  v_updated_count integer := 0;
begin
  -- Get ORDERINVEST organization ID
  select id into v_org_id
  from public.organizations
  where name = 'ORDERINVEST'
  limit 1;

  if v_org_id is null then
    raise exception 'ORDERINVEST organization not found.';
  end if;

  raise notice 'Using organization: %', v_org_id;

  -- ============================================================================
  -- Calculate commissions based on PSP commission rates
  -- ============================================================================
  
  -- IMPORTANT: Commission is ONLY charged on DEPOSITS (YATIRIM)
  -- Withdrawals (ÇEKME) have commission = 0 by design
  
  -- For DEPOSIT transactions (YATIRIM):
  -- Commission = amount * psp.commission_rate
  -- Net = amount - commission
  
  update public.transfers t
  set 
    commission = round(t.amount * p.commission_rate, 2),
    net = t.amount - round(t.amount * p.commission_rate, 2),
    commission_rate_snapshot = p.commission_rate
  from public.psps p,
       public.transfer_categories tc
  where t.organization_id = v_org_id
    and t.psp_id = p.id
    and t.category_id = tc.id
    and tc.is_deposit = true;  -- Only for deposits (YATIRIM)

  get diagnostics v_updated_count = row_count;
  raise notice 'Updated % deposit transfers with commissions', v_updated_count;

  -- For WITHDRAWAL transactions (ÇEKME):
  -- Commission = 0 (withdrawals don't have commission fees)
  -- Net = amount
  
  update public.transfers t
  set 
    commission = 0,
    net = t.amount,
    commission_rate_snapshot = 0
  from public.transfer_categories tc
  where t.organization_id = v_org_id
    and t.category_id = tc.id
    and tc.is_deposit = false;  -- Only for withdrawals (ÇEKME)

  get diagnostics v_updated_count = row_count;
  raise notice 'Updated % withdrawal transfers (commission = 0)', v_updated_count;

  -- ============================================================================
  -- Show summary
  -- ============================================================================
  
  raise notice '--- Commission Summary ---';
  
  -- Show totals
  declare
    v_total_amount numeric;
    v_total_commission numeric;
    v_total_net numeric;
  begin
    select 
      sum(amount),
      sum(commission),
      sum(net)
    into v_total_amount, v_total_commission, v_total_net
    from public.transfers
    where organization_id = v_org_id;
    
    raise notice 'Total Amount: %', v_total_amount;
    raise notice 'Total Commission: %', v_total_commission;
    raise notice 'Total Net: %', v_total_net;
  end;

end $$;
