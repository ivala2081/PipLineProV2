-- ============================================================================
-- 003: Organization Members
-- Join table linking users to organizations with a per-org role.
-- ============================================================================

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null default 'member'
    check (role in ('admin', 'member')),
  invited_by      uuid references auth.users (id),
  created_at      timestamptz not null default now(),

  primary key (organization_id, user_id)
);

comment on table  public.organization_members is 'Links users to organizations. A user can belong to multiple orgs.';
comment on column public.organization_members.role is 'admin = org administrator, member = regular org member.';

-- Indexes for common query patterns
create index idx_org_members_user_id on public.organization_members (user_id);
create index idx_org_members_org_id  on public.organization_members (organization_id);

-- Enable RLS (policies added in migration 005)
alter table public.organization_members enable row level security;
