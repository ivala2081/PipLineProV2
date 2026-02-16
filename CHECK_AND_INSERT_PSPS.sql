-- ============================================================================
-- CHECK AND INSERT PSPs
-- ============================================================================

-- Step 1: Check existing PSPs
SELECT
  p.id,
  p.name,
  p.commission_rate,
  p.is_active,
  o.name as organization_name
FROM public.psps p
JOIN public.organizations o ON o.id = p.organization_id
ORDER BY o.name, p.name;

-- Step 2: Get your organization IDs
SELECT id, name, slug FROM public.organizations;

-- Step 3: Insert PSPs for ORDERINVEST (replace with your org ID if different)
-- Copy the organization ID from Step 2 and paste it below
INSERT INTO public.psps (organization_id, name, commission_rate, is_active, is_internal)
SELECT
  o.id,
  p.psp_name,
  p.commission_rate,
  p.is_active,
  p.is_internal
FROM public.organizations o
CROSS JOIN (VALUES
  ('Papara', 0.0100, true, false),
  ('Mefete', 0.0100, true, false),
  ('PayFix', 0.0100, true, false),
  ('Cryppay', 0.0100, true, false),
  ('Bloke', 0.0100, true, false),
  ('Internal Account', 0.0000, true, true)
) AS p(psp_name, commission_rate, is_active, is_internal)
WHERE o.name = 'ORDERINVEST'  -- Change this to your organization name
ON CONFLICT (organization_id, name) DO NOTHING;

-- Step 4: Verify PSPs were inserted
SELECT
  COUNT(*) as total_psps,
  o.name as organization_name
FROM public.psps p
JOIN public.organizations o ON o.id = p.organization_id
GROUP BY o.name;

-- Step 5: List all PSPs
SELECT
  p.id,
  p.name,
  p.commission_rate * 100 as commission_percentage,
  p.is_active,
  p.is_internal,
  o.name as organization_name
FROM public.psps p
JOIN public.organizations o ON o.id = p.organization_id
ORDER BY o.name, p.name;
