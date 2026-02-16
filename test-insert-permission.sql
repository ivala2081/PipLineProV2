-- Test if current user can insert to transfers table
-- Run this in Supabase SQL Editor

-- Check current user's role
SELECT
  auth.uid() as user_id,
  (SELECT system_role FROM public.profiles WHERE id = auth.uid()) as system_role,
  (SELECT COUNT(*) FROM public.organization_members WHERE user_id = auth.uid()) as org_count;

-- Check if user has any organizations
SELECT
  om.organization_id,
  om.role,
  o.name as org_name
FROM public.organization_members om
JOIN public.organizations o ON o.id = om.organization_id
WHERE om.user_id = auth.uid();

-- Try to simulate an insert (will fail or succeed based on RLS)
-- IMPORTANT: This will actually insert if successful, so use a test value
-- Comment this out if you don't want to test
/*
INSERT INTO public.transfers (
  organization_id,
  full_name,
  transfer_date,
  amount,
  currency,
  category_id,
  payment_method_id,
  type_id,
  exchange_rate,
  amount_try,
  amount_usd,
  created_by
) VALUES (
  (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1),
  'TEST USER',
  '2026-01-01T00:00:00',
  100,
  'TL',
  'dep',
  'bank',
  'client',
  1,
  100,
  100,
  auth.uid()
);
*/
