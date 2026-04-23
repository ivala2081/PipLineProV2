-- Fix hr_checkin_by_qr: hr_attendance.check_in is of type `time`, but the
-- previous version wrote text ('HH:MM'), causing:
--   "column check_in is of type time without time zone but expression is of type text"
-- Rewrite using proper `time` values and format to 'HH:MM' only at the JSON boundary.

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
  v_standard_in    text;        -- stored as text 'HH:MM' in hr_settings
  v_employee_id    uuid;
  v_employee_name  text;
  v_today          date;
  v_now_time       time;        -- actual time value
  v_now_hhmm       text;        -- 'HH:MM' for text comparison / response
  v_status         text;
  v_final_time     time;
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
  v_today     := (now() AT TIME ZONE v_tz)::date;
  v_now_time  := (now() AT TIME ZONE v_tz)::time;
  v_now_hhmm  := to_char(v_now_time, 'HH24:MI');

  -- 4) Status: late if current time is strictly after standard_check_in
  IF v_now_hhmm > v_standard_in THEN
    v_status := 'late';
  ELSE
    v_status := 'present';
  END IF;

  -- 5) Capture user agent for light audit (best-effort)
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
  RETURNING check_in INTO v_final_time;

  RETURN jsonb_build_object(
    'ok', true,
    'employee_name', v_employee_name,
    'check_in', to_char(v_final_time, 'HH24:MI'),
    'status', v_status,
    'already_checked_in', v_final_time IS DISTINCT FROM v_now_time
  );
END;
$$;

REVOKE ALL ON FUNCTION public.hr_checkin_by_qr(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.hr_checkin_by_qr(uuid, text) TO anon, authenticated;
