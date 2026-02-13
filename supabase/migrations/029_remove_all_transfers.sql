-- ============================================================================
-- 029: Remove all transfers for ORDERINVEST organization
-- ============================================================================

do $$
declare
  v_org_id uuid;
  v_deleted_count integer := 0;
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

  -- Delete all transfers for this organization
  delete from public.transfers
  where organization_id = v_org_id;

  get diagnostics v_deleted_count = row_count;
  
  raise notice 'Successfully deleted % transfers', v_deleted_count;

  -- Also delete lookup data if you want to start fresh
  delete from public.psps where organization_id = v_org_id;
  delete from public.payment_methods where organization_id = v_org_id;
  delete from public.transfer_categories where organization_id = v_org_id;
  delete from public.transfer_types where organization_id = v_org_id;
  delete from public.exchange_rates where organization_id = v_org_id;

  raise notice 'Deleted all lookup data (PSPs, payment methods, categories, types, exchange rates)';

end $$;
