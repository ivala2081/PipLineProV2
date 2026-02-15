-- ============================================================================
-- 036: Exclude "Blocked" transfers from PSP summary
-- ============================================================================

create or replace function public.get_psp_summary(_org_id uuid)
returns table (
  psp_id          uuid,
  psp_name        text,
  commission_rate numeric,
  is_active       boolean,
  total_deposits  numeric,
  total_withdrawals numeric,
  total_commission numeric,
  total_net       numeric,
  total_settlements numeric,
  last_settlement_date date
)
language sql stable security definer set search_path = public
as $$
  select
    p.id                                    as psp_id,
    p.name                                  as psp_name,
    p.commission_rate,
    p.is_active,
    coalesce(t.total_deposits, 0)           as total_deposits,
    coalesce(t.total_withdrawals, 0)        as total_withdrawals,
    coalesce(t.total_commission, 0)         as total_commission,
    coalesce(t.total_net, 0)                as total_net,
    coalesce(s.total_settlements, 0)        as total_settlements,
    s.last_settlement_date
  from public.psps p
  left join lateral (
    select
      sum(case when tc.is_deposit then tr.amount else 0 end)         as total_deposits,
      sum(case when not tc.is_deposit then abs(tr.amount) else 0 end) as total_withdrawals,
      sum(tr.commission)                                              as total_commission,
      sum(tr.net)                                                     as total_net
    from public.transfers tr
    join public.transfer_categories tc on tc.id = tr.category_id
    join public.transfer_types tt on tt.id = tr.type_id
    where tr.psp_id = p.id
      and lower(tt.name) not like '%blocked%'
  ) t on true
  left join lateral (
    select
      sum(ps.amount)            as total_settlements,
      max(ps.settlement_date)   as last_settlement_date
    from public.psp_settlements ps
    where ps.psp_id = p.id
  ) s on true
  where p.organization_id = _org_id
  order by p.name;
$$;
