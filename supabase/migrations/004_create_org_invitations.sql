-- ============================================================================
-- 004: Organization Invitations
-- Pending invites created by God admins.
-- Auto-accepted when the invited user signs up.
-- ============================================================================

create table public.organization_invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email           text not null,
  role            text not null default 'admin'
    check (role in ('admin', 'member')),
  invited_by      uuid references auth.users (id),
  status          text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired')),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '7 days')
);

comment on table public.organization_invitations is 'Pending org invitations. Auto-accepted on signup via trigger.';

-- Indexes
create index idx_org_invitations_email  on public.organization_invitations (email);
create index idx_org_invitations_status on public.organization_invitations (status);
create index idx_org_invitations_org_id on public.organization_invitations (organization_id);

-- Unique: only one pending invite per email per org
create unique index idx_org_invitations_unique_pending
  on public.organization_invitations (organization_id, email)
  where status = 'pending';

-- Replace the signup trigger to also handle invitation auto-accept
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _invitation record;
begin
  -- 1. Create profile
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  -- 2. Auto-accept pending invitations for this email
  for _invitation in
    select id, organization_id, role
    from public.organization_invitations
    where email = new.email
      and status = 'pending'
      and expires_at > now()
  loop
    -- Create membership
    insert into public.organization_members (organization_id, user_id, role, invited_by)
    select _invitation.organization_id, new.id, _invitation.role, oi.invited_by
    from public.organization_invitations oi
    where oi.id = _invitation.id
    on conflict (organization_id, user_id) do nothing;

    -- Mark invitation as accepted
    update public.organization_invitations
    set status = 'accepted'
    where id = _invitation.id;
  end loop;

  return new;
end;
$$;

-- Enable RLS (policies added in migration 005)
alter table public.organization_invitations enable row level security;
