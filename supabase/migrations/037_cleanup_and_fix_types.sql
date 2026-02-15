-- ============================================================================
-- 037: Clean up data, fix transfer types, add aliases system
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────
-- Part A: Add aliases column to lookup tables
-- ──────────────────────────────────────────────────────────────────────

alter table public.transfer_types
  add column if not exists aliases text[] not null default '{}';

alter table public.payment_methods
  add column if not exists aliases text[] not null default '{}';

alter table public.transfer_categories
  add column if not exists aliases text[] not null default '{}';

-- ──────────────────────────────────────────────────────────────────────
-- Part B: Clean up data for a fresh re-import
-- ──────────────────────────────────────────────────────────────────────

-- 1. Delete all transfers (must go first due to FK constraints)
delete from public.transfers;

-- 2. Delete all PSP settlements (FK to psps)
delete from public.psp_settlements;

-- 3. Delete all PSPs
delete from public.psps;

-- 4. Remove auto-created Turkish type names (match exact strings to avoid
--    PostgreSQL locale issues with Turkish İ → lower() producing combining chars)
delete from public.transfer_types
  where name in ('MÜŞTERİ', 'Müşteri', 'müşteri', 'ÖDEME', 'Ödeme', 'ödeme',
                  'BLOKE HESAP', 'Bloke Hesap', 'bloke hesap',
                  'MUSTERI', 'Musteri', 'musteri');

-- 5. Remove auto-created Turkish category names
delete from public.transfer_categories
  where name in ('YATIRIM', 'Yatırım', 'yatırım', 'yatirim',
                  'ÇEKME', 'Çekme', 'çekme');

-- 6. Remove auto-created Turkish payment method "BANKA"
delete from public.payment_methods
  where name in ('BANKA', 'Banka', 'banka');

-- ──────────────────────────────────────────────────────────────────────
-- Part C: Ensure correct types exist and seed aliases
-- ──────────────────────────────────────────────────────────────────────

-- Ensure all three types exist for every org
insert into public.transfer_types (organization_id, name, is_active)
  select o.id, t.n, true
  from public.organizations o
  cross join (values ('Client'), ('Payment'), ('Blocked')) as t(n)
  where not exists (
    select 1 from public.transfer_types tt
    where tt.organization_id = o.id and tt.name = t.n
  );

-- Seed Turkish aliases for transfer types
update public.transfer_types set aliases = '{müşteri,MÜŞTERİ,Müşteri,musteri,MUSTERI,Musteri,customer}'
  where name = 'Client';
update public.transfer_types set aliases = '{ödeme,ÖDEME,Ödeme}'
  where name = 'Payment';
update public.transfer_types set aliases = '{bloke hesap,BLOKE HESAP,Bloke Hesap,blocked}'
  where name = 'Blocked';

-- Seed Turkish aliases for categories
update public.transfer_categories set aliases = '{yatırım,YATIRIM,Yatırım,yatirim,deposit}'
  where name = 'Dep';
update public.transfer_categories set aliases = '{çekme,ÇEKME,Çekme,withdrawal}'
  where name = 'WD';

-- Seed Turkish aliases for payment methods
update public.payment_methods set aliases = '{banka,BANKA,Banka,bank}'
  where name = 'Banks';

-- ──────────────────────────────────────────────────────────────────────
-- Part D: Update seed trigger to include Blocked + aliases
-- ──────────────────────────────────────────────────────────────────────

create or replace function public.seed_org_lookups()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.payment_methods (organization_id, name, aliases)
  values
    (new.id, 'Banks', '{banka,BANKA,bank}'),
    (new.id, 'Credit Card', '{}'),
    (new.id, 'Tether', '{}');
  insert into public.transfer_categories (organization_id, name, is_deposit, aliases)
  values
    (new.id, 'Dep', true, '{yatırım,YATIRIM,yatirim,deposit}'),
    (new.id, 'WD', false, '{çekme,ÇEKME,withdrawal}');
  insert into public.transfer_types (organization_id, name, aliases)
  values
    (new.id, 'Client', '{müşteri,MÜŞTERİ,musteri,MUSTERI,customer}'),
    (new.id, 'Payment', '{ödeme,ÖDEME}'),
    (new.id, 'Blocked', '{bloke hesap,BLOKE HESAP,blocked}');
  insert into public.psps (organization_id, name, commission_rate)
  values (new.id, 'PSP TEST', 0.1);
  return new;
end;
$$;
