-- ============================================================================
-- 142: IB House sentinel + pending status + name uniqueness + write tightening
--
-- Goal: Make ib_partner_id mandatory on every transfer without blocking the
-- rep's flow when (a) the customer is organic (no IB) or (b) the IB is not
-- yet registered.
--
-- Design (Faz 1 of the plan in 2026-04-27 PM session):
--   • Per-org "house" sentinel IB ('Doğrudan') represents organic transfers.
--   • Reps can quick-add new IBs, but only with status='pending'. Admin/manager
--     review and promote to 'active' before commissions accrue.
--   • Unique IB names per org (case+whitespace-insensitive) — DB-level safety
--     net behind the form's autocomplete.
--   • House sentinel is immutable (no UPDATE/DELETE) and excluded from
--     calculate_ib_commission.
--   • Pending IBs are also excluded from commission until promoted.
--
-- This migration partially walks back the open-write RLS from migration 134:
-- non-admin members can still INSERT, but only with status='pending' and
-- is_house=false. UPDATE/DELETE returns to admin/manager only.
--
-- Safe to re-run individual sections (DROP IF EXISTS / CREATE IF NOT EXISTS
-- where possible). Aborts if pre-existing duplicate IB names are detected.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Pre-flight: detect duplicate names in existing data
-- ============================================================================
DO $$
DECLARE
  _has_dups BOOLEAN := false;
  _r RECORD;
BEGIN
  FOR _r IN
    SELECT organization_id, lower(trim(name)) AS norm_name, COUNT(*) AS cnt
    FROM public.ib_partners
    GROUP BY organization_id, lower(trim(name))
    HAVING COUNT(*) > 1
  LOOP
    RAISE WARNING 'Duplicate IB name in org %: % (% rows). Merge before re-running.',
      _r.organization_id, _r.norm_name, _r.cnt;
    _has_dups := true;
  END LOOP;
  IF _has_dups THEN
    RAISE EXCEPTION 'Aborting: duplicate IB names exist. Merge them first, then re-run migration 142.';
  END IF;
END;
$$;

-- ============================================================================
-- 2. Add is_house column
-- ============================================================================
ALTER TABLE public.ib_partners
  ADD COLUMN IF NOT EXISTS is_house BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ib_partners.is_house IS
  'True for the per-org sentinel IB used to attribute organic (non-IB) transfers. Immutable, excluded from commission calculations.';

-- ============================================================================
-- 3. Widen status CHECK to include 'pending'
-- ============================================================================
ALTER TABLE public.ib_partners
  DROP CONSTRAINT IF EXISTS ib_partners_status_check;

ALTER TABLE public.ib_partners
  ADD CONSTRAINT ib_partners_status_check
  CHECK (status IN ('active','paused','terminated','pending'));

COMMENT ON COLUMN public.ib_partners.status IS
  'Lifecycle: pending (rep-created, awaiting admin review) → active → paused/terminated. Pending IBs are excluded from commission calculations.';

-- ============================================================================
-- 4. Unique name per org (case + whitespace insensitive)
--    Includes house sentinel — prevents accidental "Doğrudan" duplicates.
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_ib_partners_unique_name_per_org
  ON public.ib_partners (organization_id, lower(trim(name)));

-- ============================================================================
-- 5. Seed house sentinel ('Doğrudan') for every existing organization
--    If a row already exists with that name (case/whitespace-insensitive),
--    promote it to is_house=true rather than insert a duplicate.
-- ============================================================================

-- 5a. Promote pre-existing "Doğrudan" rows (any case/spacing) to house status
UPDATE public.ib_partners
SET
  is_house = true,
  name     = 'Doğrudan',
  status   = 'active',
  notes    = COALESCE(notes, '') ||
             E'\n[migration 142] Auto-promoted to house sentinel.'
WHERE is_house = false
  AND lower(trim(name)) = 'doğrudan';

-- 5b. Insert house sentinel for orgs that still don't have one
INSERT INTO public.ib_partners (
  organization_id, name, agreement_types, agreement_details, status, is_house, notes
)
SELECT
  o.id,
  'Doğrudan',
  ARRAY['salary']::text[],
  '{"salary":{"amount":0,"currency":"USD","period":"monthly"}}'::jsonb,
  'active',
  true,
  'House sentinel — represents organic / non-IB transfers. Auto-managed; do not edit or delete.'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.ib_partners p
  WHERE p.organization_id = o.id AND p.is_house = true
);

-- ============================================================================
-- 6. Auto-seed house IB on new organization
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_house_ib_for_organization()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ib_partners (
    organization_id, name, agreement_types, agreement_details, status, is_house, notes
  ) VALUES (
    NEW.id,
    'Doğrudan',
    ARRAY['salary']::text[],
    '{"salary":{"amount":0,"currency":"USD","period":"monthly"}}'::jsonb,
    'active',
    true,
    'House sentinel — represents organic / non-IB transfers. Auto-managed; do not edit or delete.'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_house_ib ON public.organizations;
CREATE TRIGGER trg_create_house_ib
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_house_ib_for_organization();

-- ============================================================================
-- 7. Block UPDATE / DELETE of house sentinel
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_house_ib_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.is_house THEN
      RAISE EXCEPTION 'House IB sentinel cannot be deleted (org=%)', OLD.organization_id;
    END IF;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.is_house OR NEW.is_house THEN
      -- Allow no-op updates of created_at/updated_at, but block any meaningful
      -- change to a house row, and block flipping is_house on/off.
      IF OLD.is_house IS DISTINCT FROM NEW.is_house THEN
        RAISE EXCEPTION 'Cannot toggle is_house on an existing IB (id=%)', OLD.id;
      END IF;
      IF OLD.is_house AND (
            OLD.name              IS DISTINCT FROM NEW.name
         OR OLD.status            IS DISTINCT FROM NEW.status
         OR OLD.agreement_types   IS DISTINCT FROM NEW.agreement_types
         OR OLD.agreement_details IS DISTINCT FROM NEW.agreement_details
         OR OLD.organization_id   IS DISTINCT FROM NEW.organization_id
      ) THEN
        RAISE EXCEPTION 'House IB sentinel is immutable (id=%)', OLD.id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_house_ib ON public.ib_partners;
CREATE TRIGGER trg_guard_house_ib
  BEFORE UPDATE OR DELETE ON public.ib_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_house_ib_immutable();

-- ============================================================================
-- 8. Tighten RLS — replace migration 134's open-write with role-aware policies
--
-- Rules:
--   INSERT:
--     • god, org admin/manager: any
--     • other org members:      only status='pending' AND is_house=false
--   UPDATE / DELETE:
--     • god, org admin/manager: any (house guard trigger still blocks sentinel)
--     • other org members:      no
-- ============================================================================

DROP POLICY IF EXISTS "ib_partners_insert" ON public.ib_partners;
CREATE POLICY "ib_partners_insert" ON public.ib_partners
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
    OR (
      organization_id IN (SELECT private.get_user_org_ids())
      AND status = 'pending'
      AND is_house = false
    )
  );

DROP POLICY IF EXISTS "ib_partners_update" ON public.ib_partners;
CREATE POLICY "ib_partners_update" ON public.ib_partners
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

DROP POLICY IF EXISTS "ib_partners_delete" ON public.ib_partners;
CREATE POLICY "ib_partners_delete" ON public.ib_partners
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

-- ============================================================================
-- 9. Update calculate_ib_commission to skip house and pending IBs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_ib_commission(
  p_ib_partner_id UUID,
  p_period_start  DATE,
  p_period_end    DATE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _partner        RECORD;
  _details        JSONB;
  _type_details   JSONB;
  _type           TEXT;
  _amount         NUMERIC;
  _breakdown      JSONB;
  _results        JSONB := '[]'::jsonb;
  _total_amount   NUMERIC := 0;
  _currency       TEXT := 'USD';
  _source         TEXT;
  _pct            NUMERIC;
  _base_total     NUMERIC;
  _deposit_count  INT;
BEGIN
  SELECT * INTO _partner FROM ib_partners WHERE id = p_ib_partner_id;
  IF _partner IS NULL THEN
    RAISE EXCEPTION 'IB Partner not found';
  END IF;

  IF NOT (
    private.is_god()
    OR _partner.organization_id IN (SELECT private.get_user_org_ids())
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Guard: house sentinel and pending IBs do not earn commission.
  IF _partner.is_house OR _partner.status = 'pending' THEN
    RETURN jsonb_build_object(
      'total_amount', 0,
      'types', '[]'::jsonb,
      'currency', 'USD',
      'skipped', true,
      'reason', CASE
        WHEN _partner.is_house THEN 'house_sentinel'
        ELSE 'pending_review'
      END
    );
  END IF;

  _details := _partner.agreement_details;

  FOREACH _type IN ARRAY _partner.agreement_types
  LOOP
    _type_details := COALESCE(_details->_type, '{}'::jsonb);
    _amount := 0;
    _breakdown := '{}'::jsonb;

    CASE _type
      WHEN 'salary' THEN
        _amount := COALESCE((_type_details->>'amount')::numeric, 0);
        _currency := COALESCE(_type_details->>'currency', 'USD');
        _breakdown := jsonb_build_object(
          'type', 'salary',
          'fixed_amount', _amount,
          'period', COALESCE(_type_details->>'period', 'monthly'),
          'currency', _currency
        );

      WHEN 'lot_rebate' THEN
        CONTINUE;

      WHEN 'revenue_share' THEN
        _pct      := COALESCE((_type_details->>'revshare_pct')::numeric, 0);
        _source   := COALESCE(_type_details->>'source', 'first_deposit');
        _currency := 'USD';

        IF _source = 'first_deposit' THEN
          SELECT
            COALESCE(SUM(t.amount_usd), 0),
            COUNT(*)
          INTO _base_total, _deposit_count
          FROM transfers t
          JOIN transfer_categories c ON c.id = t.category_id
          WHERE t.organization_id = _partner.organization_id
            AND t.ib_partner_id   = p_ib_partner_id
            AND c.is_deposit      = true
            AND t.is_first_deposit = true
            AND t.transfer_date::date BETWEEN p_period_start AND p_period_end;
        ELSE
          SELECT
            COALESCE(SUM(t.amount_usd), 0),
            COUNT(*)
          INTO _base_total, _deposit_count
          FROM transfers t
          JOIN transfer_categories c ON c.id = t.category_id
          WHERE t.organization_id = _partner.organization_id
            AND t.ib_partner_id   = p_ib_partner_id
            AND c.is_deposit      = true
            AND t.transfer_date::date BETWEEN p_period_start AND p_period_end;
        END IF;

        _amount := _base_total * _pct / 100;

        _breakdown := jsonb_build_object(
          'type',          'revenue_share',
          'source',        _source,
          'revshare_pct',  _pct,
          'base_total',    _base_total,
          'deposit_count', _deposit_count,
          'currency',      _currency,
          'total',         _amount
        );

      ELSE
        CONTINUE;
    END CASE;

    _total_amount := _total_amount + _amount;

    _results := _results || jsonb_build_object(
      'type', _type,
      'calculated_amount', _amount,
      'breakdown', _breakdown,
      'currency', _currency
    );
  END LOOP;

  RETURN jsonb_build_object(
    'total_amount', _total_amount,
    'types', _results,
    'currency', _currency
  );
END;
$$;

COMMIT;
