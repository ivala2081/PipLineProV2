-- ============================================================================
-- 133: IB Auto-Reassign on Employee Deactivation
--
-- When an HR employee is deactivated (is_active: true → false),
-- any IB partners managed by or secondarily assigned to that employee
-- are automatically unassigned (set to NULL = organization default).
-- Also cleans up existing records where secondary = primary (duplicate).
-- ============================================================================

-- 1) Trigger function
CREATE OR REPLACE FUNCTION public.unassign_ib_partners_on_employee_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    UPDATE ib_partners
      SET managed_by_employee_id = NULL
      WHERE managed_by_employee_id = OLD.id;

    UPDATE ib_partners
      SET secondary_employee_id = NULL
      WHERE secondary_employee_id = OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Trigger (fires only when is_active changes from true to false)
CREATE TRIGGER trg_ib_unassign_on_employee_deactivation
  AFTER UPDATE OF is_active ON hr_employees
  FOR EACH ROW
  WHEN (OLD.is_active = true AND NEW.is_active = false)
  EXECUTE FUNCTION unassign_ib_partners_on_employee_deactivation();

-- 3) Data cleanup: remove duplicate secondary = primary
UPDATE ib_partners
  SET secondary_employee_id = NULL
  WHERE secondary_employee_id IS NOT NULL
    AND secondary_employee_id = managed_by_employee_id;

-- 4) Data cleanup: clear secondary where primary is NULL (org-managed)
--    Secondary without a primary responsible makes no sense
UPDATE ib_partners
  SET secondary_employee_id = NULL
  WHERE managed_by_employee_id IS NULL
    AND secondary_employee_id IS NOT NULL;
