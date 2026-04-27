-- ============================================================================
-- 145: HR late-reason — let employees explain why they were late
--
-- After a check-in is recorded as 'late', the /checkin success screen offers
-- an optional textarea ("metro broke down", "doctor's appointment", etc.).
-- The reason is captured immediately on the same screen so it stays accurate
-- and is locked at midnight to prevent retroactive narrative editing.
--
-- Schema:
--   hr_attendance.late_reason TEXT  — NULL when not late or not explained.
--
-- New public RPC:
--   hr_set_late_reason(p_token, p_email, p_device_id, p_reason)
--
-- Auth model mirrors hr_checkin_by_qr: token + email + device_id triple
-- proves the writer is the same device that made today's check-in. The
-- device_lock from migration 144 is the source of truth — if the device
-- is not the one that locked this email today, write is rejected.
--
-- This means:
--   • Buddies can't write reasons for someone else
--   • Past-day reasons cannot be edited (no lock for past days)
--   • Same-day re-edits work (idempotent UPDATE)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. New column
-- ----------------------------------------------------------------------------
ALTER TABLE public.hr_attendance
  ADD COLUMN IF NOT EXISTS late_reason TEXT;

COMMENT ON COLUMN public.hr_attendance.late_reason IS
  'Free-text reason supplied by the employee at check-in time when status=late. Same-day editable via hr_set_late_reason RPC; admin can edit any time. NULL when not late or not explained.';

-- ----------------------------------------------------------------------------
-- 2. RPC
--
-- Errors:
--   invalid_input    — empty token/email/reason or token NULL
--   invalid_token    — no org for that QR token
--   no_lock          — this device hasn't checked in today, OR device locked
--                      to a different email (covers both cases without
--                      leaking which one — same-day buddies can't fish)
--   no_attendance    — no hr_attendance row for today (shouldn't happen if
--                      lock exists, but guard anyway)
--   not_late         — status is not 'late', refusing to set late_reason
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hr_set_late_reason(
  p_token     uuid,
  p_email     text,
  p_device_id text,
  p_reason    text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_id           uuid;
  v_tz               text;
  v_today            date;
  v_normalized_email text;
  v_employee_id      uuid;
  v_status           text;
  v_clean_reason     text;
BEGIN
  IF p_token IS NULL
     OR p_email IS NULL OR length(trim(p_email)) = 0
     OR p_device_id IS NULL OR length(trim(p_device_id)) = 0
     OR p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  v_normalized_email := lower(trim(p_email));
  -- Cap to 500 chars; we want explanations, not essays.
  v_clean_reason := left(trim(p_reason), 500);

  -- 1. Resolve org + timezone
  SELECT organization_id, timezone
    INTO v_org_id, v_tz
  FROM hr_settings
  WHERE qr_token = p_token;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  v_today := (now() AT TIME ZONE v_tz)::date;

  -- 2. Verify the (device, email, today) lock matches — auth proof.
  --    No row → no_lock. Wrong email → no_lock (don't reveal which).
  SELECT employee_id INTO v_employee_id
  FROM hr_checkin_device_locks
  WHERE organization_id = v_org_id
    AND device_id        = p_device_id
    AND date             = v_today
    AND email            = v_normalized_email;

  IF v_employee_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_lock');
  END IF;

  -- 3. Check today's attendance row exists and is 'late'
  SELECT status INTO v_status
  FROM hr_attendance
  WHERE employee_id = v_employee_id
    AND date        = v_today;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_attendance');
  END IF;

  IF v_status <> 'late' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_late');
  END IF;

  -- 4. Update — same-day re-edits are idempotent
  UPDATE hr_attendance
     SET late_reason = v_clean_reason
   WHERE employee_id = v_employee_id
     AND date        = v_today;

  RETURN jsonb_build_object(
    'ok', true,
    'late_reason', v_clean_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.hr_set_late_reason(uuid, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.hr_set_late_reason(uuid, text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.hr_set_late_reason(uuid, text, text, text) IS
  'Public RPC called from /checkin to set hr_attendance.late_reason for today. Auth via QR token + email + matching device_lock. Same-day editable, locked at midnight (no past-day lock = no_lock error). SECURITY DEFINER. (migration 145)';

COMMIT;
