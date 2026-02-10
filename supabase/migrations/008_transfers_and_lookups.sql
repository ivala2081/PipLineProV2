-- ============================================================================
-- 008: Transfers — lookup tables + transfers table + RLS
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Currency enum
-- --------------------------------------------------------------------------
create type public.currency as enum ('TL', 'USD');

-- --------------------------------------------------------------------------
-- 2. Lookup tables (org-scoped)
-- --------------------------------------------------------------------------

-- PSPs (Payment Service Providers)
create table public.psps (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  commission_rate  numeric(5,4) not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (organization_id, name)
);

create index idx_psps_org on public.psps (organization_id);
create trigger on_psp_updated before update on public.psps
  for each row execute function public.handle_updated_at();
alter table public.psps enable row level security;

-- Transfer Categories (YATIRIM, CEKME, etc.)
create table public.transfer_categories (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  is_deposit       boolean not null default true,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (organization_id, name)
);

create index idx_transfer_categories_org on public.transfer_categories (organization_id);
create trigger on_transfer_category_updated before update on public.transfer_categories
  for each row execute function public.handle_updated_at();
alter table public.transfer_categories enable row level security;

-- Payment Methods (BANKA, Tether, etc.)
create table public.payment_methods (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (organization_id, name)
);

create index idx_payment_methods_org on public.payment_methods (organization_id);
create trigger on_payment_method_updated before update on public.payment_methods
  for each row execute function public.handle_updated_at();
alter table public.payment_methods enable row level security;

-- Transfer Types (MUSTERI, etc.)
create table public.transfer_types (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (organization_id, name)
);

create index idx_transfer_types_org on public.transfer_types (organization_id);
create trigger on_transfer_type_updated before update on public.transfer_types
  for each row execute function public.handle_updated_at();
alter table public.transfer_types enable row level security;

-- --------------------------------------------------------------------------
-- 3. Transfers table
-- --------------------------------------------------------------------------

create table public.transfers (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,

  full_name        text not null,
  payment_method_id uuid not null references public.payment_methods (id),
  transfer_date    timestamptz not null default now(),
  category_id      uuid not null references public.transfer_categories (id),
  amount           numeric(15,2) not null,
  commission       numeric(15,2) not null default 0,
  net              numeric(15,2) not null,
  currency         public.currency not null default 'TL',
  psp_id           uuid not null references public.psps (id),
  type_id          uuid not null references public.transfer_types (id),
  crm_id           text,
  meta_id          text,

  created_by       uuid references auth.users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_transfers_org on public.transfers (organization_id);
create index idx_transfers_date on public.transfers (organization_id, transfer_date desc);
create index idx_transfers_category on public.transfers (category_id);
create index idx_transfers_psp on public.transfers (psp_id);

create trigger on_transfer_updated before update on public.transfers
  for each row execute function public.handle_updated_at();

alter table public.transfers enable row level security;

-- --------------------------------------------------------------------------
-- 4. RLS Policies — Lookup Tables
--    All org members can read; only admin/god can write
-- --------------------------------------------------------------------------

-- ---- psps ----
create policy "psps_select" on public.psps
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "psps_insert" on public.psps
  for insert to authenticated
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "psps_update" on public.psps
  for update to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  )
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "psps_delete" on public.psps
  for delete to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

-- ---- transfer_categories ----
create policy "transfer_categories_select" on public.transfer_categories
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "transfer_categories_insert" on public.transfer_categories
  for insert to authenticated
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "transfer_categories_update" on public.transfer_categories
  for update to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  )
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "transfer_categories_delete" on public.transfer_categories
  for delete to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

-- ---- payment_methods ----
create policy "payment_methods_select" on public.payment_methods
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "payment_methods_insert" on public.payment_methods
  for insert to authenticated
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "payment_methods_update" on public.payment_methods
  for update to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  )
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "payment_methods_delete" on public.payment_methods
  for delete to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

-- ---- transfer_types ----
create policy "transfer_types_select" on public.transfer_types
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "transfer_types_insert" on public.transfer_types
  for insert to authenticated
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "transfer_types_update" on public.transfer_types
  for update to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  )
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "transfer_types_delete" on public.transfer_types
  for delete to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

-- --------------------------------------------------------------------------
-- 5. RLS Policies — Transfers
--    All org members (operation/admin/god) have full CRUD
-- --------------------------------------------------------------------------

create policy "transfers_select" on public.transfers
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "transfers_insert" on public.transfers
  for insert to authenticated
  with check (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "transfers_update" on public.transfers
  for update to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  )
  with check (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "transfers_delete" on public.transfers
  for delete to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );
