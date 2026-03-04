-- ============================================================================
-- 087: Velocity alerts
-- Detects when an operation user submits transfers too fast (configurable per org).
-- Inserts into org_alerts → frontend Realtime subscription → NotificationBell.
-- ============================================================================

-- 1. Add velocity threshold settings to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS velocity_threshold_count   INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS velocity_window_minutes    INTEGER NOT NULL DEFAULT 10;

-- 2. org_alerts table
CREATE TABLE IF NOT EXISTS public.org_alerts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL,           -- 'velocity_alert'
  severity         TEXT        NOT NULL DEFAULT 'warning',  -- 'info' | 'warning' | 'critical'
  title            TEXT        NOT NULL,
  message          TEXT        NOT NULL,
  metadata         JSONB       NOT NULL DEFAULT '{}',
  triggered_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_alerts ENABLE ROW LEVEL SECURITY;

-- Index for fast unread queries
CREATE INDEX IF NOT EXISTS idx_org_alerts_org_unacked
  ON public.org_alerts(org_id, created_at DESC)
  WHERE acknowledged_at IS NULL;

-- RLS: admins + managers can read their org's alerts
CREATE POLICY "Read org alerts"
  ON public.org_alerts FOR SELECT
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(org_id))
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = org_alerts.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'manager'
    )
  );

-- RLS: only SECURITY DEFINER functions may insert
CREATE POLICY "Insert org alerts via function only"
  ON public.org_alerts FOR INSERT
  WITH CHECK (false);

-- RLS: acknowledge own alert
CREATE POLICY "Acknowledge org alerts"
  ON public.org_alerts FOR UPDATE
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin(org_id))
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = org_alerts.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'manager'
    )
  );

-- 3. Trigger function: check velocity after each transfer insert
CREATE OR REPLACE FUNCTION public.check_transfer_velocity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _threshold_count  INTEGER;
  _window_minutes   INTEGER;
  _recent_count     BIGINT;
  _actor_name       TEXT;
  _already_alerted  BOOLEAN;
BEGIN
  -- Skip if no creator (system inserts)
  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch org thresholds
  SELECT velocity_threshold_count, velocity_window_minutes
    INTO _threshold_count, _window_minutes
    FROM public.organizations
   WHERE id = NEW.organization_id;

  -- Disabled when threshold = 0
  IF _threshold_count = 0 THEN
    RETURN NEW;
  END IF;

  -- Count recent transfers by this user in this org within the window
  SELECT COUNT(*) INTO _recent_count
    FROM public.transfers
   WHERE organization_id = NEW.organization_id
     AND created_by      = NEW.created_by
     AND deleted_at IS NULL
     AND transfer_date  >= (NOW() - (_window_minutes || ' minutes')::INTERVAL);

  -- Fire alert only if threshold exceeded and no recent unacknowledged alert for same user
  IF _recent_count >= _threshold_count THEN
    SELECT EXISTS(
      SELECT 1 FROM public.org_alerts
      WHERE org_id      = NEW.organization_id
        AND type        = 'velocity_alert'
        AND (metadata->>'triggered_by_id') = NEW.created_by::TEXT
        AND acknowledged_at IS NULL
        AND created_at >= (NOW() - INTERVAL '15 minutes')
    ) INTO _already_alerted;

    IF NOT _already_alerted THEN
      -- Resolve actor display name
      SELECT COALESCE(display_name, email, NEW.created_by::TEXT)
        INTO _actor_name
        FROM public.profiles
       WHERE id = NEW.created_by;

      INSERT INTO public.org_alerts (
        org_id, type, severity, title, message, metadata, triggered_by
      ) VALUES (
        NEW.organization_id,
        'velocity_alert',
        'warning',
        'High Transfer Velocity',
        _actor_name || ' submitted ' || _recent_count || ' transfers in the last ' || _window_minutes || ' minutes',
        jsonb_build_object(
          'triggered_by_id',   NEW.created_by,
          'triggered_by_name', _actor_name,
          'count',             _recent_count,
          'window_minutes',    _window_minutes,
          'threshold',         _threshold_count
        ),
        NEW.created_by
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS check_velocity_after_insert ON public.transfers;
CREATE TRIGGER check_velocity_after_insert
  AFTER INSERT ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.check_transfer_velocity();

-- 4. RPC: acknowledge an alert
CREATE OR REPLACE FUNCTION public.acknowledge_alert(p_alert_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.org_alerts
     SET acknowledged_by  = auth.uid(),
         acknowledged_at  = now()
   WHERE id     = p_alert_id
     AND (
       (SELECT private.is_god())
       OR (SELECT private.is_org_admin(org_id))
       OR EXISTS (
         SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = org_alerts.org_id
            AND om.user_id = auth.uid()
            AND om.role = 'manager'
       )
     );
END;
$$;
