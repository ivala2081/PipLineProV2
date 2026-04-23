-- HR QR Check-in
-- Adds a stable per-organization QR token to hr_settings and a public RPC
-- that lets an employee record their check_in by scanning the QR and
-- entering their email — no login required.

-- ---------------------------------------------------------------------------
-- 1) qr_token column (unique per organization, stable)
-- ---------------------------------------------------------------------------
ALTER TABLE hr_settings
  ADD COLUMN IF NOT EXISTS qr_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS hr_settings_qr_token_uidx
  ON hr_settings(qr_token);

-- Backfill safety — any pre-existing row that somehow has a NULL token
UPDATE hr_settings SET qr_token = gen_random_uuid() WHERE qr_token IS NULL;

-- ---------------------------------------------------------------------------
-- 2) Public RPC: token + email -> today's check_in on hr_attendance
-- ---------------------------------------------------------------------------
-- Returns JSON:
--   { ok: true,  employee_name, check_in ('HH:MM'), status, already_checked_in }
--   { ok: false, error: 'invalid_token' | 'employee_not_found' }
--
-- First scan of the day wins — if an attendance row already has a check_in,
-- it is preserved (COALESCE). This means managers can still override status
-- manually from AttendanceTab without being overwritten by a later scan.

CREATE OR REPLACE FUNCTION public.hr_checkin_by_qr(
  p_token uuid,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_id         uuid;
  v_tz             text;
  v_standard_in    text;
  v_employee_id    uuid;
  v_employee_name  text;
  v_today          date;
  v_now_time       text;   -- 'HH:MM' in org tz
  v_status         text;
  v_final_check_in text;
  v_user_agent     text;
BEGIN
  IF p_token IS NULL OR p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  -- 1) Resolve organization + tz + standard check-in from the token
  SELECT organization_id, timezone, standard_check_in
    INTO v_org_id, v_tz, v_standard_in
  FROM hr_settings
  WHERE qr_token = p_token;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  -- 2) Resolve employee by email within that organization (must be active)
  SELECT id, full_name INTO v_employee_id, v_employee_name
  FROM hr_employees
  WHERE organization_id = v_org_id
    AND lower(email) = lower(trim(p_email))
    AND is_active = true
    AND (exit_date IS NULL OR exit_date >= (now() AT TIME ZONE v_tz)::date);

  IF v_employee_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'employee_not_found');
  END IF;

  -- 3) Today's date and current time in the org timezone
  v_today    := (now() AT TIME ZONE v_tz)::date;
  v_now_time := to_char(now() AT TIME ZONE v_tz, 'HH24:MI');

  -- 4) Status: late if current time is strictly after standard_check_in
  --    (HH:MM text comparison is correct for zero-padded 24h format)
  IF v_now_time > v_standard_in THEN
    v_status := 'late';
  ELSE
    v_status := 'present';
  END IF;

  -- 5) Capture user agent for light audit (best-effort, may be NULL)
  BEGIN
    v_user_agent := current_setting('request.headers', true)::jsonb->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := NULL;
  END;

  -- 6) Upsert — preserve existing check_in (first scan wins)
  INSERT INTO hr_attendance (
    employee_id, organization_id, date, status, check_in, notes, recorded_by
  )
  VALUES (
    v_employee_id, v_org_id, v_today, v_status, v_now_time,
    'QR: ' || coalesce(left(v_user_agent, 200), ''), NULL
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
                   END
  RETURNING check_in INTO v_final_check_in;

  RETURN jsonb_build_object(
    'ok', true,
    'employee_name', v_employee_name,
    'check_in', v_final_check_in,
    'status', v_status,
    'already_checked_in', v_final_check_in IS DISTINCT FROM v_now_time
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Grant anonymous execute access
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.hr_checkin_by_qr(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.hr_checkin_by_qr(uuid, text) TO anon, authenticated;

COMMENT ON FUNCTION public.hr_checkin_by_qr(uuid, text) IS
  'Public check-in: takes a hr_settings.qr_token and an employee email; writes today''s check_in to hr_attendance (first scan wins). SECURITY DEFINER.';
