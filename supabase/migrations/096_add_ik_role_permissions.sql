-- ============================================================================
-- 096: Grant IK (HR) role access to accounting + HR tables
--
-- IK role needs full access to:
--   - accounting_entries, accounting_monthly_config (via is_org_admin_or_manager)
--   - All hr_* tables (inline policy updates)
-- ============================================================================

-- 1. Update is_org_admin_or_manager() to include 'ik' role
--    This fixes: accounting_entries, accounting_monthly_config,
--    organization_members/invitations management, transfer DELETE
CREATE OR REPLACE FUNCTION private.is_org_admin_or_manager(_org_id uuid)
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
      AND role IN ('admin', 'manager', 'ik')
  )
$$;

-- 2. hr_settings
DROP POLICY IF EXISTS "admins can manage hr_settings" ON hr_settings;
CREATE POLICY "admins can manage hr_settings" ON hr_settings
  FOR ALL
  USING (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  );

-- 3. hr_leaves
DROP POLICY IF EXISTS "admins can manage hr_leaves" ON hr_leaves;
CREATE POLICY "admins can manage hr_leaves" ON hr_leaves
  FOR ALL
  USING (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  );

-- 4. hr_employees
DROP POLICY IF EXISTS "admins can manage hr_employees" ON hr_employees;
CREATE POLICY "admins can manage hr_employees" ON hr_employees
  FOR ALL
  USING (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  );

-- 5. hr_employee_documents
DROP POLICY IF EXISTS "admins can manage hr_employee_documents" ON hr_employee_documents;
CREATE POLICY "admins can manage hr_employee_documents" ON hr_employee_documents
  FOR ALL
  USING (
    (SELECT private.is_god())
    OR employee_id IN (
      SELECT id FROM hr_employees WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
      )
    )
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR employee_id IN (
      SELECT id FROM hr_employees WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
      )
    )
  );

-- 6. hr_bonus_agreements
DROP POLICY IF EXISTS "admins can manage hr_bonus_agreements" ON hr_bonus_agreements;
CREATE POLICY "admins can manage hr_bonus_agreements" ON hr_bonus_agreements
  FOR ALL
  USING (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  );

-- 7. hr_bonus_payments
DROP POLICY IF EXISTS "admins can manage hr_bonus_payments" ON hr_bonus_payments;
CREATE POLICY "admins can manage hr_bonus_payments" ON hr_bonus_payments
  FOR ALL
  USING (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  );

-- 8. hr_attendance
DROP POLICY IF EXISTS "admins can manage hr_attendance" ON hr_attendance;
CREATE POLICY "admins can manage hr_attendance" ON hr_attendance
  FOR ALL
  USING (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  );

-- 9. hr_salary_payments
DROP POLICY IF EXISTS "admins can manage hr_salary_payments" ON hr_salary_payments;
CREATE POLICY "admins can manage hr_salary_payments" ON hr_salary_payments
  FOR ALL
  USING (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  );

-- 10. hr_mt_config
DROP POLICY IF EXISTS "admins can manage hr_mt_config" ON hr_mt_config;
CREATE POLICY "admins can manage hr_mt_config" ON hr_mt_config
  FOR ALL
  USING (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  );

-- 11. hr_re_config
DROP POLICY IF EXISTS "admins can manage hr_re_config" ON hr_re_config;
CREATE POLICY "admins can manage hr_re_config" ON hr_re_config
  FOR ALL
  USING (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ik')
    )
  );
