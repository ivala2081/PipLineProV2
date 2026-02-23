-- 064_bloke_resolutions.sql
-- Resolution tracking for blocked (bloke) transfers

-- ── 1. Table ──────────────────────────────────────────────────────────────

CREATE TABLE public.bloke_resolutions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id      UUID NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'resolved', 'written_off')),
  resolution_date  DATE,
  resolution_notes TEXT,
  resolved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (transfer_id)
);

CREATE INDEX idx_bloke_res_org ON public.bloke_resolutions(organization_id);
CREATE INDEX idx_bloke_res_transfer ON public.bloke_resolutions(transfer_id);
CREATE INDEX idx_bloke_res_status ON public.bloke_resolutions(organization_id, status);

CREATE TRIGGER on_bloke_resolution_updated
  BEFORE UPDATE ON public.bloke_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 2. RLS ────────────────────────────────────────────────────────────────

ALTER TABLE public.bloke_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bloke_res_select" ON public.bloke_resolutions
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR organization_id IN (SELECT private.get_user_org_ids())
  );

CREATE POLICY "bloke_res_insert" ON public.bloke_resolutions
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

CREATE POLICY "bloke_res_update" ON public.bloke_resolutions
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

CREATE POLICY "bloke_res_delete" ON public.bloke_resolutions
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(organization_id))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bloke_resolutions TO authenticated;

-- ── 3. Auto-create resolution when blocked transfer is inserted ───────────

CREATE OR REPLACE FUNCTION public.auto_create_bloke_resolution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.type_id = 'blocked' THEN
    INSERT INTO public.bloke_resolutions (transfer_id, organization_id, status)
    VALUES (NEW.id, NEW.organization_id, 'pending')
    ON CONFLICT (transfer_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_transfer_auto_bloke_resolution
  AFTER INSERT ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_bloke_resolution();

-- ── 4. Backfill existing blocked transfers ────────────────────────────────

INSERT INTO public.bloke_resolutions (transfer_id, organization_id, status)
SELECT t.id, t.organization_id, 'pending'
FROM public.transfers t
WHERE t.type_id = 'blocked'
  AND NOT EXISTS (SELECT 1 FROM public.bloke_resolutions br WHERE br.transfer_id = t.id);

-- ── 5. RPC to get blocked transfers for a PSP with resolution status ──────

CREATE OR REPLACE FUNCTION public.get_psp_bloke_transfers(_psp_id uuid, _org_id uuid)
RETURNS TABLE (
  transfer_id      uuid,
  full_name        text,
  transfer_date    timestamptz,
  amount           numeric,
  currency         text,
  crm_id           text,
  meta_id          text,
  payment_method   text,
  notes            text,
  status           text,
  resolution_date  date,
  resolution_notes text,
  resolved_by      uuid,
  resolution_id    uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    t.id AS transfer_id,
    t.full_name,
    t.transfer_date,
    t.amount,
    t.currency,
    t.crm_id,
    t.meta_id,
    pm.name AS payment_method,
    t.notes,
    coalesce(br.status, 'pending') AS status,
    br.resolution_date,
    br.resolution_notes,
    br.resolved_by,
    br.id AS resolution_id
  FROM public.transfers t
  JOIN public.payment_methods pm ON pm.id = t.payment_method_id
  LEFT JOIN public.bloke_resolutions br ON br.transfer_id = t.id
  WHERE t.psp_id = _psp_id
    AND t.organization_id = _org_id
    AND t.type_id = 'blocked'
  ORDER BY t.transfer_date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_psp_bloke_transfers(uuid, uuid) TO authenticated;
