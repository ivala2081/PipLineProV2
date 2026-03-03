-- ============================================================================
-- 081: Add base_currency to organizations
--
-- Context:
--   Organizations operate in different countries with different local
--   currencies. This column stores the ISO 4217 code of the primary currency
--   for each organization (e.g. 'TRY' for Turkey, 'EGP' for Egypt, 'EUR'
--   for Germany). Admins and gods can change this in organization settings.
--
--   Default is 'USD' as a neutral universal baseline.
-- ============================================================================

ALTER TABLE public.organizations
  ADD COLUMN base_currency TEXT NOT NULL DEFAULT 'USD';

COMMENT ON COLUMN public.organizations.base_currency
  IS 'ISO 4217 currency code representing the primary local currency of this organization';
