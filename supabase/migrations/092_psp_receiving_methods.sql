-- ============================================================================
-- 092: PSP Receiving Methods
-- Adds accepted_payment_method_ids text[] to psps table.
-- NULL = no filter (PSP shows for all payment methods).
-- Non-empty array = PSP only shown in transfer form when the selected
-- payment method is in this list.
-- payment_methods.id is TEXT (e.g. 'bank', 'credit-card', 'tether').
-- ============================================================================

ALTER TABLE public.psps
  ADD COLUMN IF NOT EXISTS accepted_payment_method_ids text[] DEFAULT NULL;
