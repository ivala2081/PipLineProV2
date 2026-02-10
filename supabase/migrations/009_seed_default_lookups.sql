-- ============================================================================
-- 009: Seed default lookups for all organizations
-- ============================================================================

-- Seed defaults for existing orgs (run once)
insert into public.payment_methods (organization_id, name)
  select o.id, n
  from public.organizations o
  cross join (values ('Banks'), ('Credit Card'), ('Tether')) as t(n)
  where not exists (
    select 1 from public.payment_methods pm
    where pm.organization_id = o.id and pm.name = n
  );

insert into public.transfer_categories (organization_id, name, is_deposit)
  select o.id, c.name, c.is_deposit
  from public.organizations o
  cross join (values
    ('Dep', true),
    ('WD', false)
  ) as c(name, is_deposit)
  where not exists (
    select 1 from public.transfer_categories tc
    where tc.organization_id = o.id and tc.name = c.name
  );

insert into public.transfer_types (organization_id, name)
  select o.id, n
  from public.organizations o
  cross join (values ('Client'), ('Payment')) as t(n)
  where not exists (
    select 1 from public.transfer_types tt
    where tt.organization_id = o.id and tt.name = n
  );

insert into public.psps (organization_id, name, commission_rate)
  select o.id, 'PSP TEST', 0.1
  from public.organizations o
  where not exists (
    select 1 from public.psps p
    where p.organization_id = o.id and p.name = 'PSP TEST'
  );

-- Function to seed defaults for a new org
create or replace function public.seed_org_lookups()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
  values (new.id, 'PSP TEST', 0.1);
  return new;
end;
$$;

-- Trigger: seed defaults when a new org is created
drop trigger if exists on_org_created_seed_lookups on public.organizations;
create trigger on_org_created_seed_lookups
  after insert on public.organizations
  for each row
  execute function public.seed_org_lookups();
