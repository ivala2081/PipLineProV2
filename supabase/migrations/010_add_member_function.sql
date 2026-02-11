-- ============================================================================
-- 010: Direct member addition function
-- Replaces invitation workflow with direct user creation + org membership.
-- Admins can add members by specifying email, password, role.
-- ============================================================================

-- RPC function: creates auth user + profile + org membership in one call
create or replace function public.add_organization_member(
  _org_id uuid,
  _email text,
  _password text,
  _role text default 'operation',
  _display_name text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid;
  _existing_user_id uuid;
  _encrypted_pw text;
begin
  -- Normalise email
  _email := lower(trim(_email));

  -- Check if the user already exists in auth
  select id into _existing_user_id from auth.users where email = _email;

  if _existing_user_id is not null then
    -- User exists → just add to org (no-op if already a member)
    insert into public.organization_members (organization_id, user_id, role, invited_by)
    values (_org_id, _existing_user_id, _role, auth.uid())
    on conflict (organization_id, user_id) do nothing;

    return json_build_object('user_id', _existing_user_id, 'created', false);
  end if;

  -- Generate id & hash password
  _user_id   := gen_random_uuid();
  _encrypted_pw := crypt(_password, gen_salt('bf'));

  -- Create auth user
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values (
    _user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    _email,
    _encrypted_pw,
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(_display_name, '')),
    false, '', '', '', ''
  );

  -- Create identity row (required for email/password login)
  insert into auth.identities (
    id, user_id, provider_id, identity_data,
    provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    _user_id,
    _email,
    jsonb_build_object('sub', _user_id::text, 'email', _email),
    'email',
    now(), now(), now()
  );

  -- handle_new_user trigger fires on auth.users INSERT and creates the profile.
  -- Update display_name explicitly if provided (trigger uses full_name from meta).
  if _display_name is not null then
    update public.profiles set display_name = _display_name where id = _user_id;
  end if;

  -- Add to organization
  insert into public.organization_members (organization_id, user_id, role, invited_by)
  values (_org_id, _user_id, _role, auth.uid());

  return json_build_object('user_id', _user_id::text, 'created', true);
end;
$$;

-- Allow authenticated users to call this function (RLS on org_members already
-- restricts who can actually insert rows).
grant execute on function public.add_organization_member to authenticated;
