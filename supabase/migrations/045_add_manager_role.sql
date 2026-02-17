-- ============================================================================
-- 045: Add Manager Role + Profiles Email Column
--
-- 1. Add 'manager' to org_members and org_invitations role CHECK
-- 2. Update private.is_org_admin() to include manager
-- 3. Add email column to profiles (for audit performer display)
-- 4. Update handle_new_user trigger to populate email
-- 5. Backfill existing profiles with email from auth.users
-- ============================================================================

-- ============================================================================
-- 1. Add 'manager' to role CHECK constraints
-- ============================================================================

ALTER TABLE public.organization_members DROP CONSTRAINT organization_members_role_check;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check CHECK (role IN ('admin', 'manager', 'operation'));

ALTER TABLE public.organization_invitations DROP CONSTRAINT organization_invitations_role_check;
ALTER TABLE public.organization_invitations
  ADD CONSTRAINT organization_invitations_role_check CHECK (role IN ('admin', 'manager', 'operation'));

-- ============================================================================
-- 2. Update is_org_admin() to include manager
-- ============================================================================

CREATE OR REPLACE FUNCTION private.is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'manager')
  )
$$;

-- ============================================================================
-- 3. Add email column to profiles
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- ============================================================================
-- 4. Update handle_new_user trigger to also populate email
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 5. Backfill existing profiles with email
-- ============================================================================

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;
