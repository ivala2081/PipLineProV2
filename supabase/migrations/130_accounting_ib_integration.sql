-- ============================================================================
-- Migration 130 — Accounting ↔ IB integration & new expense categories
-- ============================================================================
-- 1. Allow any register name on ib_payments (was: USDT|NAKIT_TL|NAKIT_USD|TRX)
--    so the accounting form can pick org-specific (custom) registers when
--    creating an IB payment.
-- 2. Seed two new global expense categories: 'software' and 'entertainment'.
-- 3. Enhance the IB-payment → accounting-entry trigger to also set
--    category_id to the global 'ib_payment' category, so the accounting form
--    can recognize auto-generated IB entries in edit mode and surface them
--    under the right description option.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Drop the register CHECK constraint on ib_payments
-- ----------------------------------------------------------------------------
ALTER TABLE public.ib_payments
  DROP CONSTRAINT IF EXISTS ib_payments_register_check;


-- ----------------------------------------------------------------------------
-- 2. Seed new global expense categories
-- ----------------------------------------------------------------------------
INSERT INTO public.accounting_categories (organization_id, name, label, icon, is_system, sort_order)
VALUES
  (NULL, 'software',      'Software',      'Code',          true, 11),
  (NULL, 'entertainment', 'Entertainment', 'GameController', true, 12)
ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------------------------
-- 3. Enhance trigger: also set category_id when auto-creating from ib_payments
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_ib_payment_accounting_entry()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _partner_name TEXT;
  _category_id  UUID;
BEGIN
  SELECT name INTO _partner_name FROM ib_partners WHERE id = NEW.ib_partner_id;

  -- Look up the global 'ib_payment' category so the auto-created entry is
  -- properly classified for reporting and edit-mode dropdown derivation.
  SELECT id INTO _category_id
  FROM accounting_categories
  WHERE organization_id IS NULL AND name = 'ib_payment'
  LIMIT 1;

  INSERT INTO accounting_entries (
    organization_id, entry_type, direction, amount, currency,
    register, description, entry_date, ib_payment_id, created_by, category_id
  ) VALUES (
    NEW.organization_id,
    'ODEME',
    'out',
    NEW.amount,
    NEW.currency,
    NEW.register,
    COALESCE(NEW.description, 'IB Payment: ' || COALESCE(_partner_name, 'Unknown')),
    NEW.payment_date,
    NEW.id,
    NEW.created_by,
    _category_id
  );

  RETURN NEW;
END;
$$;

-- Trigger itself stays in place (created in migration 117), only the function body changed.


-- ----------------------------------------------------------------------------
-- 4. Backfill: link existing auto-created accounting entries to the
--    'ib_payment' category so old rows are also recognized.
-- ----------------------------------------------------------------------------
UPDATE public.accounting_entries
SET category_id = (
  SELECT id FROM accounting_categories
  WHERE organization_id IS NULL AND name = 'ib_payment' LIMIT 1
)
WHERE ib_payment_id IS NOT NULL
  AND category_id IS NULL;
