-- Fix hr_settings write policy to use private.is_god() like other HR tables
DROP POLICY IF EXISTS "admins can manage hr_settings" ON hr_settings;

CREATE POLICY "admins can manage hr_settings" ON hr_settings
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
