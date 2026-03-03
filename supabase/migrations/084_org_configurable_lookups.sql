-- ============================================================================
-- 084: Org-Configurable Lookup Tables
-- Transfer Types and Payment Methods become per-org extensible.
-- Global system defaults remain (organization_id IS NULL).
-- Only 'blocked' is truly locked (is_system = true).
-- ============================================================================

-- ── 1. Add org scope columns ─────────────────────────────────────────────────

ALTER TABLE public.transfer_types
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_system       BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_system       BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Mark blocked as immutable system type ─────────────────────────────────

UPDATE public.transfer_types
SET is_system = true
WHERE id = 'blocked';

-- ── 3. Unique name constraint per org (case-insensitive) ─────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS transfer_types_org_name_unique
  ON public.transfer_types (organization_id, lower(name))
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_org_name_unique
  ON public.payment_methods (organization_id, lower(name))
  WHERE organization_id IS NOT NULL;

-- ── 4. RLS — transfer_types ───────────────────────────────────────────────────

ALTER TABLE public.transfer_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read transfer types"          ON public.transfer_types;
DROP POLICY IF EXISTS "Insert custom transfer types"  ON public.transfer_types;
DROP POLICY IF EXISTS "Update custom transfer types"  ON public.transfer_types;
DROP POLICY IF EXISTS "Delete custom transfer types"  ON public.transfer_types;

-- SELECT: all authenticated see global defaults + their org's custom entries
CREATE POLICY "Read transfer types" ON public.transfer_types
  FOR SELECT USING (
    organization_id IS NULL
    OR organization_id IN (SELECT private.get_user_org_ids())
    OR (SELECT private.is_god())
  );

-- INSERT: org admins and god can create org-specific entries
CREATE POLICY "Insert custom transfer types" ON public.transfer_types
  FOR INSERT WITH CHECK (
    organization_id IS NOT NULL
    AND (
      (SELECT private.is_org_admin(organization_id))
      OR (SELECT private.is_god())
    )
  );

-- UPDATE: org admins can edit their non-system entries only
CREATE POLICY "Update custom transfer types" ON public.transfer_types
  FOR UPDATE
  USING (
    organization_id IS NOT NULL
    AND is_system = false
    AND (
      (SELECT private.is_org_admin(organization_id))
      OR (SELECT private.is_god())
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND is_system = false
    AND (
      (SELECT private.is_org_admin(organization_id))
      OR (SELECT private.is_god())
    )
  );

-- DELETE: org admins can delete their non-system entries only
CREATE POLICY "Delete custom transfer types" ON public.transfer_types
  FOR DELETE USING (
    organization_id IS NOT NULL
    AND is_system = false
    AND (
      (SELECT private.is_org_admin(organization_id))
      OR (SELECT private.is_god())
    )
  );

-- ── 5. RLS — payment_methods ─────────────────────────────────────────────────

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read payment methods"          ON public.payment_methods;
DROP POLICY IF EXISTS "Insert custom payment methods"  ON public.payment_methods;
DROP POLICY IF EXISTS "Update custom payment methods"  ON public.payment_methods;
DROP POLICY IF EXISTS "Delete custom payment methods"  ON public.payment_methods;

CREATE POLICY "Read payment methods" ON public.payment_methods
  FOR SELECT USING (
    organization_id IS NULL
    OR organization_id IN (SELECT private.get_user_org_ids())
    OR (SELECT private.is_god())
  );

CREATE POLICY "Insert custom payment methods" ON public.payment_methods
  FOR INSERT WITH CHECK (
    organization_id IS NOT NULL
    AND (
      (SELECT private.is_org_admin(organization_id))
      OR (SELECT private.is_god())
    )
  );

CREATE POLICY "Update custom payment methods" ON public.payment_methods
  FOR UPDATE
  USING (
    organization_id IS NOT NULL
    AND is_system = false
    AND (
      (SELECT private.is_org_admin(organization_id))
      OR (SELECT private.is_god())
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND is_system = false
    AND (
      (SELECT private.is_org_admin(organization_id))
      OR (SELECT private.is_god())
    )
  );

CREATE POLICY "Delete custom payment methods" ON public.payment_methods
  FOR DELETE USING (
    organization_id IS NOT NULL
    AND is_system = false
    AND (
      (SELECT private.is_org_admin(organization_id))
      OR (SELECT private.is_god())
    )
  );

-- ── 6. RLS — transfer_categories (global, read-only for all) ─────────────────

ALTER TABLE public.transfer_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read transfer categories" ON public.transfer_categories;

CREATE POLICY "Read transfer categories" ON public.transfer_categories
  FOR SELECT USING (true);
