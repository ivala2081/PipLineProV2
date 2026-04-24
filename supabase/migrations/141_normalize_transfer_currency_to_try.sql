-- ============================================================================
-- 141: Normalize transfers.currency 'TL' → 'TRY' (match migration 082 canonical)
-- ----------------------------------------------------------------------------
-- Context:
--   Migration 082 (dynamic_base_currency) declared 'TRY' (ISO 4217) as the
--   canonical Turkish Lira label and UPDATEd every affected table from
--   'TL' → 'TRY'. Migration 121 then re-added a permissive CHECK that allowed
--   BOTH 'TL' and 'TRY' on transfers.currency, and the 2026 CSV import
--   (migration 136 + scripts/import-transfers-2026.mjs) wrote fresh rows back
--   as 'TL'. Result: the Transfers page shows a mix of TL and TRY pills on
--   the same list (user-visible drift).
--
--   This migration:
--     1. Data: transfers.currency 'TL' → 'TRY' (every remaining row)
--     2. Constraint: tighten transfers CHECK to forbid 'TL' going forward
--
--   Scope is transfers only. Accounting / HR currency columns use 'TL' with
--   their own semantics (HR salary_currency = 'TL' means cash TRY salary vs
--   cash USD salary — not an ISO code issue). Leave those alone.
-- ============================================================================

BEGIN;

-- ── 1. Data migration ───────────────────────────────────────────────────────
DO $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.transfers
     SET currency = 'TRY'
   WHERE currency = 'TL';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'transfers re-labelled TL → TRY: %', v_updated;
END $$;

-- ── 2. Tighten CHECK constraint (drop 'TL' from allowed values) ────────────
ALTER TABLE public.transfers
  DROP CONSTRAINT IF EXISTS transfers_currency_check;

ALTER TABLE public.transfers
  ADD CONSTRAINT transfers_currency_check
    CHECK (currency IN ('TRY', 'USD', 'USDT'));

COMMIT;
