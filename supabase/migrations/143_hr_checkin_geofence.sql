-- ============================================================================
-- 143: HR QR check-in geofence
--
-- Adds optional GPS-based location verification to the QR check-in flow.
-- Closes the largest abuse vectors: leaked QR tokens, off-site check-ins,
-- and most buddy check-ins (where the buddy is not at the office).
--
-- Off by default — existing orgs are not affected until they explicitly
-- enable geofence in HR Settings.
--
-- Changes:
--   1. hr_settings: office_latitude, office_longitude, office_radius_meters,
--                   geofence_enabled
--   2. hr_attendance: check_in_lat, check_in_lng, check_in_distance_meters
--      (forensic — captured even when geofence is disabled, if client sent it)
--   3. hr_checkin_by_qr RPC: new optional p_lat / p_lng params; when geofence
--      is enabled, requires both and rejects if outside radius.
--
-- Re-runnable: each ALTER uses IF NOT EXISTS; CREATE OR REPLACE for the RPC.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. hr_settings: geofence config columns
-- ----------------------------------------------------------------------------
ALTER TABLE public.hr_settings
  ADD COLUMN IF NOT EXISTS office_latitude      NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS office_longitude     NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS office_radius_meters INT NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS geofence_enabled     BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.hr_settings.office_latitude IS
  'Office latitude (decimal degrees, WGS84). NULL when geofence not configured.';
COMMENT ON COLUMN public.hr_settings.office_longitude IS
  'Office longitude (decimal degrees, WGS84). NULL when geofence not configured.';
COMMENT ON COLUMN public.hr_settings.office_radius_meters IS
  'Allowed check-in radius from office centroid, in meters. GPS accuracy is typically 10-50m, so radius < 50 will produce false negatives.';
COMMENT ON COLUMN public.hr_settings.geofence_enabled IS
  'When true, hr_checkin_by_qr requires p_lat/p_lng and rejects check-ins outside office_radius_meters.';

-- Sanity CHECKs: lat ∈ [-90, 90], lng ∈ [-180, 180], radius > 0
ALTER TABLE public.hr_settings
  DROP CONSTRAINT IF EXISTS chk_hr_settings_office_lat,
  DROP CONSTRAINT IF EXISTS chk_hr_settings_office_lng,
  DROP CONSTRAINT IF EXISTS chk_hr_settings_office_radius;

ALTER TABLE public.hr_settings
  ADD CONSTRAINT chk_hr_settings_office_lat
    CHECK (office_latitude IS NULL OR (office_latitude BETWEEN -90 AND 90)),
  ADD CONSTRAINT chk_hr_settings_office_lng
    CHECK (office_longitude IS NULL OR (office_longitude BETWEEN -180 AND 180)),
  ADD CONSTRAINT chk_hr_settings_office_radius
    CHECK (office_radius_meters > 0 AND office_radius_meters <= 100000);

-- Defensive: geofence cannot be enabled without coordinates set
ALTER TABLE public.hr_settings
  DROP CONSTRAINT IF EXISTS chk_hr_settings_geofence_requires_coords;
ALTER TABLE public.hr_settings
  ADD CONSTRAINT chk_hr_settings_geofence_requires_coords
    CHECK (
      geofence_enabled = false
      OR (office_latitude IS NOT NULL AND office_longitude IS NOT NULL)
    );

-- ----------------------------------------------------------------------------
-- 2. hr_attendance: forensic GPS columns
-- ----------------------------------------------------------------------------
ALTER TABLE public.hr_attendance
  ADD COLUMN IF NOT EXISTS check_in_lat              NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS check_in_lng              NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS check_in_distance_meters  NUMERIC(10, 2);

COMMENT ON COLUMN public.hr_attendance.check_in_lat IS
  'Latitude reported by client at check-in (forensic — captured when present).';
COMMENT ON COLUMN public.hr_attendance.check_in_lng IS
  'Longitude reported by client at check-in (forensic).';
COMMENT ON COLUMN public.hr_attendance.check_in_distance_meters IS
  'Computed distance from office_latitude/office_longitude in meters. Useful for spot-checking borderline check-ins.';

-- ----------------------------------------------------------------------------
-- 3. Haversine helper — used by RPC. SQL function so it inlines / no overhead.
--    Returns distance in METERS between two (lat, lng) pairs in decimal degrees.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.haversine_distance_m(
  lat1 NUMERIC, lng1 NUMERIC,
  lat2 NUMERIC, lng2 NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT 6371000 * 2 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians(lng2 - lng1) / 2), 2)
  ))::NUMERIC
$$;

COMMENT ON FUNCTION public.haversine_distance_m(NUMERIC, NUMERIC, NUMERIC, NUMERIC) IS
  'Great-circle distance in meters between two (lat, lng) pairs (WGS84 spherical approximation, R=6371000m).';

-- ----------------------------------------------------------------------------
-- 4. Replace hr_checkin_by_qr — add optional p_lat / p_lng + geofence check
--
-- Existing callers (without lat/lng) keep working: params have DEFAULT NULL.
-- Backward compatible signature: orgs with geofence_enabled=false behave
-- identically to migrations 136-139.
--
-- New error codes:
--   gps_required  — geofence is enabled but client did not send GPS
--   out_of_range  — GPS sent but distance > office_radius_meters
--                   (response includes 'distance_meters' for UX)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hr_checkin_by_qr(
  p_token uuid,
  p_email text,
  p_lat   NUMERIC DEFAULT NULL,
  p_lng   NUMERIC DEFAULT NULL
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
BEGIN
  IF p_token IS NULL OR p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  -- 1. Resolve org + tz + standard time + geofence config from token
  SELECT organization_id, timezone, standard_check_in,
         office_latitude, office_longitude, office_radius_meters, geofence_enabled
    INTO v_org_id, v_tz, v_standard_in,
         v_office_lat, v_office_lng, v_radius, v_geofence_on
  FROM hr_settings
  WHERE qr_token = p_token;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  -- 2. Geofence guard — runs BEFORE employee lookup so we don't leak
  --    "this email exists" to off-site attackers.
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
    -- Geofence off but coordinates configured — still compute distance
    -- for forensic audit, no enforcement.
    v_distance := haversine_distance_m(v_office_lat, v_office_lng, p_lat, p_lng);
  END IF;

  -- 3. Resolve employee
  SELECT id, full_name INTO v_employee_id, v_employee_name
  FROM hr_employees
  WHERE organization_id = v_org_id
    AND lower(email) = lower(trim(p_email))
    AND is_active = true
    AND (exit_date IS NULL OR exit_date >= (now() AT TIME ZONE v_tz)::date);

  IF v_employee_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'employee_not_found');
  END IF;

  -- 4. Time + status
  v_today    := (now() AT TIME ZONE v_tz)::date;
  v_now_time := (now() AT TIME ZONE v_tz)::time;
  v_now_hhmm := to_char(v_now_time, 'HH24:MI');

  IF v_now_hhmm > v_standard_in THEN
    v_computed_status := 'late';
  ELSE
    v_computed_status := 'present';
  END IF;

  -- 5. Capture user agent (best-effort)
  BEGIN
    v_user_agent := current_setting('request.headers', true)::jsonb->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := NULL;
  END;

  -- 6. Upsert — preserve existing check_in AND existing manager-set status.
  --    GPS columns are also preserved on subsequent scans (first-scan-wins).
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

  RETURN jsonb_build_object(
    'ok', true,
    'employee_name', v_employee_name,
    'check_in', to_char(v_final_time, 'HH24:MI'),
    'status', v_final_status,
    'already_checked_in', v_final_time IS DISTINCT FROM v_now_time
  );
END;
$$;

REVOKE ALL ON FUNCTION public.hr_checkin_by_qr(uuid, text, NUMERIC, NUMERIC) FROM public;
GRANT EXECUTE ON FUNCTION public.hr_checkin_by_qr(uuid, text, NUMERIC, NUMERIC) TO anon, authenticated;

COMMENT ON FUNCTION public.hr_checkin_by_qr(uuid, text, NUMERIC, NUMERIC) IS
  'Public check-in: takes a hr_settings.qr_token, employee email, and optional GPS coords. When hr_settings.geofence_enabled=true, GPS is required and distance to office must be within office_radius_meters. SECURITY DEFINER. (migration 143)';

-- Drop the old 2-arg version if it still exists alongside the new 4-arg one.
-- Postgres allows function overloading, so without this drop we would have
-- two functions with the same name (one 2-arg, one 4-arg) and the 2-arg one
-- would silently bypass the geofence. Dangerous.
DROP FUNCTION IF EXISTS public.hr_checkin_by_qr(uuid, text);

COMMIT;
