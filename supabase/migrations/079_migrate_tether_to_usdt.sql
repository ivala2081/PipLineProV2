-- ============================================================================
-- 079: Migrate Tether PSP transfers from USD to USDT
--
-- Context:
--   USDT (Tether) is now treated as its own currency rather than being stored
--   as 'USD'. This migration:
--     1. Widens the transfers.currency check constraint to allow 'USDT'
--     2. Sets the currency of all Tether PSPs to 'USDT'
--     3. Updates all transfers that went through a Tether PSP from
--        currency='USD' to currency='USDT'
-- ============================================================================

-- ── 1. Widen currency check constraint ───────────────────────────────────────
ALTER TABLE public.transfers
  DROP CONSTRAINT IF EXISTS transfers_currency_check;

ALTER TABLE public.transfers
  ADD CONSTRAINT transfers_currency_check
    CHECK (currency IN ('TL', 'USD', 'USDT'));

-- ── 2 & 3. Data migration ────────────────────────────────────────────────────
DO $$
DECLARE
  v_updated_psps       INT;
  v_updated_transfers  INT;
BEGIN

  -- Update Tether PSPs: set currency to USDT
  UPDATE public.psps
     SET currency = 'USDT'
   WHERE lower(name) LIKE '%tether%';

  GET DIAGNOSTICS v_updated_psps = ROW_COUNT;
  RAISE NOTICE 'Tether PSPs updated to USDT: %', v_updated_psps;

  -- Update transfers: Tether PSP + currency USD → USDT
  UPDATE public.transfers t
     SET currency = 'USDT'
   WHERE t.currency = 'USD'
     AND EXISTS (
       SELECT 1
         FROM public.psps p
        WHERE p.id = t.psp_id
          AND lower(p.name) LIKE '%tether%'
     );

  GET DIAGNOSTICS v_updated_transfers = ROW_COUNT;
  RAISE NOTICE 'Transfers migrated USD → USDT: %', v_updated_transfers;

  RAISE NOTICE '──────────────────────────────────────────────────────────';
  RAISE NOTICE 'Migration 079 complete.';
  RAISE NOTICE '  % Tether PSPs updated', v_updated_psps;
  RAISE NOTICE '  % transfers re-labelled USD → USDT', v_updated_transfers;

END $$;
