-- ============================================================================
-- 001: Profiles table
-- Extends auth.users with application-specific data.
-- Auto-created via trigger on signup.
-- ============================================================================

-- Table
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  system_role text not null default 'user'
    check (system_role in ('god', 'user')),
  display_name text,
  avatar_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.profiles is 'Application user profiles, one per auth.users row.';
comment on column public.profiles.system_role is 'god = super-admin with cross-org access, user = normal user.';

-- Index for system_role lookups (used in RLS helpers)
create index idx_profiles_system_role on public.profiles (system_role);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_profile_updated
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Enable RLS (policies added in migration 005)
alter table public.profiles enable row level security;
