-- ============================================================================
-- 093: Fix PSP Receiving Methods Column Type
-- Migration 092 mistakenly created accepted_payment_method_ids as uuid[].
-- payment_methods.id is TEXT (e.g. 'bank', 'credit-card', 'tether'),
-- so the column must be text[].
-- ============================================================================

ALTER TABLE public.psps
  ALTER COLUMN accepted_payment_method_ids TYPE text[]
  USING accepted_payment_method_ids::text[];
