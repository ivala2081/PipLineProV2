-- ============================================================================
-- 128: IB Partner Secondary Employee
--
-- Adds secondary_employee_id to ib_partners for exception/backup responsibility.
-- The primary "Responsible" employee remains managed_by_employee_id (migration 126).
-- NULL = no secondary assigned. Inherits existing ib_partners RLS policies.
-- ============================================================================

ALTER TABLE public.ib_partners
  ADD COLUMN IF NOT EXISTS secondary_employee_id UUID
    REFERENCES public.hr_employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ib_partners_secondary_employee
  ON public.ib_partners(secondary_employee_id)
  WHERE secondary_employee_id IS NOT NULL;
