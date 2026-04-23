-- hr_checkin_by_qr was returning the freshly-computed status, which ignored
-- any manual override the manager had made in AttendanceTab. If a scan set
-- status='late' and the manager later flipped it to 'present', the next scan
-- still showed "Geç" to the employee.
--
-- Fix: return the actual status from hr_attendance after the upsert.

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
  v_now_time       time;
  v_now_hhmm       text;
  v_computed_status text;
  v_final_time     time;
  v_final_status   text;
  v_user_agent     text;
BEGIN
  IF p_token IS NULL OR p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  SELECT organization_id, timezone, standard_check_in
    INTO v_org_id, v_tz, v_standard_in
  FROM hr_settings
  WHERE qr_token = p_token;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT id, full_name INTO v_employee_id, v_employee_name
  FROM hr_employees
  WHERE organization_id = v_org_id
    AND lower(email) = lower(trim(p_email))
    AND is_active = true
    AND (exit_date IS NULL OR exit_date >= (now() AT TIME ZONE v_tz)::date);

  IF v_employee_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'employee_not_found');
  END IF;

  v_today    := (now() AT TIME ZONE v_tz)::date;
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

  -- Upsert — preserve existing check_in AND existing manager-set status.
  INSERT INTO hr_attendance (
    employee_id, organization_id, date, status, check_in, notes, recorded_by
  )
  VALUES (
    v_employee_id, v_org_id, v_today, v_computed_status, v_now_time,
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

REVOKE ALL ON FUNCTION public.hr_checkin_by_qr(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.hr_checkin_by_qr(uuid, text) TO anon, authenticated;
