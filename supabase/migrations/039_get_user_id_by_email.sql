-- ============================================================================
-- 010: Helper function for edge functions to look up user by email
-- ============================================================================

create or replace function public.get_user_id_by_email(_email text)
returns uuid
language sql
security definer
set search_path = auth
as $$
  select id from auth.users where email = lower(trim(_email)) limit 1;
$$;

-- Only service_role should call this (edge functions use service_role key)
revoke execute on function public.get_user_id_by_email from public, anon, authenticated;
grant execute on function public.get_user_id_by_email to service_role;
