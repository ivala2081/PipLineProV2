-- Fix: missing GRANT + god bypass for hr_mt_barem_failures RLS policies.
-- Use private.is_god() (SECURITY DEFINER) to bypass profiles RLS.

-- Grant table access to authenticated users (PostgREST requires this)
grant select, insert, update, delete on hr_mt_barem_failures to authenticated;

-- Drop all old policies
drop policy if exists "managers can manage barem failures" on hr_mt_barem_failures;
drop policy if exists "managers can insert barem failures" on hr_mt_barem_failures;
drop policy if exists "managers can update barem failures" on hr_mt_barem_failures;
drop policy if exists "managers can delete barem failures" on hr_mt_barem_failures;
drop policy if exists "org members can view barem failures" on hr_mt_barem_failures;

-- SELECT: org members + god
create policy "org members can view barem failures"
  on hr_mt_barem_failures for select
  using (
    (select private.is_god())
    OR organization_id in (
      select organization_id from organization_members where user_id = auth.uid()
    )
  );

-- INSERT
create policy "managers can insert barem failures"
  on hr_mt_barem_failures for insert
  with check (
    (select private.is_god())
    OR organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'god', 'manager', 'ik')
    )
  );

-- UPDATE
create policy "managers can update barem failures"
  on hr_mt_barem_failures for update
  using (
    (select private.is_god())
    OR organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'god', 'manager', 'ik')
    )
  )
  with check (
    (select private.is_god())
    OR organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'god', 'manager', 'ik')
    )
  );

-- DELETE
create policy "managers can delete barem failures"
  on hr_mt_barem_failures for delete
  using (
    (select private.is_god())
    OR organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'god', 'manager', 'ik')
    )
  );
