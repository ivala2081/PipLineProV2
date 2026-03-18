-- 116_psp_initial_balance_note.sql
-- Adds a note field for documenting initial_balance adjustments on PSPs.
-- Also updates #72 CRYPPAY initial_balance to 1,127,204 to match the
-- Excel-tracked carry-over (the 1,051,200 pre-system adjustment).

ALTER TABLE public.psps
  ADD COLUMN IF NOT EXISTS initial_balance_note TEXT DEFAULT '';
