-- ============================================================================
-- 011: Transfer Audit Log — track who created/edited transfers
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Add updated_by to transfers
-- --------------------------------------------------------------------------
alter table public.transfers
  add column updated_by uuid references auth.users (id);

-- --------------------------------------------------------------------------
-- 2. Create audit log table
-- --------------------------------------------------------------------------
create table public.transfer_audit_log (
  id               uuid primary key default gen_random_uuid(),
  transfer_id      uuid not null references public.transfers (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  action           text not null check (action in ('created', 'updated')),
  performed_by     uuid references auth.users (id),
  changes          jsonb,
  created_at       timestamptz not null default now()
);

create index idx_transfer_audit_transfer on public.transfer_audit_log (transfer_id, created_at desc);
create index idx_transfer_audit_org on public.transfer_audit_log (organization_id);

alter table public.transfer_audit_log enable row level security;

-- --------------------------------------------------------------------------
-- 3. RLS — same as transfers (org members can read)
-- --------------------------------------------------------------------------
create policy "transfer_audit_log_select" on public.transfer_audit_log
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "transfer_audit_log_insert" on public.transfer_audit_log
  for insert to authenticated
  with check (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

-- --------------------------------------------------------------------------
-- 4. Trigger: auto-log on insert
-- --------------------------------------------------------------------------
create or replace function public.handle_transfer_audit_insert()
returns trigger as $$
begin
  insert into public.transfer_audit_log (transfer_id, organization_id, action, performed_by)
  values (NEW.id, NEW.organization_id, 'created', NEW.created_by);
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_transfer_created
  after insert on public.transfers
  for each row execute function public.handle_transfer_audit_insert();

-- --------------------------------------------------------------------------
-- 5. Trigger: auto-log on update
-- --------------------------------------------------------------------------
create or replace function public.handle_transfer_audit_update()
returns trigger as $$
declare
  _changes jsonb := '{}';
begin
  -- Record changed fields
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

  -- Set updated_by from auth context
  NEW.updated_by := auth.uid();

  insert into public.transfer_audit_log (transfer_id, organization_id, action, performed_by, changes)
  values (NEW.id, NEW.organization_id, 'updated', auth.uid(), _changes);

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_transfer_updated_audit
  before update on public.transfers
  for each row execute function public.handle_transfer_audit_update();
