-- ============================================================================
-- RLS (Row Level Security) Policy Audit Tests
-- ============================================================================
-- Project:  PipLinePro V2
-- Created:  2026-03-02
-- Purpose:  Manual verification of RLS policies across all tables
--
-- HOW TO USE:
-- -----------
-- 1. Run these tests against a **test/staging** database, never production.
-- 2. You need seed data. The "SEED DATA" section below creates the minimum
--    rows required for the tests. Run it first as a superuser/service_role.
-- 3. Each test block uses SET LOCAL to impersonate a specific user context.
--    Wrap each block in a transaction:
--      BEGIN; ... ROLLBACK;
--    so the SET LOCAL changes are scoped and no data is permanently modified.
-- 4. After each query, compare the result to the "Expected:" comment.
-- 5. If a test fails (e.g., returns rows when it should return 0), that
--    indicates an RLS gap that needs investigation.
--
-- IMPORTANT:
-- ----------
-- - SET LOCAL role / request.jwt.claims only works within a transaction.
-- - private.is_god(), private.get_user_org_ids(), etc. rely on auth.uid()
--   which reads the 'sub' claim from request.jwt.claims.
-- - The auth.uid() function in Supabase reads:
--     current_setting('request.jwt.claims', true)::json->>'sub'
-- - To simulate auth.uid(), set request.jwt.claims with a valid 'sub' field.
--
-- ROLE HIERARCHY (final state after all migrations):
-- --------------------------------------------------
--   God        : system_role = 'god' on profiles. Cross-org super-admin.
--   Admin      : role = 'admin' on organization_members. Org-level admin.
--   Manager    : role = 'manager' on organization_members. Mid-level.
--   Operation  : role = 'operation' on organization_members. CRUD on ops data.
--
-- KEY PRIVATE HELPERS:
-- --------------------
--   private.is_god()                    - true if profiles.system_role = 'god'
--   private.get_user_org_ids()          - returns org UUIDs for current user
--   private.is_org_admin(_org_id)       - true if user is 'admin' in that org
--   private.is_org_admin_or_manager()   - true if user is 'admin' or 'manager'
--   private.is_any_org_admin()          - true if user is 'admin' in ANY org
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SEED DATA (run as service_role / superuser)                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- These are deterministic UUIDs so every test can reference them reliably.
-- Adjust as needed for your test database.

-- NOTE: In a real Supabase environment, profiles are created via the
-- handle_new_user() trigger when auth.users rows are inserted. For test
-- purposes, we insert directly. You may need to insert into auth.users
-- first, or disable the trigger temporarily.

-- Test UUIDs (deterministic for reproducibility)
-- god_user:         11111111-1111-1111-1111-111111111111
-- org_a_admin:      22222222-2222-2222-2222-222222222222
-- org_a_manager:    33333333-3333-3333-3333-333333333333
-- org_a_operation:  44444444-4444-4444-4444-444444444444
-- org_b_admin:      55555555-5555-5555-5555-555555555555
-- outsider_user:    66666666-6666-6666-6666-666666666666
-- org_a:            aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- org_b:            bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb

/*
-- Uncomment and run this block as service_role to set up test data:
-- (You will also need matching auth.users rows for auth.uid() to work)

INSERT INTO public.profiles (id, system_role, display_name, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'god',  'God Admin',       'god@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'user', 'Org A Admin',     'admin-a@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'user', 'Org A Manager',   'manager-a@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'user', 'Org A Operation', 'operation-a@test.com'),
  ('55555555-5555-5555-5555-555555555555', 'user', 'Org B Admin',     'admin-b@test.com'),
  ('66666666-6666-6666-6666-666666666666', 'user', 'Outsider',        'outsider@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name, slug) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Organization A', 'org-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Organization B', 'org-b')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'manager'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'operation'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'admin')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Seed a transfer in Org A (assumes lookup tables already have data from 008)
INSERT INTO public.transfers (
  id, organization_id, full_name, amount, amount_try, amount_usd,
  currency, category_id, payment_method_id, type_id, transfer_date
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Test Customer', 1000, 1000, 30,
  'TRY', 'dep', 'bank', 'client', now()
) ON CONFLICT (id) DO NOTHING;

-- Seed a transfer in Org B
INSERT INTO public.transfers (
  id, organization_id, full_name, amount, amount_try, amount_usd,
  currency, category_id, payment_method_id, type_id, transfer_date
) VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Other Customer', 2000, 2000, 60,
  'TRY', 'dep', 'bank', 'client', now()
) ON CONFLICT (id) DO NOTHING;

-- Seed accounting entry in Org A
INSERT INTO public.accounting_entries (
  id, organization_id, register, entry_type, direction, amount, entry_date
) VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'USDT', 'ODEME', 'out', 500, now()
) ON CONFLICT (id) DO NOTHING;

-- Seed accounting entry in Org B
INSERT INTO public.accounting_entries (
  id, organization_id, register, entry_type, direction, amount, entry_date
) VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'NAKIT_TL', 'TRANSFER', 'in', 1000, now()
) ON CONFLICT (id) DO NOTHING;

-- Seed invitation for Org A
INSERT INTO public.organization_invitations (
  id, organization_id, email, role, invited_by, status
) VALUES (
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'newuser@test.com', 'operation',
  '22222222-2222-2222-2222-222222222222', 'pending'
) ON CONFLICT (id) DO NOTHING;

-- If HR tables exist, seed HR data:
-- INSERT INTO hr_employees (...) ...
-- INSERT INTO hr_attendance (...) ...
-- INSERT INTO hr_settings (...) ...
-- INSERT INTO hr_leaves (...) ...
*/


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  HELPER: Context-setting macros                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Use these patterns inside a BEGIN...ROLLBACK block to impersonate users.
--
-- Anon (unauthenticated):
--   SET LOCAL role = 'anon';
--
-- God user:
--   SET LOCAL role = 'authenticated';
--   SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';
--
-- Org A Admin:
--   SET LOCAL role = 'authenticated';
--   SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';
--
-- Org A Manager:
--   SET LOCAL role = 'authenticated';
--   SET LOCAL request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "user_role": "user"}';
--
-- Org A Operation:
--   SET LOCAL role = 'authenticated';
--   SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';
--
-- Org B Admin:
--   SET LOCAL role = 'authenticated';
--   SET LOCAL request.jwt.claims = '{"sub": "55555555-5555-5555-5555-555555555555", "user_role": "user"}';
--
-- Outsider (authenticated but no org membership):
--   SET LOCAL role = 'authenticated';
--   SET LOCAL request.jwt.claims = '{"sub": "66666666-6666-6666-6666-666666666666", "user_role": "user"}';


-- ############################################################################
-- #                                                                          #
-- #   1. PROFILES TABLE                                                      #
-- #                                                                          #
-- #   Policy (007 final):                                                    #
-- #     SELECT: own profile | god sees all | co-members visible              #
-- #             (god profiles hidden from non-gods)                          #
-- #     UPDATE: own profile | god                                            #
-- #     INSERT: blocked (trigger only)                                       #
-- #     DELETE: blocked (cascade from auth.users)                            #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 1.1: Anon cannot read any profiles
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'anon';

  SELECT count(*) AS profile_count FROM public.profiles;
  -- Expected: 0 (anon has no SELECT policy on profiles)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 1.2: Authenticated user can read their own profile
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS profile_count
  FROM public.profiles
  WHERE id = '44444444-4444-4444-4444-444444444444';
  -- Expected: 1
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 1.3: God can read ALL profiles (including other gods)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';

  SELECT count(*) AS profile_count FROM public.profiles;
  -- Expected: total number of profiles in the database (6 with seed data)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 1.4: Non-god user can see co-members of their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  -- Org A operation should see Org A admin (22...) and Org A manager (33...)
  SELECT count(*) AS visible_profiles
  FROM public.profiles
  WHERE id IN (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  );
  -- Expected: 2
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 1.5: Non-god user CANNOT see god profiles
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS god_visible
  FROM public.profiles
  WHERE id = '11111111-1111-1111-1111-111111111111';
  -- Expected: 0 (god profiles are hidden from non-gods via system_role != 'god' filter)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 1.6: Non-god user CANNOT see profiles from other orgs
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  -- Org B admin should NOT be visible to Org A operation
  SELECT count(*) AS other_org_visible
  FROM public.profiles
  WHERE id = '55555555-5555-5555-5555-555555555555';
  -- Expected: 0
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 1.7: Direct INSERT into profiles is blocked
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  INSERT INTO public.profiles (id, system_role, display_name)
  VALUES ('77777777-7777-7777-7777-777777777777', 'user', 'Hacker');
  -- Expected: ERROR (policy "profiles_insert" WITH CHECK (false) blocks all)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 1.8: User can update their own profile
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  UPDATE public.profiles
  SET display_name = 'Updated Name'
  WHERE id = '44444444-4444-4444-4444-444444444444';
  -- Expected: 1 row updated (no error)

  SELECT display_name FROM public.profiles WHERE id = '44444444-4444-4444-4444-444444444444';
  -- Expected: 'Updated Name'
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 1.9: User CANNOT update another user's profile
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  UPDATE public.profiles
  SET display_name = 'Hacked Name'
  WHERE id = '22222222-2222-2222-2222-222222222222';
  -- Expected: 0 rows updated (RLS silently filters the target row)
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   2. ORGANIZATIONS TABLE                                                 #
-- #                                                                          #
-- #   Policy (007 + 059 + 066 final):                                        #
-- #     SELECT: god | any-org-admin (all orgs) | own orgs                    #
-- #     INSERT: god only                                                     #
-- #     UPDATE: god | org admin (is_org_admin)                               #
-- #     DELETE: god only                                                     #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 2.1: Anon cannot see any organizations
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'anon';

  SELECT count(*) AS org_count FROM public.organizations;
  -- Expected: 0
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 2.2: Org member sees only their own org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS org_count FROM public.organizations;
  -- Expected: 1 (only Org A)

  SELECT id FROM public.organizations;
  -- Expected: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 2.3: God can see ALL organizations
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';

  SELECT count(*) AS org_count FROM public.organizations;
  -- Expected: 2 (Org A + Org B, with seed data)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 2.4: Org Admin (of any org) can see ALL organizations
--           (migration 066: is_any_org_admin)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS org_count FROM public.organizations;
  -- Expected: 2 (admin of Org A can see all orgs due to is_any_org_admin policy)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 2.5: Manager cannot see other orgs (only their own)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "user_role": "user"}';

  SELECT count(*) AS org_count FROM public.organizations;
  -- Expected: 1 (only Org A; manager is NOT counted as any-org-admin)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 2.6: Outsider (no org membership) cannot see any organizations
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "66666666-6666-6666-6666-666666666666", "user_role": "user"}';

  SELECT count(*) AS org_count FROM public.organizations;
  -- Expected: 0
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 2.7: Only god can INSERT organizations
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  INSERT INTO public.organizations (id, name, slug)
  VALUES ('12345678-1234-1234-1234-123456789012', 'Test Org', 'test-org');
  -- Expected: ERROR (only god can insert; migration 059 reverted admin insert)
ROLLBACK;

BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';

  INSERT INTO public.organizations (id, name, slug)
  VALUES ('12345678-1234-1234-1234-123456789012', 'Test Org', 'test-org');
  -- Expected: SUCCESS (god can insert)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 2.8: Org admin can UPDATE their own org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  UPDATE public.organizations SET name = 'Org A Updated'
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 1 row updated (is_org_admin check passes for admin of Org A)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 2.9: Operation user CANNOT update the org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  UPDATE public.organizations SET name = 'Hacked Org Name'
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0 rows updated (operation is not admin)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 2.10: Only god can DELETE organizations
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  DELETE FROM public.organizations WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0 rows deleted (admin cannot delete)
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   3. ORGANIZATION_MEMBERS TABLE                                          #
-- #                                                                          #
-- #   Policy (007 + 059 final):                                              #
-- #     SELECT: god | co-members of own orgs                                 #
-- #     INSERT: god | admin_or_manager of target org                         #
-- #     UPDATE: god | admin_or_manager of target org                         #
-- #     DELETE: god | admin_or_manager (but cannot delete themselves)         #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 3.1: Org member can see co-members of their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS member_count
  FROM public.organization_members
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 3 (admin + manager + operation in Org A)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 3.2: Org member CANNOT see members of other orgs
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS other_org_members
  FROM public.organization_members
  WHERE organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  -- Expected: 0
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 3.3: God can see ALL members across all orgs
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';

  SELECT count(*) AS total_members FROM public.organization_members;
  -- Expected: 4 (3 in Org A + 1 in Org B, with seed data)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 3.4: Admin can add a member to their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'operation');
  -- Expected: SUCCESS (admin of Org A can insert members via is_org_admin_or_manager)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 3.5: Manager can add a member to their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "user_role": "user"}';

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'operation');
  -- Expected: SUCCESS (manager of Org A can insert via is_org_admin_or_manager)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 3.6: Operation CANNOT add members
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'operation');
  -- Expected: ERROR (operation is not admin/manager)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 3.7: Admin CANNOT add members to a DIFFERENT org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', 'operation');
  -- Expected: ERROR (admin of Org A is not admin/manager of Org B)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 3.8: Admin/Manager cannot delete themselves from org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  DELETE FROM public.organization_members
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    AND user_id = '22222222-2222-2222-2222-222222222222';
  -- Expected: 0 rows deleted (policy: user_id != auth.uid())
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 3.9: Admin CAN delete other members from their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  DELETE FROM public.organization_members
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    AND user_id = '44444444-4444-4444-4444-444444444444';
  -- Expected: 1 row deleted (admin can remove operation user from their org)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 3.10: Outsider cannot see any members
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "66666666-6666-6666-6666-666666666666", "user_role": "user"}';

  SELECT count(*) AS member_count FROM public.organization_members;
  -- Expected: 0
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   4. ORGANIZATION_INVITATIONS TABLE                                      #
-- #                                                                          #
-- #   Policy (059 final):                                                    #
-- #     ALL ops: god | admin_or_manager of the invitation's org              #
-- #     Operation role has NO access.                                        #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 4.1: Admin can see invitations for their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS invitation_count
  FROM public.organization_invitations
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 1 (the seeded pending invitation)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 4.2: Manager can see invitations for their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "user_role": "user"}';

  SELECT count(*) AS invitation_count
  FROM public.organization_invitations
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 1
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 4.3: Operation CANNOT see invitations
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS invitation_count
  FROM public.organization_invitations;
  -- Expected: 0 (operation has no access to invitations)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 4.4: Admin can create invitations for their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  INSERT INTO public.organization_invitations (organization_id, email, role, invited_by)
  VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'another@test.com', 'operation',
    '22222222-2222-2222-2222-222222222222'
  );
  -- Expected: SUCCESS
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 4.5: Admin CANNOT create invitations for OTHER org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  INSERT INTO public.organization_invitations (organization_id, email, role, invited_by)
  VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'another@test.com', 'operation',
    '22222222-2222-2222-2222-222222222222'
  );
  -- Expected: ERROR (not admin/manager of Org B)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 4.6: God can manage invitations for any org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';

  SELECT count(*) AS all_invitations FROM public.organization_invitations;
  -- Expected: 1 (or more, all visible to god)
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   5. TRANSFERS TABLE                                                     #
-- #                                                                          #
-- #   Policy (008 + 059 final):                                              #
-- #     SELECT: god | org members                                            #
-- #     INSERT: god | org members (all roles can create)                     #
-- #     UPDATE: god | org members (all roles can update)                     #
-- #     DELETE: god | admin_or_manager of the transfer's org                 #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 5.1: Org member can see transfers for their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS transfer_count
  FROM public.transfers
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: >= 1 (at least the seeded transfer)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 5.2: Org member CANNOT see transfers from other orgs
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS other_org_transfers
  FROM public.transfers
  WHERE organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  -- Expected: 0
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 5.3: God can see ALL transfers
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';

  SELECT count(*) AS total_transfers FROM public.transfers;
  -- Expected: >= 2 (transfers from both orgs)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 5.4: Operation role CAN create transfers in their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  INSERT INTO public.transfers (
    organization_id, full_name, amount, amount_try, amount_usd,
    currency, category_id, payment_method_id, type_id, transfer_date
  ) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'New Customer', 500, 500, 15,
    'TRY', 'dep', 'bank', 'client', now()
  );
  -- Expected: SUCCESS (all org members can insert)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 5.5: Operation CANNOT create transfers for other org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  INSERT INTO public.transfers (
    organization_id, full_name, amount, amount_try, amount_usd,
    currency, category_id, payment_method_id, type_id, transfer_date
  ) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Sneaky Transfer', 500, 500, 15,
    'TRY', 'dep', 'bank', 'client', now()
  );
  -- Expected: ERROR (not a member of Org B)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 5.6: Operation CANNOT delete transfers (admin/manager only)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  DELETE FROM public.transfers
  WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  -- Expected: 0 rows deleted (operation is not admin/manager)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 5.7: Admin CAN delete transfers in their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  DELETE FROM public.transfers
  WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  -- Expected: 1 row deleted (admin via is_org_admin_or_manager)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 5.8: Manager CAN delete transfers in their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "user_role": "user"}';

  DELETE FROM public.transfers
  WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  -- Expected: 1 row deleted (manager via is_org_admin_or_manager)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 5.9: Anon cannot see any transfers
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'anon';

  SELECT count(*) AS transfer_count FROM public.transfers;
  -- Expected: 0
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 5.10: Outsider cannot see any transfers
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "66666666-6666-6666-6666-666666666666", "user_role": "user"}';

  SELECT count(*) AS transfer_count FROM public.transfers;
  -- Expected: 0
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   6. ACCOUNTING_ENTRIES TABLE                                            #
-- #                                                                          #
-- #   Policy (059 final):                                                    #
-- #     ALL ops: god | admin_or_manager of the entry's org                   #
-- #     Operation role has NO access.                                        #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 6.1: Admin can see accounting entries for their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS entry_count
  FROM public.accounting_entries
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: >= 1
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 6.2: Manager can see accounting entries for their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "user_role": "user"}';

  SELECT count(*) AS entry_count
  FROM public.accounting_entries
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: >= 1
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 6.3: Operation CANNOT see accounting entries
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS entry_count
  FROM public.accounting_entries;
  -- Expected: 0 (operation excluded by is_org_admin_or_manager policy)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 6.4: Admin CANNOT see accounting entries from other org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS other_org_entries
  FROM public.accounting_entries
  WHERE organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  -- Expected: 0
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 6.5: God can see ALL accounting entries
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';

  SELECT count(*) AS total_entries FROM public.accounting_entries;
  -- Expected: >= 2 (entries from both orgs)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 6.6: Admin can insert accounting entries
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  INSERT INTO public.accounting_entries (
    organization_id, register, entry_type, direction, amount, entry_date
  ) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'NAKIT_TL', 'ODEME', 'out', 100, now()
  );
  -- Expected: SUCCESS
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 6.7: Operation CANNOT insert accounting entries
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  INSERT INTO public.accounting_entries (
    organization_id, register, entry_type, direction, amount, entry_date
  ) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'NAKIT_TL', 'ODEME', 'out', 100, now()
  );
  -- Expected: ERROR (operation excluded)
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   7. ACCOUNTING_MONTHLY_CONFIG TABLE                                     #
-- #                                                                          #
-- #   Policy (059 final):                                                    #
-- #     ALL ops: god | admin_or_manager of the config's org                  #
-- #     Operation role has NO access.                                        #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 7.1: Admin can see config
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS config_count
  FROM public.accounting_monthly_config
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0 or more (depends on seed data)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 7.2: Operation CANNOT see config
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS config_count FROM public.accounting_monthly_config;
  -- Expected: 0
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   8. PSPs TABLE                                                          #
-- #                                                                          #
-- #   Policy (008 final, unchanged by 059):                                  #
-- #     SELECT: god | org members                                            #
-- #     INSERT/UPDATE/DELETE: god | org admin (is_org_admin, admin only)      #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 8.1: Org member can see PSPs for their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS psp_count
  FROM public.psps
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+ (depends on seed data; operation CAN see PSPs)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 8.2: Org member CANNOT see PSPs from other org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS other_psp_count
  FROM public.psps
  WHERE organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  -- Expected: 0
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 8.3: Operation CANNOT create/update/delete PSPs (admin only)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  INSERT INTO public.psps (organization_id, name, commission_rate)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fake PSP', 0.05);
  -- Expected: ERROR (operation not admin)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 8.4: Manager CANNOT create PSPs (admin only, not admin_or_manager)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "user_role": "user"}';

  INSERT INTO public.psps (organization_id, name, commission_rate)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Manager PSP', 0.03);
  -- Expected: ERROR (manager is not checked by is_org_admin for PSPs)
  -- NOTE: PSP write policies use is_org_admin (admin only), NOT is_org_admin_or_manager
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 8.5: Admin CAN create PSPs
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  INSERT INTO public.psps (organization_id, name, commission_rate)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Admin PSP', 0.04);
  -- Expected: SUCCESS
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   9. PSP_COMMISSION_RATES TABLE                                          #
-- #                                                                          #
-- #   Policy (008):                                                          #
-- #     SELECT: god | org members                                            #
-- #     INSERT/DELETE: god | org admin                                       #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 9.1: Operation can READ psp rates but CANNOT insert
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS rate_count FROM public.psp_commission_rates
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+ (operation CAN read)

  -- Try to insert (should fail)
  -- INSERT INTO public.psp_commission_rates (psp_id, organization_id, commission_rate, effective_from)
  -- VALUES ('some-psp-id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0.05, '2026-01-01');
  -- Expected: ERROR (if uncommented; operation is not admin)
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   10. PSP_SETTLEMENTS TABLE                                              #
-- #                                                                          #
-- #   Policy (008):                                                          #
-- #     SELECT: god | org members                                            #
-- #     INSERT/UPDATE/DELETE: god | org admin                                #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 10.1: Operation can READ settlements but CANNOT insert
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS settlement_count FROM public.psp_settlements
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+ (operation CAN read)
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   11. EXCHANGE_RATES TABLE                                               #
-- #                                                                          #
-- #   Policy (008):                                                          #
-- #     SELECT/INSERT/UPDATE: god | org members                              #
-- #     (All org members can manage exchange rates)                           #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 11.1: Operation can read and insert exchange rates
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS rate_count FROM public.exchange_rates
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+ (operation CAN read)

  INSERT INTO public.exchange_rates (organization_id, rate_date, rate)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-03-01', 35.50);
  -- Expected: SUCCESS (all org members can insert)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 11.2: Outsider cannot read or insert exchange rates
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "66666666-6666-6666-6666-666666666666", "user_role": "user"}';

  SELECT count(*) AS rate_count FROM public.exchange_rates;
  -- Expected: 0
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   12. TRANSFER_AUDIT_LOG TABLE                                           #
-- #                                                                          #
-- #   Policy (008 + 061):                                                    #
-- #     SELECT: god | org members                                            #
-- #     INSERT: blocked (false) -- only via trigger (security definer)       #
-- #     UPDATE/DELETE: (no policy = denied)                                  #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 12.1: Org member can read audit log for their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS audit_count
  FROM public.transfer_audit_log
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+ (operation CAN read)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 12.2: Direct INSERT into audit log is blocked
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  INSERT INTO public.transfer_audit_log (
    transfer_id, organization_id, action, performed_by
  ) VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'manual_insert', '22222222-2222-2222-2222-222222222222'
  );
  -- Expected: ERROR (audit_insert_blocked policy WITH CHECK (false))
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   13. WALLETS & WALLET_SNAPSHOTS TABLES                                  #
-- #                                                                          #
-- #   Policy (008):                                                          #
-- #     ALL ops: god | org members                                           #
-- #     (All org members have full CRUD access)                              #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 13.1: Operation can read wallets for their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS wallet_count FROM public.wallets
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+ (operation CAN read)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 13.2: Outsider cannot read wallets
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "66666666-6666-6666-6666-666666666666", "user_role": "user"}';

  SELECT count(*) AS wallet_count FROM public.wallets;
  -- Expected: 0
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   14. BLOKE_RESOLUTIONS TABLE                                            #
-- #                                                                          #
-- #   Policy (064):                                                          #
-- #     SELECT: god | org members                                            #
-- #     INSERT/UPDATE/DELETE: god | org admin (is_org_admin, admin only)      #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 14.1: Operation can read bloke resolutions
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS resolution_count FROM public.bloke_resolutions
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+ (operation CAN read)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 14.2: Operation CANNOT insert or update bloke resolutions
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  -- Attempt to resolve a bloke (should fail for operation)
  UPDATE public.bloke_resolutions
  SET status = 'resolved', resolution_date = current_date
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0 rows updated (operation is not admin)
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   15. LOGIN_ATTEMPTS TABLE                                               #
-- #                                                                          #
-- #   Policy (023 + 048):                                                    #
-- #     SELECT: own rows | god | admin/manager (in any org)                  #
-- #     INSERT/UPDATE/DELETE: no policies (backend only)                     #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 15.1: User can see their own login attempts
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS attempt_count
  FROM public.login_attempts
  WHERE user_id = '44444444-4444-4444-4444-444444444444';
  -- Expected: 0+ (own rows visible)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 15.2: Operation CANNOT see other users' login attempts
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS other_attempts
  FROM public.login_attempts
  WHERE user_id = '22222222-2222-2222-2222-222222222222';
  -- Expected: 0 (cannot see other users' attempts; operation is not admin/manager)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 15.3: Admin/Manager can see ALL login attempts (migration 048)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS all_attempts FROM public.login_attempts;
  -- Expected: total number of login_attempts rows (admin has global read via 048)
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   16. TRUSTED_DEVICES TABLE                                              #
-- #                                                                          #
-- #   Policy (041):                                                          #
-- #     ALL ops: own rows only (user_id = auth.uid())                        #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 16.1: User can see and manage their own trusted devices
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS device_count FROM public.trusted_devices
  WHERE user_id = '44444444-4444-4444-4444-444444444444';
  -- Expected: 0+ (own devices visible)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 16.2: User CANNOT see other users' devices
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS other_devices FROM public.trusted_devices
  WHERE user_id = '22222222-2222-2222-2222-222222222222';
  -- Expected: 0
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 16.3: God has NO special access to other users' devices
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';

  SELECT count(*) AS all_devices FROM public.trusted_devices;
  -- Expected: only god's own devices (no god override in trusted_devices policy)
  -- NOTE: This is by design -- trusted devices are strictly personal.
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   17. GOD_AUDIT_LOG TABLE                                                #
-- #                                                                          #
-- #   Policy (043 + 048):                                                    #
-- #     SELECT: god | admin/manager (in any org)                             #
-- #     INSERT: all authenticated (used by security definer triggers)        #
-- #     UPDATE: blocked (immutable)                                          #
-- #     DELETE: blocked (immutable)                                          #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 17.1: God can read audit logs
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';

  SELECT count(*) AS audit_count FROM public.god_audit_log;
  -- Expected: 0+ (god can read all)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 17.2: Admin can read audit logs (migration 048)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS audit_count FROM public.god_audit_log;
  -- Expected: 0+ (admin has read access via 048 policy update)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 17.3: Operation CANNOT read audit logs
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS audit_count FROM public.god_audit_log;
  -- Expected: 0
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 17.4: Audit logs are immutable (UPDATE blocked)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';

  UPDATE public.god_audit_log SET action = 'HACKED' WHERE id IS NOT NULL;
  -- Expected: 0 rows updated (god_audit_log_no_update policy USING(false))
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 17.5: Audit logs are immutable (DELETE blocked)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';

  DELETE FROM public.god_audit_log WHERE id IS NOT NULL;
  -- Expected: 0 rows deleted (god_audit_log_no_delete policy USING(false))
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   18. CAPTCHA_CHALLENGES TABLE                                           #
-- #                                                                          #
-- #   Policy (024):                                                          #
-- #     SELECT: own rows | god                                               #
-- #     INSERT/UPDATE/DELETE: no policies (backend only)                     #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 18.1: User can see own captcha challenges
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS captcha_count FROM public.captcha_challenges
  WHERE user_id = '44444444-4444-4444-4444-444444444444';
  -- Expected: 0+ (own rows)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 18.2: User CANNOT see other users' captcha challenges
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS other_captcha FROM public.captcha_challenges
  WHERE user_id = '22222222-2222-2222-2222-222222222222';
  -- Expected: 0
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   19. ORGANIZATION_PINS TABLE                                            #
-- #                                                                          #
-- #   Policy (076):                                                          #
-- #     SELECT/INSERT/UPDATE: god | org admin (is_org_admin)                 #
-- #     DELETE: no policy (denied)                                           #
-- #     Manager/Operation have NO access.                                    #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 19.1: Admin can see their org's PIN
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS pin_count FROM public.organization_pins
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+ (admin CAN read)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 19.2: Manager CANNOT see org PINs
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "user_role": "user"}';

  SELECT count(*) AS pin_count FROM public.organization_pins;
  -- Expected: 0 (manager is not admin; is_org_admin checks admin only)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 19.3: Operation CANNOT see org PINs
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS pin_count FROM public.organization_pins;
  -- Expected: 0
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   20. UNIPAYMENT_SYNC_LOG TABLE                                          #
-- #                                                                          #
-- #   Policy (067):                                                          #
-- #     SELECT: org members (via direct subquery on organization_members)    #
-- #     ALL (write): admin/manager of the org (role IN admin, manager, god)  #
-- #     NOTE: Uses direct subquery, not private helpers.                     #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 20.1: Operation can READ sync log
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS sync_count FROM public.unipayment_sync_log;
  -- Expected: 0+ (operation is an org member, can read)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 20.2: Outsider CANNOT read sync log
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "66666666-6666-6666-6666-666666666666", "user_role": "user"}';

  SELECT count(*) AS sync_count FROM public.unipayment_sync_log;
  -- Expected: 0
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   21. HR TABLES (hr_employees, hr_attendance, hr_salary_payments,        #
-- #       hr_bonus_agreements, hr_bonus_payments, hr_settings, hr_leaves)    #
-- #                                                                          #
-- #   NOTE: hr_employees, hr_attendance, hr_salary_payments,                 #
-- #         hr_bonus_agreements, hr_bonus_payments, and hr_settings           #
-- #         were created outside the numbered migration files (likely via     #
-- #         SQL Editor). Their RLS policies are assumed to follow the same    #
-- #         pattern as hr_leaves and hr_settings (migration 073, 075):       #
-- #                                                                          #
-- #   hr_settings (073 final):                                               #
-- #     ALL ops: god | admin/manager of the org                              #
-- #                                                                          #
-- #   hr_leaves (075):                                                       #
-- #     SELECT: god | org members                                            #
-- #     ALL (write): god | admin/manager of the org                          #
-- #                                                                          #
-- #   hr_employees (assumed):                                                #
-- #     SELECT: god | org members (or admin/manager)                         #
-- #     WRITE: god | admin/manager                                           #
-- #                                                                          #
-- #   hr_attendance (assumed):                                               #
-- #     SELECT: god | org members                                            #
-- #     WRITE: god | admin/manager                                           #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 21.1: Admin can see HR employees for their org
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS employee_count
  FROM hr_employees
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+ (admin CAN read HR employees)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 21.2: God can see ALL HR employees
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';

  SELECT count(*) AS employee_count FROM hr_employees;
  -- Expected: total HR employees across all orgs
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 21.3: Operation access to HR employees
-- NOTE: Verify whether operation role has SELECT access.
-- If HR follows the hr_leaves pattern, operation CAN read.
-- If HR follows the hr_settings pattern, operation CANNOT read.
-- This test helps you determine which pattern is used.
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS employee_count FROM hr_employees;
  -- Expected: Depends on actual policy:
  --   If hr_leaves pattern (org members can read):  0+ rows
  --   If hr_settings pattern (admin/manager only):  0 rows
  -- DOCUMENT THE ACTUAL RESULT to record which pattern is in use.
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 21.4: Operation CANNOT write to HR employees (expected)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  -- This should fail regardless of the read pattern
  INSERT INTO hr_employees (organization_id, full_name, email, role, salary_tl)
  VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Ghost Employee', 'ghost@test.com', 'developer', 10000
  );
  -- Expected: ERROR (operation cannot write to HR tables)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 21.5: Admin can read and write hr_settings
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS settings_count
  FROM hr_settings
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+ (admin CAN read)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 21.6: Manager can read and write hr_settings (migration 073)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "user_role": "user"}';

  SELECT count(*) AS settings_count
  FROM hr_settings
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+ (manager CAN read per migration 073)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 21.7: Operation CANNOT access hr_settings
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS settings_count FROM hr_settings;
  -- Expected: 0 (operation excluded from hr_settings)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 21.8: Admin can read hr_leaves
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS leave_count
  FROM hr_leaves
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+ (admin CAN read)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 21.9: Operation CAN read hr_leaves (org members have SELECT)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  SELECT count(*) AS leave_count FROM hr_leaves
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+ (operation CAN read hr_leaves per migration 075 policy)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 21.10: Operation CANNOT write to hr_leaves
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "user_role": "user"}';

  -- Attempt to insert a leave (should fail for operation)
  -- Requires a valid employee_id; this will fail on RLS before FK check
  INSERT INTO hr_leaves (employee_id, organization_id, leave_type, start_date, end_date)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'paid', '2026-04-01', '2026-04-05'
  );
  -- Expected: ERROR (operation cannot write to hr_leaves)
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 21.11: Admin can read hr_attendance
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS attendance_count
  FROM hr_attendance
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 21.12: Admin can read hr_salary_payments
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS salary_count
  FROM hr_salary_payments
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 21.13: Admin can read hr_bonus_agreements
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS bonus_count
  FROM hr_bonus_agreements
  WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  -- Expected: 0+
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   22. CROSS-CUTTING SECURITY TESTS                                       #
-- #                                                                          #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- TEST 22.1: Anon role has zero access to all key tables
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'anon';

  SELECT 'profiles'              AS t, count(*) FROM public.profiles
  UNION ALL
  SELECT 'organizations'         AS t, count(*) FROM public.organizations
  UNION ALL
  SELECT 'organization_members'  AS t, count(*) FROM public.organization_members
  UNION ALL
  SELECT 'transfers'             AS t, count(*) FROM public.transfers
  UNION ALL
  SELECT 'accounting_entries'    AS t, count(*) FROM public.accounting_entries
  UNION ALL
  SELECT 'psps'                  AS t, count(*) FROM public.psps;
  -- Expected: ALL rows return 0
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 22.2: Outsider (authenticated, no org) has zero access to org-scoped data
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "66666666-6666-6666-6666-666666666666", "user_role": "user"}';

  SELECT 'organizations'         AS t, count(*) FROM public.organizations
  UNION ALL
  SELECT 'organization_members'  AS t, count(*) FROM public.organization_members
  UNION ALL
  SELECT 'transfers'             AS t, count(*) FROM public.transfers
  UNION ALL
  SELECT 'accounting_entries'    AS t, count(*) FROM public.accounting_entries
  UNION ALL
  SELECT 'psps'                  AS t, count(*) FROM public.psps;
  -- Expected: ALL rows return 0

  -- But the outsider CAN see their own profile:
  SELECT count(*) AS own_profile FROM public.profiles
  WHERE id = '66666666-6666-6666-6666-666666666666';
  -- Expected: 1
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 22.3: God hiding — verify god profiles never leak to non-gods
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "user_role": "user"}';

  SELECT count(*) AS god_leak
  FROM public.profiles
  WHERE system_role = 'god';
  -- Expected: 0 (god profiles are invisible to non-gods)
  -- This is critical for the "hidden super-admin" security model.
ROLLBACK;

-- ---------------------------------------------------------------------------
-- TEST 22.4: God can see god profiles (including their own)
-- ---------------------------------------------------------------------------
BEGIN;
  SET LOCAL role = 'authenticated';
  SET LOCAL request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "user_role": "god"}';

  SELECT count(*) AS god_visible
  FROM public.profiles
  WHERE system_role = 'god';
  -- Expected: >= 1 (at least the current god user)
ROLLBACK;


-- ############################################################################
-- #                                                                          #
-- #   SUMMARY: RLS POLICY MATRIX (for reference)                             #
-- #                                                                          #
-- ############################################################################
--
-- Table                     | Anon | Outsider | Operation | Manager | Admin | God
-- ---------------------------+------+----------+-----------+---------+-------+-----
-- profiles (SELECT)         |  x   | own      | own+co    | own+co  | own+co| ALL
-- profiles (god hiding)     |  x   |    x     | hidden    | hidden  | hidden| visible
-- organizations (SELECT)    |  x   |    x     | own org   | own org | ALL*  | ALL
-- organization_members (S)  |  x   |    x     | own org   | own org | own org| ALL
-- organization_members (W)  |  x   |    x     |    x      | own org | own org| ALL
-- organization_invitations  |  x   |    x     |    x      | own org | own org| ALL
-- transfers (SELECT)        |  x   |    x     | own org   | own org | own org| ALL
-- transfers (INSERT/UPDATE) |  x   |    x     | own org   | own org | own org| ALL
-- transfers (DELETE)         |  x   |    x     |    x      | own org | own org| ALL
-- accounting_entries         |  x   |    x     |    x      | own org | own org| ALL
-- accounting_monthly_config |  x   |    x     |    x      | own org | own org| ALL
-- psps (SELECT)             |  x   |    x     | own org   | own org | own org| ALL
-- psps (WRITE)              |  x   |    x     |    x      |    x    | own org| ALL
-- psp_commission_rates (S)  |  x   |    x     | own org   | own org | own org| ALL
-- psp_commission_rates (W)  |  x   |    x     |    x      |    x    | own org| ALL
-- psp_settlements (SELECT)  |  x   |    x     | own org   | own org | own org| ALL
-- psp_settlements (WRITE)   |  x   |    x     |    x      |    x    | own org| ALL
-- exchange_rates            |  x   |    x     | own org   | own org | own org| ALL
-- transfer_audit_log (S)    |  x   |    x     | own org   | own org | own org| ALL
-- transfer_audit_log (W)    |  x   |    x     |    x      |    x    |    x  |  x
-- wallets/snapshots         |  x   |    x     | own org   | own org | own org| ALL
-- bloke_resolutions (S)     |  x   |    x     | own org   | own org | own org| ALL
-- bloke_resolutions (W)     |  x   |    x     |    x      |    x    | own org| ALL
-- login_attempts            |  x   | own      | own       | ALL**   | ALL** | ALL
-- trusted_devices           |  x   | own      | own       | own     | own   | own
-- god_audit_log (SELECT)    |  x   |    x     |    x      | ALL**   | ALL** | ALL
-- god_audit_log (WRITE)     |  x   |    x     |    x      |    x    |    x  |  x
-- captcha_challenges        |  x   | own      | own       | own     | own   | ALL
-- organization_pins         |  x   |    x     |    x      |    x    | own org| ALL
-- hr_settings               |  x   |    x     |    x      | own org | own org| ALL
-- hr_leaves (SELECT)        |  x   |    x     | own org   | own org | own org| ALL
-- hr_leaves (WRITE)         |  x   |    x     |    x      | own org | own org| ALL
-- hr_employees (check!)     |  x   |    x     |   ???     | own org | own org| ALL
-- hr_attendance (check!)    |  x   |    x     |   ???     | own org | own org| ALL
-- hr_salary_payments (check)|  x   |    x     |   ???     | own org | own org| ALL
-- hr_bonus_agreements/pmts  |  x   |    x     |   ???     | own org | own org| ALL
-- unipayment_sync_log (S)   |  x   |    x     | own org   | own org | own org| ALL
-- unipayment_sync_log (W)   |  x   |    x     |    x      | own org | own org| ALL
--
-- Legend:
--   x    = no access
--   own  = only own rows
--   co   = co-members in same org (minus god profiles)
--   ALL  = all rows
--   ALL* = migration 066: admin in any org sees all orgs
--   ALL**= migration 048: admin/manager in any org gets global read
--   ???  = HR table created outside tracked migrations; run tests to verify
--
-- ============================================================================
-- END OF RLS AUDIT TESTS
-- ============================================================================
