-- ============================================================================
-- 013: Exchange rates — rate table + new columns on transfers + audit update
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. exchange_rates table (org-scoped daily rates)
-- --------------------------------------------------------------------------
create table public.exchange_rates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  currency        text not null,
  rate_to_tl      numeric(12,6) not null,
  rate_date       date not null default current_date,
  source          text not null default 'api',
  created_at      timestamptz not null default now(),

  unique (organization_id, currency, rate_date)
);

create index idx_exchange_rates_org_date on public.exchange_rates (organization_id, rate_date desc);

alter table public.exchange_rates enable row level security;

-- RLS: org members can read, god/admin can write
create policy "exchange_rates_select" on public.exchange_rates
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "exchange_rates_insert" on public.exchange_rates
  for insert to authenticated
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "exchange_rates_update" on public.exchange_rates
  for update to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  )
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "exchange_rates_delete" on public.exchange_rates
  for delete to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

-- --------------------------------------------------------------------------
-- 2. New columns on transfers
-- --------------------------------------------------------------------------
alter table public.transfers
  add column exchange_rate numeric(12,6) not null default 1,
  add column amount_base   numeric(15,2) not null default 0;

-- Backfill existing data
update public.transfers set exchange_rate = 1, amount_base = amount;

-- --------------------------------------------------------------------------
-- 3. Update audit trigger to track exchange_rate and amount_base
-- --------------------------------------------------------------------------
create or replace function public.handle_transfer_audit_update()
returns trigger as $$
declare
  _changes jsonb := '{}';
begin
  if OLD.full_name is distinct from NEW.full_name then
    _changes := _changes || jsonb_build_object('full_name', jsonb_build_object('old', OLD.full_name, 'new', NEW.full_name));
  end if;
  if OLD.amount is distinct from NEW.amount then
    _changes := _changes || jsonb_build_object('amount', jsonb_build_object('old', OLD.amount, 'new', NEW.amount));
  end if;
  if OLD.commission is distinct from NEW.commission then
    _changes := _changes || jsonb_build_object('commission', jsonb_build_object('old', OLD.commission, 'new', NEW.commission));
  end if;
  if OLD.net is distinct from NEW.net then
    _changes := _changes || jsonb_build_object('net', jsonb_build_object('old', OLD.net, 'new', NEW.net));
  end if;
  if OLD.currency is distinct from NEW.currency then
    _changes := _changes || jsonb_build_object('currency', jsonb_build_object('old', OLD.currency, 'new', NEW.currency));
  end if;
  if OLD.payment_method_id is distinct from NEW.payment_method_id then
    _changes := _changes || jsonb_build_object('payment_method_id', jsonb_build_object('old', OLD.payment_method_id, 'new', NEW.payment_method_id));
  end if;
  if OLD.category_id is distinct from NEW.category_id then
    _changes := _changes || jsonb_build_object('category_id', jsonb_build_object('old', OLD.category_id, 'new', NEW.category_id));
  end if;
  if OLD.psp_id is distinct from NEW.psp_id then
    _changes := _changes || jsonb_build_object('psp_id', jsonb_build_object('old', OLD.psp_id, 'new', NEW.psp_id));
  end if;
  if OLD.type_id is distinct from NEW.type_id then
    _changes := _changes || jsonb_build_object('type_id', jsonb_build_object('old', OLD.type_id, 'new', NEW.type_id));
  end if;
  if OLD.crm_id is distinct from NEW.crm_id then
    _changes := _changes || jsonb_build_object('crm_id', jsonb_build_object('old', OLD.crm_id, 'new', NEW.crm_id));
  end if;
  if OLD.meta_id is distinct from NEW.meta_id then
    _changes := _changes || jsonb_build_object('meta_id', jsonb_build_object('old', OLD.meta_id, 'new', NEW.meta_id));
  end if;
  if OLD.transfer_date is distinct from NEW.transfer_date then
    _changes := _changes || jsonb_build_object('transfer_date', jsonb_build_object('old', OLD.transfer_date, 'new', NEW.transfer_date));
  end if;
  if OLD.exchange_rate is distinct from NEW.exchange_rate then
    _changes := _changes || jsonb_build_object('exchange_rate', jsonb_build_object('old', OLD.exchange_rate, 'new', NEW.exchange_rate));
  end if;
  if OLD.amount_base is distinct from NEW.amount_base then
    _changes := _changes || jsonb_build_object('amount_base', jsonb_build_object('old', OLD.amount_base, 'new', NEW.amount_base));
  end if;

  NEW.updated_by := auth.uid();

  insert into public.transfer_audit_log (transfer_id, organization_id, action, performed_by, changes)
  values (NEW.id, NEW.organization_id, 'updated', auth.uid(), _changes);

  return NEW;
end;
$$ language plpgsql security definer;
