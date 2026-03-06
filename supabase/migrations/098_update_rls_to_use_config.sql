-- ============================================================================
-- 098: Update RLS policies to use role_permissions config table
--
-- Replaces hardcoded role checks with private.has_role_permission() calls.
-- God policies remain UNTOUCHED — they always bypass.
-- If no config row exists, default_permission() fallback preserves old behavior.
-- ============================================================================

-- ============================================================================
-- TRANSFERS
-- ============================================================================

-- SELECT: soft-delete aware (migration 086)
-- Drop old member-level select policies
DROP POLICY IF EXISTS "transfers_select_member" ON public.transfers;
DROP POLICY IF EXISTS "Read transfers (non-deleted)" ON public.transfers;
DROP POLICY IF EXISTS "Read deleted transfers (trash)" ON public.transfers;

-- Non-deleted: role-based select
CREATE POLICY "transfers_select_member" ON public.transfers
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      (SELECT private.is_god())
      OR (SELECT private.has_role_permission(organization_id, 'transfers', 'select'))
    )
  );

-- Trash: role-based select (only those with delete permission can see trash)
CREATE POLICY "transfers_select_trash" ON public.transfers
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NOT NULL
    AND (
      (SELECT private.is_god())
      OR (SELECT private.has_role_permission(organization_id, 'transfers', 'delete'))
    )
  );

-- INSERT
DROP POLICY IF EXISTS "transfers_insert_member" ON public.transfers;
CREATE POLICY "transfers_insert_member" ON public.transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'transfers', 'insert'))
  );

-- UPDATE
DROP POLICY IF EXISTS "transfers_update_member" ON public.transfers;
CREATE POLICY "transfers_update_member" ON public.transfers
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'transfers', 'update'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'transfers', 'update'))
  );

-- DELETE
DROP POLICY IF EXISTS "transfers_delete_admin_or_manager" ON public.transfers;
DROP POLICY IF EXISTS "transfers_delete_admin" ON public.transfers;
CREATE POLICY "transfers_delete_member" ON public.transfers
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'transfers', 'delete'))
  );

-- Drop redundant god-only policies (now merged into member policies above)
DROP POLICY IF EXISTS "transfers_select_god" ON public.transfers;
DROP POLICY IF EXISTS "transfers_insert_god" ON public.transfers;
DROP POLICY IF EXISTS "transfers_update_god" ON public.transfers;
DROP POLICY IF EXISTS "transfers_delete_god" ON public.transfers;

-- ============================================================================
-- TRANSFER AUDIT LOG
-- ============================================================================

DROP POLICY IF EXISTS "audit_select" ON public.transfer_audit_log;
CREATE POLICY "audit_select" ON public.transfer_audit_log
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'transfer_audit_log', 'select'))
  );

-- ============================================================================
-- PSPs
-- ============================================================================

DROP POLICY IF EXISTS "psps_select" ON public.psps;
CREATE POLICY "psps_select" ON public.psps
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'psps', 'select'))
  );

DROP POLICY IF EXISTS "psps_insert" ON public.psps;
CREATE POLICY "psps_insert" ON public.psps
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'psps', 'insert'))
  );

DROP POLICY IF EXISTS "psps_update" ON public.psps;
CREATE POLICY "psps_update" ON public.psps
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'psps', 'update'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'psps', 'update'))
  );

DROP POLICY IF EXISTS "psps_delete" ON public.psps;
CREATE POLICY "psps_delete" ON public.psps
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'psps', 'delete'))
  );

-- ============================================================================
-- PSP COMMISSION RATES
-- ============================================================================

DROP POLICY IF EXISTS "psp_rates_select" ON public.psp_commission_rates;
CREATE POLICY "psp_rates_select" ON public.psp_commission_rates
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'psp_commission_rates', 'select'))
  );

DROP POLICY IF EXISTS "psp_rates_insert" ON public.psp_commission_rates;
CREATE POLICY "psp_rates_insert" ON public.psp_commission_rates
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'psp_commission_rates', 'insert'))
  );

DROP POLICY IF EXISTS "psp_rates_delete" ON public.psp_commission_rates;
CREATE POLICY "psp_rates_delete" ON public.psp_commission_rates
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'psp_commission_rates', 'delete'))
  );

-- ============================================================================
-- PSP SETTLEMENTS
-- ============================================================================

DROP POLICY IF EXISTS "psp_settlements_select" ON public.psp_settlements;
CREATE POLICY "psp_settlements_select" ON public.psp_settlements
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'psp_settlements', 'select'))
  );

DROP POLICY IF EXISTS "psp_settlements_insert" ON public.psp_settlements;
CREATE POLICY "psp_settlements_insert" ON public.psp_settlements
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'psp_settlements', 'insert'))
  );

DROP POLICY IF EXISTS "psp_settlements_update" ON public.psp_settlements;
CREATE POLICY "psp_settlements_update" ON public.psp_settlements
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'psp_settlements', 'update'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'psp_settlements', 'update'))
  );

DROP POLICY IF EXISTS "psp_settlements_delete" ON public.psp_settlements;
CREATE POLICY "psp_settlements_delete" ON public.psp_settlements
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'psp_settlements', 'delete'))
  );

-- ============================================================================
-- ACCOUNTING ENTRIES
-- ============================================================================

DROP POLICY IF EXISTS "acct_entries_select" ON public.accounting_entries;
CREATE POLICY "acct_entries_select" ON public.accounting_entries
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'accounting_entries', 'select'))
  );

DROP POLICY IF EXISTS "acct_entries_insert" ON public.accounting_entries;
CREATE POLICY "acct_entries_insert" ON public.accounting_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'accounting_entries', 'insert'))
  );

DROP POLICY IF EXISTS "acct_entries_update" ON public.accounting_entries;
CREATE POLICY "acct_entries_update" ON public.accounting_entries
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'accounting_entries', 'update'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'accounting_entries', 'update'))
  );

DROP POLICY IF EXISTS "acct_entries_delete" ON public.accounting_entries;
CREATE POLICY "acct_entries_delete" ON public.accounting_entries
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'accounting_entries', 'delete'))
  );

-- ============================================================================
-- ACCOUNTING MONTHLY CONFIG
-- ============================================================================

DROP POLICY IF EXISTS "acct_config_select" ON public.accounting_monthly_config;
CREATE POLICY "acct_config_select" ON public.accounting_monthly_config
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'accounting_monthly_config', 'select'))
  );

DROP POLICY IF EXISTS "acct_config_insert" ON public.accounting_monthly_config;
CREATE POLICY "acct_config_insert" ON public.accounting_monthly_config
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'accounting_monthly_config', 'insert'))
  );

DROP POLICY IF EXISTS "acct_config_update" ON public.accounting_monthly_config;
CREATE POLICY "acct_config_update" ON public.accounting_monthly_config
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'accounting_monthly_config', 'update'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'accounting_monthly_config', 'update'))
  );

DROP POLICY IF EXISTS "acct_config_delete" ON public.accounting_monthly_config;
CREATE POLICY "acct_config_delete" ON public.accounting_monthly_config
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'accounting_monthly_config', 'delete'))
  );

-- ============================================================================
-- ORGANIZATION MEMBERS
-- ============================================================================

DROP POLICY IF EXISTS "org_members_insert" ON public.organization_members;
CREATE POLICY "org_members_insert" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'organization_members', 'insert'))
  );

DROP POLICY IF EXISTS "org_members_update" ON public.organization_members;
CREATE POLICY "org_members_update" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'organization_members', 'update'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'organization_members', 'update'))
  );

DROP POLICY IF EXISTS "org_members_delete" ON public.organization_members;
CREATE POLICY "org_members_delete" ON public.organization_members
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (
      (SELECT private.has_role_permission(organization_id, 'organization_members', 'delete'))
      AND user_id != (SELECT auth.uid())
    )
  );

-- ============================================================================
-- ORGANIZATION INVITATIONS
-- ============================================================================

DROP POLICY IF EXISTS "org_invitations_select" ON public.organization_invitations;
CREATE POLICY "org_invitations_select" ON public.organization_invitations
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'organization_invitations', 'select'))
  );

DROP POLICY IF EXISTS "org_invitations_insert" ON public.organization_invitations;
CREATE POLICY "org_invitations_insert" ON public.organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'organization_invitations', 'insert'))
  );

DROP POLICY IF EXISTS "org_invitations_update" ON public.organization_invitations;
CREATE POLICY "org_invitations_update" ON public.organization_invitations
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'organization_invitations', 'update'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'organization_invitations', 'update'))
  );

DROP POLICY IF EXISTS "org_invitations_delete" ON public.organization_invitations;
CREATE POLICY "org_invitations_delete" ON public.organization_invitations
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'organization_invitations', 'delete'))
  );

-- ============================================================================
-- ORGANIZATIONS (only UPDATE — INSERT/DELETE remain god-only)
-- ============================================================================

DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(id, 'organizations', 'update'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(id, 'organizations', 'update'))
  );

-- Also update SELECT to use config (org.id = organization_id context)
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_god())
    OR id IN (SELECT private.get_user_org_ids())
  );

-- ============================================================================
-- HR TABLES (all use FOR ALL pattern from migration 096)
-- ============================================================================

-- hr_settings
DROP POLICY IF EXISTS "admins can manage hr_settings" ON public.hr_settings;
CREATE POLICY "hr_settings_all" ON public.hr_settings
  FOR ALL TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_settings', 'select'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_settings', 'insert'))
  );

-- hr_leaves
DROP POLICY IF EXISTS "admins can manage hr_leaves" ON public.hr_leaves;
CREATE POLICY "hr_leaves_all" ON public.hr_leaves
  FOR ALL TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_leaves', 'select'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_leaves', 'insert'))
  );

-- hr_employees
DROP POLICY IF EXISTS "admins can manage hr_employees" ON public.hr_employees;
CREATE POLICY "hr_employees_all" ON public.hr_employees
  FOR ALL TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_employees', 'select'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_employees', 'insert'))
  );

-- hr_employee_documents (uses employee_id -> hr_employees.organization_id)
DROP POLICY IF EXISTS "admins can manage hr_employee_documents" ON public.hr_employee_documents;
CREATE POLICY "hr_employee_documents_all" ON public.hr_employee_documents
  FOR ALL TO authenticated
  USING (
    (SELECT private.is_god())
    OR employee_id IN (
      SELECT he.id FROM hr_employees he
      WHERE (SELECT private.has_role_permission(he.organization_id, 'hr_employee_documents', 'select'))
    )
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR employee_id IN (
      SELECT he.id FROM hr_employees he
      WHERE (SELECT private.has_role_permission(he.organization_id, 'hr_employee_documents', 'insert'))
    )
  );

-- hr_bonus_agreements
DROP POLICY IF EXISTS "admins can manage hr_bonus_agreements" ON public.hr_bonus_agreements;
CREATE POLICY "hr_bonus_agreements_all" ON public.hr_bonus_agreements
  FOR ALL TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_bonus_agreements', 'select'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_bonus_agreements', 'insert'))
  );

-- hr_bonus_payments
DROP POLICY IF EXISTS "admins can manage hr_bonus_payments" ON public.hr_bonus_payments;
CREATE POLICY "hr_bonus_payments_all" ON public.hr_bonus_payments
  FOR ALL TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_bonus_payments', 'select'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_bonus_payments', 'insert'))
  );

-- hr_attendance
DROP POLICY IF EXISTS "admins can manage hr_attendance" ON public.hr_attendance;
CREATE POLICY "hr_attendance_all" ON public.hr_attendance
  FOR ALL TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_attendance', 'select'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_attendance', 'insert'))
  );

-- hr_salary_payments
DROP POLICY IF EXISTS "admins can manage hr_salary_payments" ON public.hr_salary_payments;
CREATE POLICY "hr_salary_payments_all" ON public.hr_salary_payments
  FOR ALL TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_salary_payments', 'select'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_salary_payments', 'insert'))
  );

-- hr_mt_config
DROP POLICY IF EXISTS "admins can manage hr_mt_config" ON public.hr_mt_config;
CREATE POLICY "hr_mt_config_all" ON public.hr_mt_config
  FOR ALL TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_mt_config', 'select'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_mt_config', 'insert'))
  );

-- hr_re_config
DROP POLICY IF EXISTS "admins can manage hr_re_config" ON public.hr_re_config;
CREATE POLICY "hr_re_config_all" ON public.hr_re_config
  FOR ALL TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_re_config', 'select'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_re_config', 'insert'))
  );
