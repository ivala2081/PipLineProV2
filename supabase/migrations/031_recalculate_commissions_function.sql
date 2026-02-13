-- ============================================================================
-- 031: Create function to recalculate commissions based on current PSP rates
-- ============================================================================

-- Function to recalculate commissions for all transfers in an organization
create or replace function public.recalculate_commissions(org_id uuid)
returns table (
  updated_count integer,
  total_commission numeric
) as $$
declare
  v_updated_count integer := 0;
  v_total_commission numeric := 0;
begin
  -- Only calculate commission for DEPOSIT transactions (YATIRIM)
  -- Withdrawals (ÇEKME) should have commission = 0
  
  update public.transfers t
  set 
    commission = round(t.amount * p.commission_rate, 2),
    net = t.amount - round(t.amount * p.commission_rate, 2),
    commission_rate_snapshot = p.commission_rate
  from public.psps p,
       public.transfer_categories tc
  where t.organization_id = org_id
    and t.psp_id = p.id
    and t.category_id = tc.id
    and tc.is_deposit = true;  -- Only for deposits
  
  get diagnostics v_updated_count = row_count;
  
  -- Set commission to 0 for withdrawals
  update public.transfers t
  set 
    commission = 0,
    net = t.amount,
    commission_rate_snapshot = 0
  from public.transfer_categories tc
  where t.organization_id = org_id
    and t.category_id = tc.id
    and tc.is_deposit = false;  -- Only for withdrawals
  
  -- Get total commission
  select sum(commission) into v_total_commission
  from public.transfers
  where organization_id = org_id;
  
  return query select v_updated_count, v_total_commission;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function public.recalculate_commissions(uuid) to authenticated;

-- Create a convenience function to recalculate for current org by name
create or replace function public.recalculate_commissions_by_name(org_name text)
returns table (
  updated_count integer,
  total_commission numeric
) as $$
declare
  v_org_id uuid;
begin
  select id into v_org_id from public.organizations where name = org_name;
  
  if v_org_id is null then
    raise exception 'Organization % not found', org_name;
  end if;
  
  return query select * from public.recalculate_commissions(v_org_id);
end;
$$ language plpgsql security definer;

grant execute on function public.recalculate_commissions_by_name(text) to authenticated;

-- ============================================================================
-- Now recalculate commissions for ORDERINVEST with corrected logic
-- ============================================================================

do $$
declare
  result record;
begin
  select * into result from public.recalculate_commissions_by_name('ORDERINVEST');
  
  raise notice '✓ Recalculated commissions for ORDERINVEST';
  raise notice '  Updated % deposit transfers', result.updated_count;
  raise notice '  Total commission: %', result.total_commission;
end $$;
