-- ============================================================================
-- 019: Extended profile fields + admin profile update RLS
-- ============================================================================

-- 1. Add new columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notes text;

-- 2. Update RLS: allow org admins to UPDATE profiles of co-members
--    Previous policy: own profile OR god
--    New policy: own profile OR god OR admin of a shared org
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (SELECT private.is_god())
    OR (
      EXISTS (
        SELECT 1
        FROM public.organization_members om_target
        JOIN public.organization_members om_self
          ON om_self.organization_id = om_target.organization_id
         AND om_self.user_id = (SELECT auth.uid())
         AND om_self.role = 'admin'
        WHERE om_target.user_id = profiles.id
      )
    )
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR (SELECT private.is_god())
    OR (
      EXISTS (
        SELECT 1
        FROM public.organization_members om_target
        JOIN public.organization_members om_self
          ON om_self.organization_id = om_target.organization_id
         AND om_self.user_id = (SELECT auth.uid())
         AND om_self.role = 'admin'
        WHERE om_target.user_id = profiles.id
      )
    )
  );
