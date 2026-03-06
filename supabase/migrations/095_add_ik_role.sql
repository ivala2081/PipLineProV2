-- ============================================================================
-- 095: Add 'ik' (HR) role to organization members and invitations
-- ============================================================================

ALTER TABLE public.organization_members DROP CONSTRAINT organization_members_role_check;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check CHECK (role IN ('admin', 'manager', 'operation', 'ik'));

ALTER TABLE public.organization_invitations DROP CONSTRAINT organization_invitations_role_check;
ALTER TABLE public.organization_invitations
  ADD CONSTRAINT organization_invitations_role_check CHECK (role IN ('admin', 'manager', 'operation', 'ik'));
