-- ============================================================================
-- 094: Restore invitation auto-accept logic in handle_new_user()
--
-- Migration 045b accidentally dropped the invitation auto-accept loop
-- when it replaced handle_new_user() to add the email column.
-- This restores the loop from migration 004 while keeping the email field.
-- Also includes a remediation query for any users already affected.
-- ============================================================================

-- 1. Restore handle_new_user() with both email + invitation auto-accept
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation record;
BEGIN
  -- 1. Create profile (with email, from 045b)
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  -- 2. Auto-accept pending invitations for this email (restored from 004)
  FOR _invitation IN
    SELECT id, organization_id, role
    FROM public.organization_invitations
    WHERE email = NEW.email
      AND status = 'pending'
      AND expires_at > now()
  LOOP
    INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
    SELECT _invitation.organization_id, NEW.id, _invitation.role, oi.invited_by
    FROM public.organization_invitations oi
    WHERE oi.id = _invitation.id
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    UPDATE public.organization_invitations
    SET status = 'accepted'
    WHERE id = _invitation.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 2. Remediation: fix users who were created after 045b and are stuck
--    without organization_members records
INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
SELECT oi.organization_id, u.id, oi.role, oi.invited_by
FROM public.organization_invitations oi
JOIN auth.users u ON u.email = oi.email
WHERE oi.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = oi.organization_id
      AND om.user_id = u.id
  );

UPDATE public.organization_invitations oi
SET status = 'accepted'
FROM auth.users u
WHERE u.email = oi.email
  AND oi.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = oi.organization_id
      AND om.user_id = u.id
  );
