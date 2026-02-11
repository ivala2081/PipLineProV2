-- ============================================================================
-- 012: Fix PostgREST joins — add FK constraints to profiles
--
-- PostgREST resolves joins via foreign keys. Columns like
-- organization_members.user_id and transfer_audit_log.performed_by
-- reference auth.users(id), which PostgREST can't traverse (auth schema
-- is not exposed). Adding parallel FKs to public.profiles (which mirrors
-- auth.users.id) lets PostgREST resolve profile joins.
-- ============================================================================

-- 1. organization_members.user_id → profiles
alter table public.organization_members
  add constraint organization_members_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- 2. organization_members.invited_by → profiles
alter table public.organization_members
  add constraint organization_members_invited_by_profiles_fkey
  foreign key (invited_by) references public.profiles (id) on delete set null;

-- 3. transfer_audit_log.performed_by → profiles
alter table public.transfer_audit_log
  add constraint transfer_audit_log_performed_by_profiles_fkey
  foreign key (performed_by) references public.profiles (id) on delete set null;

-- 4. transfers.created_by → profiles
alter table public.transfers
  add constraint transfers_created_by_profiles_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

-- 5. transfers.updated_by → profiles
alter table public.transfers
  add constraint transfers_updated_by_profiles_fkey
  foreign key (updated_by) references public.profiles (id) on delete set null;

-- 6. organization_invitations.invited_by → profiles
alter table public.organization_invitations
  add constraint organization_invitations_invited_by_profiles_fkey
  foreign key (invited_by) references public.profiles (id) on delete set null;

-- ============================================================================
-- 7. Create add_organization_member RPC
--
-- Creates a new Supabase auth user + profile + org membership in one call.
-- Only gods and org admins can call this (enforced by RLS on org_members).
-- ============================================================================

drop function if exists public.add_organization_member(uuid, text, text, text, text);

create or replace function public.add_organization_member(
  _org_id uuid,
  _email text,
  _password text,
  _role text default 'operation',
  _display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid;
  _created boolean := false;
  _existing_user_id uuid;
begin
  -- Check caller is god or admin of this org
  if not (
    (select private.is_god())
    or (select private.is_org_admin(_org_id))
  ) then
    raise exception 'Permission denied: you must be god or org admin';
  end if;

  -- Check if user already exists in auth.users by email
  select id into _existing_user_id
  from auth.users
  where email = _email;

  if _existing_user_id is not null then
    -- User exists — check if already a member of this org
    if exists (
      select 1 from organization_members
      where organization_id = _org_id and user_id = _existing_user_id
    ) then
      raise exception 'User is already a member of this organization';
    end if;

    _user_id := _existing_user_id;
    _created := false;
  else
    -- Create new auth user via Supabase admin API
    _user_id := extensions.uuid_generate_v4();

    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at
    ) values (
      _user_id,
      '00000000-0000-0000-0000-000000000000',
      _email,
      crypt(_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      'authenticated',
      'authenticated',
      now(),
      now()
    );

    -- Profile is created by the handle_new_user trigger.
    -- Update display_name if provided.
    if _display_name is not null then
      update profiles set display_name = _display_name where id = _user_id;
    end if;

    _created := true;
  end if;

  -- Add as org member
  insert into organization_members (organization_id, user_id, role, invited_by)
  values (_org_id, _user_id, _role, auth.uid());

  return jsonb_build_object('user_id', _user_id, 'created', _created);
end;
$$;
