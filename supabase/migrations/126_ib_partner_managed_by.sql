-- Add managed_by_employee_id to ib_partners
-- NULL = managed by the organization itself, UUID = managed by an HR employee
ALTER TABLE ib_partners
  ADD COLUMN managed_by_employee_id UUID REFERENCES hr_employees(id) ON DELETE SET NULL;

CREATE INDEX idx_ib_partners_managed_by ON ib_partners(managed_by_employee_id);
