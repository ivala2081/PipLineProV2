-- ============================================================================
-- 089: Webhook delivery trigger via pg_net
-- After INSERT/UPDATE on transfers, calls the deliver-webhook Edge Function
-- for each active org webhook that matches the event type.
-- ============================================================================

-- Enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Helper: build the transfer event payload JSON
CREATE OR REPLACE FUNCTION private.build_transfer_payload(
  p_event_type TEXT,
  p_transfer   public.transfers
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_build_object(
    'event',     p_event_type,
    'timestamp', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'org_id',    p_transfer.organization_id,
    'data',      to_jsonb(p_transfer)
  );
END;
$$;

-- Main trigger function: fires webhook delivery for each matching active webhook
CREATE OR REPLACE FUNCTION public.fire_transfer_webhooks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _event_type TEXT;
  _payload    JSONB;
  _webhook    RECORD;
  _edge_url   TEXT;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    _event_type := 'transfer.created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      _event_type := 'transfer.deleted';
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      _event_type := 'transfer.restored';
    ELSE
      _event_type := 'transfer.updated';
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Build payload
  _payload := private.build_transfer_payload(_event_type, NEW);

  -- Edge Function URL from Supabase env (set via pg_net http_post)
  -- Note: SUPABASE_URL is available via current_setting in Supabase hosted DBs
  BEGIN
    _edge_url := current_setting('app.settings.edge_function_url', true);
  EXCEPTION WHEN OTHERS THEN
    _edge_url := NULL;
  END;

  IF _edge_url IS NULL THEN
    RETURN NEW;
  END IF;

  -- For each active webhook in this org that subscribes to this event
  FOR _webhook IN
    SELECT id, url, secret
      FROM public.org_webhooks
     WHERE org_id    = NEW.organization_id
       AND is_active = true
       AND _event_type = ANY(events)
  LOOP
    -- Insert pending delivery log entry
    INSERT INTO public.webhook_delivery_log (webhook_id, event_type, payload, status)
    VALUES (_webhook.id, _event_type, _payload, 'pending');

    -- Async HTTP POST via pg_net to our Edge Function
    PERFORM extensions.http_post(
      _edge_url || '/functions/v1/deliver-webhook',
      json_build_object(
        'webhook_id',  _webhook.id,
        'event_type',  _event_type,
        'payload',     _payload
      )::TEXT,
      'application/json'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Attach trigger to transfers
DROP TRIGGER IF EXISTS fire_webhooks_on_transfer ON public.transfers;
CREATE TRIGGER fire_webhooks_on_transfer
  AFTER INSERT OR UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.fire_transfer_webhooks();

-- ── Set the edge function URL ─────────────────────────────────────────────────
-- IMPORTANT: After running this migration, set app.settings.edge_function_url
-- in your Supabase project via:
--   ALTER DATABASE postgres SET "app.settings.edge_function_url" = 'https://<project>.supabase.co';
-- Or set it via the Supabase Dashboard → Database → Settings → Custom config
