-- ============================================================================
-- 044: add_organization_member RPC
--
-- Server-side function that creates a new auth user (email/password),
-- auto-triggers profile creation, and inserts into organization_members.
-- If the email already exists, just adds them to the org.
-- Only gods and org admins can call this.
-- ============================================================================

drop function if exists public.add_organization_member(uuid, text, text, text, text);

create or replace function public.add_organization_member(
  _org_id       uuid,
  _email        text,
  _password     text,
  _role         text default 'operation',
  _display_name text default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  _user_id uuid;
  _created boolean := false;
begin
  -- 1. Permission check: caller must be god or admin of the target org
  if not (private.is_god() or private.is_org_admin(_org_id)) then
    raise exception 'Permission denied: you must be a god or org admin';
  end if;

  -- 2. Validate role
  if _role not in ('admin', 'operation') then
    raise exception 'Invalid role: must be admin or operation';
  end if;

  -- 3. Check if user already exists
  select id into _user_id
  from auth.users
  where email = lower(trim(_email));

  if _user_id is null then
    -- 4a. Create new auth user
    _user_id := gen_random_uuid();

    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      is_sso_user
    ) values (
      _user_id,
      '00000000-0000-0000-0000-000000000000',
      lower(trim(_email)),
      extensions.crypt(_password, extensions.gen_salt('bf', 10)),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      case
        when _display_name is not null
        then jsonb_build_object('full_name', _display_name)
        else '{}'::jsonb
      end,
      'authenticated',
      'authenticated',
      false
    );

    -- 4b. Create identity record (required for email/password login)
    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      _user_id::text,
      _user_id,
      jsonb_build_object(
        'sub', _user_id::text,
        'email', lower(trim(_email)),
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    );

    -- Profile is auto-created by the on_auth_user_created trigger (migration 001)

    _created := true;
  end if;

  -- 5. Add to organization (ignore if already a member)
  insert into public.organization_members (organization_id, user_id, role, invited_by)
  values (_org_id, _user_id, _role, auth.uid())
  on conflict (organization_id, user_id) do nothing;

  return json_build_object('user_id', _user_id, 'created', _created);
end;
$$;

comment on function public.add_organization_member is
  'Creates a new user (or finds existing) and adds them to an organization. Gods and org admins only.';
