-- ============================================================================
-- FIX LOOKUP TABLES - Add Multi-Tenancy Support
-- ============================================================================
-- This adds organization_id, is_active, and aliases to lookup tables
-- and migrates existing data
-- ============================================================================

-- ============================================================================
-- PART 0: Ensure ID columns have UUID defaults
-- ============================================================================

ALTER TABLE public.transfer_types
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.transfer_categories
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.payment_methods
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ============================================================================
-- PART 1: Add Missing Columns to transfer_types
-- ============================================================================

-- Add organization_id (nullable first to allow existing rows)
ALTER TABLE public.transfer_types
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add is_active
ALTER TABLE public.transfer_types
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add aliases
ALTER TABLE public.transfer_types
ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';

-- Add timestamps if missing
ALTER TABLE public.transfer_types
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.transfer_types
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ============================================================================
-- PART 2: Add Missing Columns to transfer_categories
-- ============================================================================

ALTER TABLE public.transfer_categories
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.transfer_categories
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.transfer_categories
ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.transfer_categories
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.transfer_categories
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ============================================================================
-- PART 3: Add Missing Columns to payment_methods
-- ============================================================================

ALTER TABLE public.payment_methods
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.payment_methods
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.payment_methods
ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.payment_methods
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.payment_methods
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ============================================================================
-- PART 4: Migrate Existing Data
-- ============================================================================
-- For existing rows without organization_id, we'll assign them to all orgs
-- This ensures transfers can still reference them

DO $$
DECLARE
  org RECORD;
  existing_type RECORD;
BEGIN
  -- For each existing transfer_type without org_id
  FOR existing_type IN
    SELECT DISTINCT id, name FROM public.transfer_types WHERE organization_id IS NULL
  LOOP
    -- For each organization
    FOR org IN SELECT id FROM public.organizations LOOP
      -- Check if this org already has this type
      IF NOT EXISTS (
        SELECT 1 FROM public.transfer_types
        WHERE organization_id = org.id AND name = existing_type.name
      ) THEN
        -- Create a copy for this org
        INSERT INTO public.transfer_types (id, organization_id, name, is_active, aliases)
        VALUES (gen_random_uuid(), org.id, existing_type.name, true, '{}');
      END IF;
    END LOOP;

    -- Delete the original row without org_id (after copies are made)
    DELETE FROM public.transfer_types WHERE id = existing_type.id;
  END LOOP;

  RAISE NOTICE '✅ Migrated transfer_types';
END $$;

DO $$
DECLARE
  org RECORD;
  existing_cat RECORD;
BEGIN
  FOR existing_cat IN
    SELECT DISTINCT id, name, is_deposit FROM public.transfer_categories WHERE organization_id IS NULL
  LOOP
    FOR org IN SELECT id FROM public.organizations LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.transfer_categories
        WHERE organization_id = org.id AND name = existing_cat.name
      ) THEN
        INSERT INTO public.transfer_categories (id, organization_id, name, is_deposit, is_active, aliases)
        VALUES (gen_random_uuid(), org.id, existing_cat.name, existing_cat.is_deposit, true, '{}');
      END IF;
    END LOOP;

    DELETE FROM public.transfer_categories WHERE id = existing_cat.id;
  END LOOP;

  RAISE NOTICE '✅ Migrated transfer_categories';
END $$;

DO $$
DECLARE
  org RECORD;
  existing_method RECORD;
BEGIN
  FOR existing_method IN
    SELECT DISTINCT id, name FROM public.payment_methods WHERE organization_id IS NULL
  LOOP
    FOR org IN SELECT id FROM public.organizations LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.payment_methods
        WHERE organization_id = org.id AND name = existing_method.name
      ) THEN
        INSERT INTO public.payment_methods (id, organization_id, name, is_active, aliases)
        VALUES (gen_random_uuid(), org.id, existing_method.name, true, '{}');
      END IF;
    END LOOP;

    DELETE FROM public.payment_methods WHERE id = existing_method.id;
  END LOOP;

  RAISE NOTICE '✅ Migrated payment_methods';
END $$;

-- ============================================================================
-- PART 5: Make organization_id NOT NULL and Add Constraints
-- ============================================================================

-- Now that all rows have org_id, make it required
ALTER TABLE public.transfer_types
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.transfer_categories
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.payment_methods
ALTER COLUMN organization_id SET NOT NULL;

-- Add unique constraints
ALTER TABLE public.transfer_types
DROP CONSTRAINT IF EXISTS transfer_types_organization_id_name_key;

ALTER TABLE public.transfer_types
ADD CONSTRAINT transfer_types_organization_id_name_key
UNIQUE (organization_id, name);

ALTER TABLE public.transfer_categories
DROP CONSTRAINT IF EXISTS transfer_categories_organization_id_name_key;

ALTER TABLE public.transfer_categories
ADD CONSTRAINT transfer_categories_organization_id_name_key
UNIQUE (organization_id, name);

ALTER TABLE public.payment_methods
DROP CONSTRAINT IF EXISTS payment_methods_organization_id_name_key;

ALTER TABLE public.payment_methods
ADD CONSTRAINT payment_methods_organization_id_name_key
UNIQUE (organization_id, name);

-- ============================================================================
-- PART 6: Add Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transfer_types_org
  ON public.transfer_types (organization_id);

CREATE INDEX IF NOT EXISTS idx_transfer_categories_org
  ON public.transfer_categories (organization_id);

CREATE INDEX IF NOT EXISTS idx_payment_methods_org
  ON public.payment_methods (organization_id);

-- ============================================================================
-- PART 7: Add Updated Triggers
-- ============================================================================

-- Ensure handle_updated_at function exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
DROP TRIGGER IF EXISTS on_transfer_type_updated ON public.transfer_types;
CREATE TRIGGER on_transfer_type_updated
  BEFORE UPDATE ON public.transfer_types
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_transfer_category_updated ON public.transfer_categories;
CREATE TRIGGER on_transfer_category_updated
  BEFORE UPDATE ON public.transfer_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_payment_method_updated ON public.payment_methods;
CREATE TRIGGER on_payment_method_updated
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- PART 8: Enable RLS
-- ============================================================================

ALTER TABLE public.transfer_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transfer_types
DROP POLICY IF EXISTS "transfer_types_select" ON public.transfer_types;
CREATE POLICY "transfer_types_select" ON public.transfer_types
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

DROP POLICY IF EXISTS "transfer_types_insert" ON public.transfer_types;
CREATE POLICY "transfer_types_insert" ON public.transfer_types
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

DROP POLICY IF EXISTS "transfer_types_update" ON public.transfer_types;
CREATE POLICY "transfer_types_update" ON public.transfer_types
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

DROP POLICY IF EXISTS "transfer_types_delete" ON public.transfer_types;
CREATE POLICY "transfer_types_delete" ON public.transfer_types
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- Same for transfer_categories
DROP POLICY IF EXISTS "transfer_categories_select" ON public.transfer_categories;
CREATE POLICY "transfer_categories_select" ON public.transfer_categories
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

DROP POLICY IF EXISTS "transfer_categories_insert" ON public.transfer_categories;
CREATE POLICY "transfer_categories_insert" ON public.transfer_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

DROP POLICY IF EXISTS "transfer_categories_update" ON public.transfer_categories;
CREATE POLICY "transfer_categories_update" ON public.transfer_categories
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

DROP POLICY IF EXISTS "transfer_categories_delete" ON public.transfer_categories;
CREATE POLICY "transfer_categories_delete" ON public.transfer_categories
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- Same for payment_methods
DROP POLICY IF EXISTS "payment_methods_select" ON public.payment_methods;
CREATE POLICY "payment_methods_select" ON public.payment_methods
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

DROP POLICY IF EXISTS "payment_methods_insert" ON public.payment_methods;
CREATE POLICY "payment_methods_insert" ON public.payment_methods
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

DROP POLICY IF EXISTS "payment_methods_update" ON public.payment_methods;
CREATE POLICY "payment_methods_update" ON public.payment_methods
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

DROP POLICY IF EXISTS "payment_methods_delete" ON public.payment_methods;
CREATE POLICY "payment_methods_delete" ON public.payment_methods
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

-- ============================================================================
-- PART 9: Seed Aliases
-- ============================================================================

-- Turkish aliases for transfer types
UPDATE public.transfer_types
SET aliases = '{müşteri,MÜŞTERİ,Müşteri,musteri,MUSTERI,Musteri,customer}'
WHERE LOWER(name) = 'client';

UPDATE public.transfer_types
SET aliases = '{ödeme,ÖDEME,Ödeme,payment}'
WHERE LOWER(name) = 'payment';

UPDATE public.transfer_types
SET aliases = '{bloke hesap,BLOKE HESAP,Bloke Hesap,blocked}'
WHERE LOWER(name) = 'blocked';

-- Turkish aliases for categories (check is_deposit to identify them)
UPDATE public.transfer_categories
SET aliases = '{yatırım,YATIRIM,Yatırım,yatirim,deposit}'
WHERE is_deposit = true;

UPDATE public.transfer_categories
SET aliases = '{çekme,ÇEKME,Çekme,withdrawal}'
WHERE is_deposit = false;

-- ============================================================================
-- ✅ DONE - Lookup Tables Fixed
-- ============================================================================

SELECT '✅ Lookup tables now have organization_id, is_active, and aliases' as status;
SELECT 'transfer_types' as table_name, COUNT(*) as row_count FROM public.transfer_types
UNION ALL
SELECT 'transfer_categories', COUNT(*) FROM public.transfer_categories
UNION ALL
SELECT 'payment_methods', COUNT(*) FROM public.payment_methods;
