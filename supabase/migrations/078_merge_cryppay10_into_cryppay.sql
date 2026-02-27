-- Migration 078: Merge "#72 CRYPPAY 10" (10%) into "#72 CRYPPAY" (12%)
--
-- Context:
--   Two PSP records existed for what is effectively the same payment provider.
--   "#72 CRYPPAY 10" was created separately to represent a 10% commission period.
--   The correct approach is to use the psp_commission_rates history table to track
--   rate changes on a single PSP record — which is what this migration achieves.
--
-- What this migration does:
--   1. Re-points all psp_commission_rates rows from CRYPPAY_10 → CRYPPAY
--   2. Re-points all psp_settlements rows from CRYPPAY_10 → CRYPPAY
--   3. Re-points all transfers.psp_id from CRYPPAY_10 → CRYPPAY
--      (commission_rate_snapshot is intentionally left untouched — 10% is the
--       historically accurate rate that was applied on those transfers)
--   4. Deletes "#72 CRYPPAY 10" (CASCADE removes any unipayment_sync_log entries)
--
-- The current commission_rate on "#72 CRYPPAY" (12%) is NOT changed.
-- The sync triggers only fire on INSERT, so UPDATEing existing rate rows
-- does not overwrite the active rate.

DO $$
DECLARE
  v_cryppay_id    UUID;
  v_cryppay10_id  UUID;
  v_rates_count   INT;
  v_settle_count  INT;
  v_xfer_count    INT;
BEGIN
  -- Locate both PSP records
  SELECT id INTO v_cryppay_id
    FROM public.psps
   WHERE name = '#72 CRYPPAY'
   LIMIT 1;

  SELECT id INTO v_cryppay10_id
    FROM public.psps
   WHERE name = '#72 CRYPPAY 10'
   LIMIT 1;

  IF v_cryppay_id IS NULL THEN
    RAISE EXCEPTION 'PSP "#72 CRYPPAY" not found — check the name exactly';
  END IF;

  IF v_cryppay10_id IS NULL THEN
    RAISE EXCEPTION 'PSP "#72 CRYPPAY 10" not found — check the name exactly';
  END IF;

  RAISE NOTICE 'Source (CRYPPAY 10): %', v_cryppay10_id;
  RAISE NOTICE 'Target (CRYPPAY):    %', v_cryppay_id;

  -- ── 1. Commission rate history ──────────────────────────────────────────────
  -- Moves all historical rate entries so CRYPPAY's timeline now includes the
  -- 10% period that was previously tracked under CRYPPAY 10.
  UPDATE public.psp_commission_rates
     SET psp_id = v_cryppay_id
   WHERE psp_id = v_cryppay10_id;
  GET DIAGNOSTICS v_rates_count = ROW_COUNT;
  RAISE NOTICE 'Commission rate rows moved: %', v_rates_count;

  -- ── 2. Settlements ──────────────────────────────────────────────────────────
  UPDATE public.psp_settlements
     SET psp_id = v_cryppay_id
   WHERE psp_id = v_cryppay10_id;
  GET DIAGNOSTICS v_settle_count = ROW_COUNT;
  RAISE NOTICE 'Settlement rows moved: %', v_settle_count;

  -- ── 3. Transfers ────────────────────────────────────────────────────────────
  -- psp_id is updated; commission_rate_snapshot is intentionally preserved
  -- (keeps the 10% rate that was actually applied, for audit accuracy).
  UPDATE public.transfers
     SET psp_id = v_cryppay_id
   WHERE psp_id = v_cryppay10_id;
  GET DIAGNOSTICS v_xfer_count = ROW_COUNT;
  RAISE NOTICE 'Transfer rows updated: %', v_xfer_count;

  -- ── 4. Delete CRYPPAY 10 ────────────────────────────────────────────────────
  -- All FK references have been moved above.
  -- unipayment_sync_log.psp_id has ON DELETE CASCADE so it's cleaned up automatically.
  DELETE FROM public.psps
   WHERE id = v_cryppay10_id;
  RAISE NOTICE 'PSP "#72 CRYPPAY 10" deleted.';

  RAISE NOTICE '──────────────────────────────────────────────────────────';
  RAISE NOTICE 'Migration 078 complete:';
  RAISE NOTICE '  % commission rate entries moved', v_rates_count;
  RAISE NOTICE '  % settlement entries moved',      v_settle_count;
  RAISE NOTICE '  % transfers re-pointed',          v_xfer_count;
  RAISE NOTICE 'Active commission_rate on "#72 CRYPPAY" is unchanged (12%%).';
END $$;
