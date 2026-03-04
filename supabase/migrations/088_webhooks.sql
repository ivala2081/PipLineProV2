-- ============================================================================
-- 088: Outbound webhooks
-- Orgs can configure URLs to receive transfer events with HMAC-signed payloads.
-- ============================================================================

-- 1. org_webhooks table
CREATE TABLE IF NOT EXISTS public.org_webhooks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  url         TEXT        NOT NULL,
  secret      TEXT        NOT NULL,   -- stored plaintext (admin-visible), used for HMAC-SHA256 signing
  events      TEXT[]      NOT NULL DEFAULT '{}',
  -- supported events: 'transfer.created' | 'transfer.updated' | 'transfer.deleted' | 'transfer.restored'
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_webhooks ENABLE ROW LEVEL SECURITY;

-- 2. webhook_delivery_log table
CREATE TABLE IF NOT EXISTS public.webhook_delivery_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id   UUID        NOT NULL REFERENCES public.org_webhooks(id) ON DELETE CASCADE,
  event_type   TEXT        NOT NULL,
  payload      JSONB       NOT NULL DEFAULT '{}',
  status       TEXT        NOT NULL DEFAULT 'pending',  -- 'pending' | 'success' | 'failed' | 'timeout'
  http_status  INTEGER,
  response_text TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_delivery_log ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_webhooks_org
  ON public.org_webhooks(org_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_log_webhook
  ON public.webhook_delivery_log(webhook_id, attempted_at DESC);

-- 3. RLS for org_webhooks: admins + god only
CREATE POLICY "Manage org webhooks"
  ON public.org_webhooks FOR ALL
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(org_id))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(org_id))
  );

-- 4. RLS for delivery log: read-only for admins + managers
CREATE POLICY "Read webhook delivery log"
  ON public.webhook_delivery_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_webhooks w
      WHERE w.id = webhook_delivery_log.webhook_id
        AND (
          (SELECT private.is_god())
          OR (SELECT private.is_org_admin(w.org_id))
          OR EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = w.org_id
              AND om.user_id = auth.uid()
              AND om.role = 'manager'
          )
        )
    )
  );

-- Insert by functions only
CREATE POLICY "Insert webhook delivery log via function"
  ON public.webhook_delivery_log FOR INSERT
  WITH CHECK (false);

-- 5. Updated_at trigger for webhooks
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS touch_updated_at_webhooks ON public.org_webhooks;
CREATE TRIGGER touch_updated_at_webhooks
  BEFORE UPDATE ON public.org_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
