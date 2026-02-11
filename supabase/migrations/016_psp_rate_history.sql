-- ============================================================================
-- 016: PSP Commission Rate Versioning
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. psp_commission_rates — rate history per PSP
-- --------------------------------------------------------------------------

create table public.psp_commission_rates (
  id               uuid primary key default gen_random_uuid(),
  psp_id           uuid not null references public.psps (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  commission_rate  numeric(5,4) not null check (commission_rate >= 0 and commission_rate < 1),
  effective_from   date not null,
  created_by       uuid references auth.users (id),
  created_at       timestamptz not null default now(),

  unique (psp_id, effective_from)
);

create index idx_psp_commission_rates_lookup on public.psp_commission_rates (psp_id, effective_from desc);
create index idx_psp_commission_rates_org on public.psp_commission_rates (organization_id);

alter table public.psp_commission_rates enable row level security;

-- --------------------------------------------------------------------------
-- 2. RLS Policies — psp_commission_rates
-- --------------------------------------------------------------------------

create policy "psp_commission_rates_select" on public.psp_commission_rates
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "psp_commission_rates_insert" on public.psp_commission_rates
  for insert to authenticated
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "psp_commission_rates_update" on public.psp_commission_rates
  for update to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  )
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "psp_commission_rates_delete" on public.psp_commission_rates
  for delete to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

-- --------------------------------------------------------------------------
-- 3. Add commission_rate_snapshot to transfers
-- --------------------------------------------------------------------------

alter table public.transfers
  add column commission_rate_snapshot numeric(5,4);

-- --------------------------------------------------------------------------
-- 4. Backfill: snapshot from joined PSP current rate for existing transfers
-- --------------------------------------------------------------------------

update public.transfers t
set commission_rate_snapshot = p.commission_rate
from public.psps p
where t.psp_id = p.id
  and t.commission_rate_snapshot is null;

-- --------------------------------------------------------------------------
-- 5. Backfill: seed one rate-history row per existing PSP
-- --------------------------------------------------------------------------

insert into public.psp_commission_rates (psp_id, organization_id, commission_rate, effective_from)
select p.id, p.organization_id, p.commission_rate, current_date
from public.psps p
where not exists (
  select 1 from public.psp_commission_rates r where r.psp_id = p.id
);

-- --------------------------------------------------------------------------
-- 6. Trigger: sync psps.commission_rate on rate INSERT
-- --------------------------------------------------------------------------

create or replace function public.sync_psp_current_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _latest_rate numeric(5,4);
begin
  select commission_rate into _latest_rate
  from public.psp_commission_rates
  where psp_id = new.psp_id
    and effective_from <= current_date
  order by effective_from desc
  limit 1;

  if _latest_rate is not null then
    update public.psps
    set commission_rate = _latest_rate
    where id = new.psp_id;
  end if;

  return new;
end;
$$;

create trigger on_psp_rate_inserted
  after insert on public.psp_commission_rates
  for each row
  execute function public.sync_psp_current_rate();

-- --------------------------------------------------------------------------
-- 7. Trigger: sync psps.commission_rate on rate DELETE
-- --------------------------------------------------------------------------

create or replace function public.sync_psp_current_rate_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _latest_rate numeric(5,4);
begin
  select commission_rate into _latest_rate
  from public.psp_commission_rates
  where psp_id = old.psp_id
    and effective_from <= current_date
  order by effective_from desc
  limit 1;

  if _latest_rate is not null then
    update public.psps
    set commission_rate = _latest_rate
    where id = old.psp_id;
  end if;

  return old;
end;
$$;

create trigger on_psp_rate_deleted
  after delete on public.psp_commission_rates
  for each row
  execute function public.sync_psp_current_rate_on_delete();

-- --------------------------------------------------------------------------
-- 8. Helper function: get rate for a PSP on a specific date
-- --------------------------------------------------------------------------

create or replace function public.get_psp_rate_for_date(
  _psp_id uuid,
  _target_date date
)
returns numeric(5,4)
language sql
stable
security definer
set search_path = public
as $$
  select commission_rate
  from public.psp_commission_rates
  where psp_id = _psp_id
    and effective_from <= _target_date
  order by effective_from desc
  limit 1;
$$;

-- --------------------------------------------------------------------------
-- 9. Update seed_org_lookups to also seed an initial rate-history row
-- --------------------------------------------------------------------------

create or replace function public.seed_org_lookups()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _psp_id uuid;
begin
  insert into public.payment_methods (organization_id, name)
  values
    (new.id, 'Banks'),
    (new.id, 'Credit Card'),
    (new.id, 'Tether');

  insert into public.transfer_categories (organization_id, name, is_deposit)
  values
    (new.id, 'Dep', true),
    (new.id, 'WD', false);

  insert into public.transfer_types (organization_id, name)
  values
    (new.id, 'Client'),
    (new.id, 'Payment');

  insert into public.psps (organization_id, name, commission_rate)
  values (new.id, 'PSP TEST', 0.1)
  returning id into _psp_id;

  -- Seed initial rate history row for the default PSP
  insert into public.psp_commission_rates (psp_id, organization_id, commission_rate, effective_from)
  values (_psp_id, new.id, 0.1, current_date);

  return new;
end;
$$;
