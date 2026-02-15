-- ============================================================================
-- 043: God Role Audit Logging System
-- Track all operations performed by god role users for security and compliance
-- ============================================================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS public.god_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  god_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  god_email text NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_god_audit_log_created_at ON public.god_audit_log(created_at DESC);
CREATE INDEX idx_god_audit_log_god_user_id ON public.god_audit_log(god_user_id);
CREATE INDEX idx_god_audit_log_table_name ON public.god_audit_log(table_name);
CREATE INDEX idx_god_audit_log_action ON public.god_audit_log(action);

-- Enable RLS
ALTER TABLE public.god_audit_log ENABLE ROW LEVEL SECURITY;

-- Only god users can read audit logs
CREATE POLICY "god_audit_log_select" ON public.god_audit_log
  FOR SELECT TO authenticated
  USING (private.is_god());

-- System can insert (we'll use security definer function)
CREATE POLICY "god_audit_log_insert" ON public.god_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- No one can update or delete audit logs (immutable for integrity)
CREATE POLICY "god_audit_log_no_update" ON public.god_audit_log
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "god_audit_log_no_delete" ON public.god_audit_log
  FOR DELETE TO authenticated
  USING (false);

-- ============================================================================
-- Audit logging function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_god_action(
  p_action text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_god_user_id uuid;
  v_god_email text;
BEGIN
  -- Only log if current user is god
  IF NOT private.is_god() THEN
    RETURN;
  END IF;

  SELECT id INTO v_god_user_id
  FROM auth.users
  WHERE id = auth.uid();

  SELECT email INTO v_god_email
  FROM auth.users
  WHERE id = auth.uid();

  INSERT INTO public.god_audit_log (
    god_user_id,
    god_email,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    v_god_user_id,
    v_god_email,
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values,
    inet_client_addr(), -- Client IP
    current_setting('request.headers', true)::json->>'user-agent' -- User agent
  );
END;
$$;

-- ============================================================================
-- Protect system_role changes with trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_system_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If system_role is being changed
  IF OLD.system_role IS DISTINCT FROM NEW.system_role THEN
    -- Log the change
    PERFORM public.log_god_action(
      'CHANGE_SYSTEM_ROLE',
      'profiles',
      NEW.id,
      jsonb_build_object('system_role', OLD.system_role),
      jsonb_build_object('system_role', NEW.system_role)
    );

    -- Only god can change roles
    IF NOT private.is_god() THEN
      RAISE EXCEPTION 'Only god role can change system_role';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_system_role_trigger ON public.profiles;
CREATE TRIGGER protect_system_role_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_system_role_changes();

-- ============================================================================
-- Auto-log important operations (triggers for key tables)
-- ============================================================================

-- Log organization creation/updates by god
CREATE OR REPLACE FUNCTION public.audit_organization_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if performed by god
  IF NOT private.is_god() THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT') THEN
    PERFORM public.log_god_action(
      'CREATE_ORGANIZATION',
      'organizations',
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM public.log_god_action(
      'UPDATE_ORGANIZATION',
      'organizations',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.log_god_action(
      'DELETE_ORGANIZATION',
      'organizations',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_organization_trigger ON public.organizations;
CREATE TRIGGER audit_organization_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_organization_changes();

-- Log organization member changes by god
CREATE OR REPLACE FUNCTION public.audit_org_member_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if performed by god
  IF NOT private.is_god() THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT') THEN
    PERFORM public.log_god_action(
      'ADD_ORG_MEMBER',
      'organization_members',
      NEW.user_id,
      NULL,
      to_jsonb(NEW)
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM public.log_god_action(
      'UPDATE_ORG_MEMBER',
      'organization_members',
      NEW.user_id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.log_god_action(
      'REMOVE_ORG_MEMBER',
      'organization_members',
      OLD.user_id,
      to_jsonb(OLD),
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_org_member_trigger ON public.organization_members;
CREATE TRIGGER audit_org_member_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_org_member_changes();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_god_action TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.god_audit_log IS 'Audit trail of all operations performed by god role users';
COMMENT ON FUNCTION public.log_god_action IS 'Logs god role actions to the audit table. Call this from application code for custom auditing.';
