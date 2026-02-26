-- Create hr_leaves table for employee leave management
CREATE TABLE IF NOT EXISTS hr_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('paid', 'unpaid', 'annual')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_leaves_employee ON hr_leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_org ON hr_leaves(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_dates ON hr_leaves(start_date, end_date);

-- Enable RLS
ALTER TABLE hr_leaves ENABLE ROW LEVEL SECURITY;

-- Read policy: org members can read
CREATE POLICY "org members can read hr_leaves" ON hr_leaves
  FOR SELECT
  USING (
    (SELECT private.is_god())
    OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Write policy: god/admin/manager can manage
CREATE POLICY "admins can manage hr_leaves" ON hr_leaves
  FOR ALL
  USING (
    (SELECT private.is_god())
    OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

-- Grant permissions
GRANT ALL ON hr_leaves TO authenticated;
