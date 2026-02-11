-- ============================================================================
-- 015: Accounting — ledger entries, wallets, wallet snapshots + RLS
-- ============================================================================

-- Clean slate (safe for dev — removes any partial previous run)
DROP TABLE IF EXISTS public.wallet_snapshots CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.accounting_entries CASCADE;

-- --------------------------------------------------------------------------
-- 1. Accounting entries (company expense / internal transfer ledger)
-- --------------------------------------------------------------------------

create table public.accounting_entries (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  description      text not null,
  entry_type       text not null check (entry_type in ('ODEME', 'TRANSFER')),
  direction        text not null check (direction in ('in', 'out')),
  amount           numeric(15,2) not null check (amount > 0),
  currency         text not null check (currency in ('TL', 'USD', 'USDT')),
  cost_period      text,
  entry_date       date not null default current_date,
  payment_period   text,
  register         text not null check (register in ('USDT', 'NAKIT_TL', 'NAKIT_USD')),
  created_by       uuid references auth.users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_accounting_entries_org on public.accounting_entries (organization_id);
create index idx_accounting_entries_date on public.accounting_entries (organization_id, entry_date desc);
create index idx_accounting_entries_register on public.accounting_entries (organization_id, register);

create trigger on_accounting_entry_updated before update on public.accounting_entries
  for each row execute function public.handle_updated_at();

alter table public.accounting_entries enable row level security;

-- --------------------------------------------------------------------------
-- 2. Wallets (crypto wallet registry)
-- --------------------------------------------------------------------------

create table public.wallets (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  label            text not null,
  address          text not null,
  chain            text not null check (chain in ('tron', 'ethereum', 'bsc', 'bitcoin', 'solana')),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (organization_id, address, chain)
);

create index idx_wallets_org on public.wallets (organization_id);

create trigger on_wallet_updated before update on public.wallets
  for each row execute function public.handle_updated_at();

alter table public.wallets enable row level security;

-- --------------------------------------------------------------------------
-- 3. Wallet snapshots (daily closes / balance snapshots)
-- --------------------------------------------------------------------------

create table public.wallet_snapshots (
  id               uuid primary key default gen_random_uuid(),
  wallet_id        uuid not null references public.wallets (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  snapshot_date    date not null,
  balances         jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now(),

  unique (wallet_id, snapshot_date)
);

create index idx_wallet_snapshots_wallet on public.wallet_snapshots (wallet_id, snapshot_date desc);
create index idx_wallet_snapshots_org on public.wallet_snapshots (organization_id);

alter table public.wallet_snapshots enable row level security;

-- --------------------------------------------------------------------------
-- 4. RLS Policies — accounting_entries
--    All org members have full CRUD (same as transfers)
-- --------------------------------------------------------------------------

create policy "accounting_entries_select" on public.accounting_entries
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "accounting_entries_insert" on public.accounting_entries
  for insert to authenticated
  with check (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "accounting_entries_update" on public.accounting_entries
  for update to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  )
  with check (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "accounting_entries_delete" on public.accounting_entries
  for delete to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

-- --------------------------------------------------------------------------
-- 5. RLS Policies — wallets
--    All org members can read; admin/god can write
-- --------------------------------------------------------------------------

create policy "wallets_select" on public.wallets
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "wallets_insert" on public.wallets
  for insert to authenticated
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "wallets_update" on public.wallets
  for update to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  )
  with check (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

create policy "wallets_delete" on public.wallets
  for delete to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );

-- --------------------------------------------------------------------------
-- 6. RLS Policies — wallet_snapshots
--    All org members can read; all org members can insert (take snapshot)
-- --------------------------------------------------------------------------

create policy "wallet_snapshots_select" on public.wallet_snapshots
  for select to authenticated
  using (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "wallet_snapshots_insert" on public.wallet_snapshots
  for insert to authenticated
  with check (
    (select private.is_god())
    or organization_id in (select private.get_user_org_ids())
  );

create policy "wallet_snapshots_delete" on public.wallet_snapshots
  for delete to authenticated
  using (
    (select private.is_god())
    or (select private.is_org_admin(organization_id))
  );
