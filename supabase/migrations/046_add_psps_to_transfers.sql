-- ============================================================================
-- Migration 046: Add PSPs (Payment Service Providers) to Transfers
-- ============================================================================

-- Create PSPs table
CREATE TABLE IF NOT EXISTS public.psps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0100, -- 1% default
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_internal BOOLEAN NOT NULL DEFAULT false, -- Internal PSPs have 0% commission
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- Add psp_id column to transfers table
ALTER TABLE public.transfers
ADD COLUMN IF NOT EXISTS psp_id UUID REFERENCES public.psps(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.psps ENABLE ROW LEVEL SECURITY;

-- RLS policies for PSPs
-- God users can view all PSPs
CREATE POLICY "God users can view all PSPs"
  ON public.psps
  FOR SELECT
  USING (private.is_god());

-- Users can view PSPs in their organizations
CREATE POLICY "Users can view PSPs in their orgs"
  ON public.psps
  FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- God users can insert PSPs to any organization
CREATE POLICY "God users can insert PSPs"
  ON public.psps
  FOR INSERT
  WITH CHECK (private.is_god());

-- Admins can insert PSPs to their organizations
CREATE POLICY "Admins can insert PSPs to their orgs"
  ON public.psps
  FOR INSERT
  WITH CHECK (
    private.is_org_admin(organization_id)
  );

-- God users can update PSPs
CREATE POLICY "God users can update PSPs"
  ON public.psps
  FOR UPDATE
  USING (private.is_god())
  WITH CHECK (private.is_god());

-- Admins can update PSPs in their organizations
CREATE POLICY "Admins can update PSPs in their orgs"
  ON public.psps
  FOR UPDATE
  USING (
    private.is_org_admin(organization_id)
  )
  WITH CHECK (
    private.is_org_admin(organization_id)
  );

-- God users can delete PSPs
CREATE POLICY "God users can delete PSPs"
  ON public.psps
  FOR DELETE
  USING (private.is_god());

-- Admins can delete PSPs in their organizations
CREATE POLICY "Admins can delete PSPs in their orgs"
  ON public.psps
  FOR DELETE
  USING (
    private.is_org_admin(organization_id)
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_psps_organization_id ON public.psps(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfers_psp_id ON public.transfers(psp_id);

-- Add updated_at trigger for PSPs (uses existing function from migration 017)
CREATE TRIGGER on_psp_updated
  BEFORE UPDATE ON public.psps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert PSPs for ORDERINVEST organization (from psp-names.txt)
-- These will be created with 1% commission rate as requested
WITH org AS (
  SELECT id FROM public.organizations WHERE name = 'ORDERINVEST' LIMIT 1
)
INSERT INTO public.psps (organization_id, name, commission_rate, is_active)
SELECT
  org.id,
  psp_name,
  0.0100, -- 1% commission
  true
FROM org
CROSS JOIN (VALUES
  ('#70 CRYPPAY'),
  ('#72 CRYPPAY'),
  ('#72 CRYPPAY 10'),
  ('70 BLOKE'),
  ('72 BLOKE'),
  ('FSK'),
  ('TETHER')
) AS psps(psp_name)
WHERE org.id IS NOT NULL
ON CONFLICT (organization_id, name) DO NOTHING;

-- ============================================================================
-- Verification Query
-- ============================================================================
SELECT
  '✅ PSPs Created' as status,
  COUNT(*) as total_psps,
  STRING_AGG(name, ', ' ORDER BY name) as psp_names
FROM public.psps
WHERE organization_id = (SELECT id FROM public.organizations WHERE name = 'ORDERINVEST');
