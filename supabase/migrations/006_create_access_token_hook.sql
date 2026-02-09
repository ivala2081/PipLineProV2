-- ============================================================================
-- 006: Custom Access Token Hook
-- Injects user_role into the JWT so RLS policies can check it
-- with zero disk I/O.
--
-- AFTER RUNNING THIS MIGRATION:
-- 1. Go to Supabase Dashboard → Authentication → Hooks
-- 2. Enable "Customize Access Token (JWT) Claims"
-- 3. Select the function: public.custom_access_token_hook
-- ============================================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_system_role text;
begin
  -- Look up the user's system role from profiles
  select system_role into user_system_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  -- Default to 'user' if profile not found (shouldn't happen with trigger)
  user_system_role := coalesce(user_system_role, 'user');

  -- Get existing claims from the event
  claims := event -> 'claims';

  -- Inject user_role into claims
  claims := jsonb_set(claims, '{user_role}', to_jsonb(user_system_role));

  -- Return the modified event
  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;

-- Grant execute to supabase_auth_admin (required for auth hooks)
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- Revoke execute from public and anon/authenticated to prevent direct calls
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- Grant read access on profiles to supabase_auth_admin (needed by the hook)
grant select on public.profiles to supabase_auth_admin;
