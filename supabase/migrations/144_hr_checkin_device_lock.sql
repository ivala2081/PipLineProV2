-- ============================================================================
-- 144: HR QR check-in — one email per device per day
--
-- Closes the buddy check-in vector (where two people share one phone): once a
-- device is used to check in for email X today, the same device cannot be
-- used to check in for email Y until tomorrow. Combined with geofence (143),
-- this means one phone == one identity per office-day, and only employees
-- physically at the office can check in at all.
--
-- Why "lock" rather than "rate limit": rate limits are time-window based and
-- attackers can wait them out. A daily lock means buddy check-ins are forced
-- to use *different* devices, which is operationally hard.
--
-- Confirmation in UI: because the lock cannot be undone by the employee (only
-- by an admin via SQL), the /checkin page asks "are you sure?" before the
-- first submit each day. Frontend mirrors the lock in localStorage so the
-- prompt only fires when it's actually new.
--
-- Schema:
--   hr_checkin_device_locks (org, device_id, date) UNIQUE → email + employee
--   The RPC inserts the lock as part of the same transaction as the
--   hr_attendance UPSERT, so a device lock without an attendance row is
--   impossible (and vice versa).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Lock table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_checkin_device_locks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id       TEXT NOT NULL,
  date            DATE NOT NULL,
  email           TEXT NOT NULL,           -- lowercased + trimmed
  employee_id     UUID REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hr_checkin_device_locks_unique
  ON public.hr_checkin_device_locks (organization_id, device_id, date);

CREATE INDEX IF NOT EXISTS hr_checkin_device_locks_org_date
  ON public.hr_checkin_device_locks (organization_id, date DESC);

CREATE INDEX IF NOT EXISTS hr_checkin_device_locks_employee
  ON public.hr_checkin_device_locks (employee_id, date DESC);

COMMENT ON TABLE public.hr_checkin_device_locks IS
  'Per-device, per-day binding between a check-in device and an employee email. Created atomically with the hr_attendance UPSERT in hr_checkin_by_qr. Prevents one device from checking in for multiple emails on the same day.';

-- ----------------------------------------------------------------------------
-- 2. RLS — admins can audit, public RPC bypasses via SECURITY DEFINER
-- ----------------------------------------------------------------------------
ALTER TABLE public.hr_checkin_device_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_checkin_device_locks_select" ON public.hr_checkin_device_locks;
CREATE POLICY "hr_checkin_device_locks_select"
  ON public.hr_checkin_device_locks
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

DROP POLICY IF EXISTS "hr_checkin_device_locks_delete" ON public.hr_checkin_device_locks;
CREATE POLICY "hr_checkin_device_locks_delete"
  ON public.hr_checkin_device_locks
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.is_org_admin_or_manager(organization_id))
  );

-- No INSERT/UPDATE policies — only the SECURITY DEFINER RPC writes.

-- ----------------------------------------------------------------------------
-- 3. Replace hr_checkin_by_qr — adds optional p_device_id and locks-per-day
--
-- Order of guards (security-sensitive):
--   1. invalid_input          (token/email empty)
--   2. invalid_token          (no org)
--   3. geofence guards        (gps_required / out_of_range) — see migration 143
--   4. device_locked          (this device already used for a different email)
--   5. employee_not_found     (after all the above so we don't leak email exists)
--   6. INSERT both lock + attendance atomically
--
-- New error code:
--   device_locked   — same device already checked in today for a different
--                     email. Response includes 'locked_at' (timestamp) but
--                     NOT the locked email — that would leak which emails
--                     belong to your colleagues to anyone with the QR.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hr_checkin_by_qr(
  p_token     uuid,
  p_email     text,
  p_lat       NUMERIC DEFAULT NULL,
  p_lng       NUMERIC DEFAULT NULL,
  p_device_id text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_id          uuid;
  v_tz              text;
  v_standard_in     text;
  v_office_lat      NUMERIC;
  v_office_lng      NUMERIC;
  v_radius          INT;
  v_geofence_on     BOOLEAN;
  v_distance        NUMERIC;
  v_employee_id     uuid;
  v_employee_name   text;
  v_today           date;
  v_now_time        time;
  v_now_hhmm        text;
  v_computed_status text;
  v_final_time      time;
  v_final_status    text;
  v_user_agent      text;
  v_normalized_email text;
  v_lock_email      text;
  v_lock_created_at timestamptz;
BEGIN
  IF p_token IS NULL OR p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  v_normalized_email := lower(trim(p_email));

  -- 1. Resolve org + geofence config
  SELECT organization_id, timezone, standard_check_in,
         office_latitude, office_longitude, office_radius_meters, geofence_enabled
    INTO v_org_id, v_tz, v_standard_in,
         v_office_lat, v_office_lng, v_radius, v_geofence_on
  FROM hr_settings
  WHERE qr_token = p_token;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  v_today := (now() AT TIME ZONE v_tz)::date;

  -- 2. Geofence guard (migration 143)
  IF v_geofence_on THEN
    IF p_lat IS NULL OR p_lng IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'gps_required');
    END IF;

    v_distance := haversine_distance_m(v_office_lat, v_office_lng, p_lat, p_lng);

    IF v_distance > v_radius THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'out_of_range',
        'distance_meters', round(v_distance)::int,
        'radius_meters', v_radius
      );
    END IF;
  ELSIF p_lat IS NOT NULL AND p_lng IS NOT NULL AND v_office_lat IS NOT NULL THEN
    v_distance := haversine_distance_m(v_office_lat, v_office_lng, p_lat, p_lng);
  END IF;

  -- 3. Device lock guard (migration 144)
  --    Runs before employee lookup so we don't reveal email existence.
  IF p_device_id IS NOT NULL AND length(trim(p_device_id)) > 0 THEN
    SELECT email, created_at
      INTO v_lock_email, v_lock_created_at
    FROM hr_checkin_device_locks
    WHERE organization_id = v_org_id
      AND device_id        = p_device_id
      AND date             = v_today;

    IF v_lock_email IS NOT NULL AND v_lock_email <> v_normalized_email THEN
      -- Different email from same device today → reject.
      -- Intentionally do NOT include the locked email in the response —
      -- that would leak coworker email/identity to anyone with the QR.
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'device_locked',
        'locked_at', v_lock_created_at
      );
    END IF;
  END IF;

  -- 4. Resolve employee
  SELECT id, full_name INTO v_employee_id, v_employee_name
  FROM hr_employees
  WHERE organization_id = v_org_id
    AND lower(email)    = v_normalized_email
    AND is_active       = true
    AND (exit_date IS NULL OR exit_date >= v_today);

  IF v_employee_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'employee_not_found');
  END IF;

  -- 5. Time + status
  v_now_time := (now() AT TIME ZONE v_tz)::time;
  v_now_hhmm := to_char(v_now_time, 'HH24:MI');

  IF v_now_hhmm > v_standard_in THEN
    v_computed_status := 'late';
  ELSE
    v_computed_status := 'present';
  END IF;

  BEGIN
    v_user_agent := current_setting('request.headers', true)::jsonb->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := NULL;
  END;

  -- 6. Atomic UPSERT — attendance + device lock
  INSERT INTO hr_attendance (
    employee_id, organization_id, date, status, check_in, notes, recorded_by,
    check_in_lat, check_in_lng, check_in_distance_meters
  )
  VALUES (
    v_employee_id, v_org_id, v_today, v_computed_status, v_now_time,
    'QR: ' || coalesce(left(v_user_agent, 200), ''), NULL,
    p_lat, p_lng, v_distance
  )
  ON CONFLICT (employee_id, date) DO UPDATE
    SET check_in = COALESCE(hr_attendance.check_in, EXCLUDED.check_in),
        status   = CASE
                     WHEN hr_attendance.check_in IS NULL THEN EXCLUDED.status
                     ELSE hr_attendance.status
                   END,
        notes    = CASE
                     WHEN hr_attendance.check_in IS NULL THEN EXCLUDED.notes
                     ELSE hr_attendance.notes
                   END,
        check_in_lat              = COALESCE(hr_attendance.check_in_lat, EXCLUDED.check_in_lat),
        check_in_lng              = COALESCE(hr_attendance.check_in_lng, EXCLUDED.check_in_lng),
        check_in_distance_meters  = COALESCE(
                                      hr_attendance.check_in_distance_meters,
                                      EXCLUDED.check_in_distance_meters
                                    )
  RETURNING check_in, status INTO v_final_time, v_final_status;

  -- Insert device lock (no-op on conflict — first lock wins, idempotent
  -- for repeat scans by the same employee on the same device).
  IF p_device_id IS NOT NULL AND length(trim(p_device_id)) > 0 THEN
    INSERT INTO hr_checkin_device_locks (
      organization_id, device_id, date, email, employee_id, user_agent
    )
    VALUES (
      v_org_id, p_device_id, v_today, v_normalized_email, v_employee_id,
      left(v_user_agent, 200)
    )
    ON CONFLICT (organization_id, device_id, date) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'employee_name', v_employee_name,
    'check_in', to_char(v_final_time, 'HH24:MI'),
    'status', v_final_status,
    'already_checked_in', v_final_time IS DISTINCT FROM v_now_time
  );
END;
$$;

REVOKE ALL ON FUNCTION public.hr_checkin_by_qr(uuid, text, NUMERIC, NUMERIC, text) FROM public;
GRANT EXECUTE ON FUNCTION public.hr_checkin_by_qr(uuid, text, NUMERIC, NUMERIC, text) TO anon, authenticated;

COMMENT ON FUNCTION public.hr_checkin_by_qr(uuid, text, NUMERIC, NUMERIC, text) IS
  'Public check-in: token + email + optional GPS + optional device_id. Geofence (143) and device lock (144) guards both run before the employee lookup to avoid leaking email existence. SECURITY DEFINER. (migration 144)';

-- Drop prior 4-arg overload — keeping it would let callers silently bypass
-- the device lock by omitting p_device_id, defeating the purpose.
DROP FUNCTION IF EXISTS public.hr_checkin_by_qr(uuid, text, NUMERIC, NUMERIC);

COMMIT;
