-- ============================================================================
-- 035: PSP Settlements (Tahsilatlar)
-- ============================================================================

-- Table: psp_settlements
create table public.psp_settlements (
  id               uuid primary key default gen_random_uuid(),
  psp_id           uuid not null references public.psps (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  settlement_date  date not null,
  amount           numeric(15,2) not null check (amount > 0),
  currency         text not null check (currency in ('TL', 'USD')),
  notes            text,
  created_by       uuid references auth.users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_psp_settlements_psp on public.psp_settlements (psp_id, settlement_date desc);
create index idx_psp_settlements_org on public.psp_settlements (organization_id);

create trigger on_psp_settlement_updated before update on public.psp_settlements
  for each row execute function public.handle_updated_at();

-- RLS
alter table public.psp_settlements enable row level security;

create policy "psp_settlements_select" on public.psp_settlements
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "psp_settlements_insert" on public.psp_settlements
  for insert to authenticated
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "psp_settlements_update" on public.psp_settlements
  for update to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  )
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "psp_settlements_delete" on public.psp_settlements
  for delete to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

-- ============================================================================
-- RPC: get_psp_summary – aggregated PSP data for dashboard
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
    where tr.psp_id = p.id
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
