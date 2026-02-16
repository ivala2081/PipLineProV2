-- ============================================================================
-- COMPLETE PSP SETUP - Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Create PSPs table
CREATE TABLE IF NOT EXISTS public.psps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- Step 2: Add psp_id to transfers (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transfers' AND column_name = 'psp_id'
  ) THEN
    ALTER TABLE public.transfers
    ADD COLUMN psp_id UUID REFERENCES public.psps(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Enable RLS
ALTER TABLE public.psps ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies (if any)
DROP POLICY IF EXISTS "God users can view all PSPs" ON public.psps;
DROP POLICY IF EXISTS "Users can view PSPs in their orgs" ON public.psps;
DROP POLICY IF EXISTS "God users can insert PSPs" ON public.psps;
DROP POLICY IF EXISTS "Admins can insert PSPs to their orgs" ON public.psps;
DROP POLICY IF EXISTS "God users can update PSPs" ON public.psps;
DROP POLICY IF EXISTS "Admins can update PSPs in their orgs" ON public.psps;
DROP POLICY IF EXISTS "God users can delete PSPs" ON public.psps;
DROP POLICY IF EXISTS "Admins can delete PSPs in their orgs" ON public.psps;

-- Step 5: Create RLS policies
CREATE POLICY "God users can view all PSPs"
  ON public.psps FOR SELECT
  USING (private.is_god());

CREATE POLICY "Users can view PSPs in their orgs"
  ON public.psps FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "God users can insert PSPs"
  ON public.psps FOR INSERT
  WITH CHECK (private.is_god());

CREATE POLICY "Admins can insert PSPs to their orgs"
  ON public.psps FOR INSERT
  WITH CHECK (private.is_org_admin(organization_id));

CREATE POLICY "God users can update PSPs"
  ON public.psps FOR UPDATE
  USING (private.is_god())
  WITH CHECK (private.is_god());

CREATE POLICY "Admins can update PSPs in their orgs"
  ON public.psps FOR UPDATE
  USING (private.is_org_admin(organization_id))
  WITH CHECK (private.is_org_admin(organization_id));

CREATE POLICY "God users can delete PSPs"
  ON public.psps FOR DELETE
  USING (private.is_god());

CREATE POLICY "Admins can delete PSPs in their orgs"
  ON public.psps FOR DELETE
  USING (private.is_org_admin(organization_id));

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_psps_organization_id ON public.psps(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfers_psp_id ON public.transfers(psp_id);

-- Step 7: Add updated_at trigger
DROP TRIGGER IF EXISTS on_psp_updated ON public.psps;
CREATE TRIGGER on_psp_updated
  BEFORE UPDATE ON public.psps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- NOW INSERT YOUR PSPs BELOW (replace YOUR_ORG_ID with your actual org ID)
-- ============================================================================

-- First, find your organization ID:
SELECT id, name FROM public.organizations;

-- Then insert PSPs (uncomment and replace YOUR_ORG_ID):
/*
INSERT INTO public.psps (organization_id, name, commission_rate, is_active, is_internal)
VALUES
  ('YOUR_ORG_ID', 'Papara', 0.0100, true, false),
  ('YOUR_ORG_ID', 'Mefete', 0.0100, true, false),
  ('YOUR_ORG_ID', 'PayFix', 0.0100, true, false),
  ('YOUR_ORG_ID', 'Cryppay', 0.0100, true, false),
  ('YOUR_ORG_ID', 'Internal Account', 0.0000, true, true)
ON CONFLICT (organization_id, name) DO NOTHING;
*/

-- Verify PSPs were created:
SELECT
  p.name,
  p.commission_rate,
  p.is_active,
  p.is_internal,
  o.name as organization_name
FROM public.psps p
JOIN public.organizations o ON o.id = p.organization_id
ORDER BY p.name;

SELECT '✅ PSPs setup complete! Now uncomment and run the INSERT statement above.' AS status;
