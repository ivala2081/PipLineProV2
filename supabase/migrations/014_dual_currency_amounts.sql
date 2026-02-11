-- ============================================================================
-- 014: Dual currency amounts — store both TL and USD equivalents per transfer
--
-- Changes:
--   - Add amount_try and amount_usd columns to transfers
--   - Backfill from existing data
--   - Drop old amount_base column
--   - exchange_rate now always stores the USD/TRY rate
--   - Update audit trigger to track new columns
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Add new columns
-- --------------------------------------------------------------------------
alter table public.transfers
  add column amount_try numeric(15,2) not null default 0,
  add column amount_usd numeric(15,2) not null default 0;

-- --------------------------------------------------------------------------
-- 2. Backfill existing data
-- --------------------------------------------------------------------------

-- TL transfers: amount_try = amount, amount_usd = 0 (no real rate stored)
update public.transfers
set amount_try = amount,
    amount_usd = 0
where currency = 'TL';

-- USD transfers: amount_usd = amount, amount_try = amount * exchange_rate
update public.transfers
set amount_usd = amount,
    amount_try = round(amount * exchange_rate, 2)
where currency != 'TL';

-- --------------------------------------------------------------------------
-- 3. Drop old column
-- --------------------------------------------------------------------------
alter table public.transfers drop column amount_base;

-- --------------------------------------------------------------------------
-- 4. Update audit trigger to track amount_try, amount_usd instead of amount_base
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
  if OLD.amount_try is distinct from NEW.amount_try then
    _changes := _changes || jsonb_build_object('amount_try', jsonb_build_object('old', OLD.amount_try, 'new', NEW.amount_try));
  end if;
  if OLD.amount_usd is distinct from NEW.amount_usd then
    _changes := _changes || jsonb_build_object('amount_usd', jsonb_build_object('old', OLD.amount_usd, 'new', NEW.amount_usd));
  end if;

  NEW.updated_by := auth.uid();

  insert into public.transfer_audit_log (transfer_id, organization_id, action, performed_by, changes)
  values (NEW.id, NEW.organization_id, 'updated', auth.uid(), _changes);

  return NEW;
end;
$$ language plpgsql security definer;
