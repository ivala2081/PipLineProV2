-- ============================================================================
-- 002: Organizations table
-- Each organization is a tenant with isolated data.
-- ============================================================================

create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  is_active  boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table  public.organizations is 'Tenant organizations. All business data is scoped to an organization.';
comment on column public.organizations.slug is 'URL-safe unique identifier for the organization.';

-- Indexes
create index idx_organizations_slug on public.organizations (slug);
create index idx_organizations_is_active on public.organizations (is_active);

-- Auto-update updated_at (reuses function from 001)
create trigger on_org_updated
  before update on public.organizations
  for each row
  execute function public.handle_updated_at();

-- Enable RLS (policies added in migration 005)
alter table public.organizations enable row level security;
