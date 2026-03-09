-- ============================================================
-- 103: HR Bulk Payments System
-- Toplu maaş/prim/banka yatırımı işlemlerini tek bir kayıt altında
-- gruplar. accounting_entries'de TEK satır, detaylar hr_bulk_payment_items'da.
-- ============================================================

-- 0. Temizlik (güvenli — yoksa hata vermez)
-- Önce accounting_entries FK sütununu kaldır (tablo bağımlılığını kırar)
ALTER TABLE accounting_entries DROP COLUMN IF EXISTS hr_bulk_payment_id;

-- Indexler (IF EXISTS ile güvenli)
DROP INDEX IF EXISTS idx_accounting_entries_bulk_id;
DROP INDEX IF EXISTS idx_hr_bulk_payment_items_employee;
DROP INDEX IF EXISTS idx_hr_bulk_payment_items_bulk_id;
DROP INDEX IF EXISTS idx_hr_bulk_payments_org;

-- Tabloları sil (CASCADE trigger'ları da siler)
DROP TABLE IF EXISTS hr_bulk_payment_items CASCADE;
DROP TABLE IF EXISTS hr_bulk_payments CASCADE;

-- ============================================================
-- 1. Toplu ödeme ana tablosu
-- ============================================================
CREATE TABLE hr_bulk_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  batch_type      TEXT NOT NULL CHECK (batch_type IN ('salary', 'bonus', 'bank_deposit')),
  period          TEXT NOT NULL,                    -- "Mart 2026" gibi
  total_amount    NUMERIC NOT NULL DEFAULT 0,       -- Tüm kalemlerin toplamı
  currency        TEXT NOT NULL DEFAULT 'TL',       -- TL / USD / USDT
  item_count      INT NOT NULL DEFAULT 0,           -- Kalem sayısı
  paid_at         DATE NOT NULL,                    -- Ödeme tarihi
  notes           TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Kalem tablosu (çalışan başına detay)
-- ============================================================
CREATE TABLE hr_bulk_payment_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_payment_id        UUID NOT NULL REFERENCES hr_bulk_payments(id) ON DELETE CASCADE,
  employee_id            UUID NOT NULL REFERENCES hr_employees(id),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount                 NUMERIC NOT NULL,           -- Net ödeme tutarı
  currency               TEXT NOT NULL,              -- TL / USD / USDT
  description            TEXT NOT NULL,              -- Açıklama (çalışan adı + dönem)
  -- Maaş spesifik alanlar
  salary_currency        TEXT,
  supplement_amount      NUMERIC,                    -- Sigorta elden ödeme
  supplement_currency    TEXT,
  bank_deposit_amount    NUMERIC,                    -- Banka yatırım tutarı (sigortalı)
  attendance_deduction   NUMERIC,                    -- Devamsızlık kesintisi
  unpaid_leave_deduction NUMERIC,                    -- Ücretsiz izin kesintisi
  -- Prim spesifik alanlar
  agreement_id           UUID,                       -- Bağlı bonus anlaşması
  bonus_payment_id       UUID,                       -- Oluşturulan hr_bonus_payments.id
  -- Maaş spesifik
  salary_payment_id      UUID,                       -- Oluşturulan hr_salary_payments.id
  -- Avans tipi (banka yatırımı için)
  advance_type           TEXT,                       -- 'insured_salary'
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. accounting_entries → hr_bulk_payments FK
-- ============================================================
ALTER TABLE accounting_entries
  ADD COLUMN hr_bulk_payment_id UUID REFERENCES hr_bulk_payments(id) ON DELETE SET NULL;

-- ============================================================
-- 4. Indexler
-- ============================================================
CREATE INDEX idx_hr_bulk_payments_org ON hr_bulk_payments(organization_id);
CREATE INDEX idx_hr_bulk_payment_items_bulk_id ON hr_bulk_payment_items(bulk_payment_id);
CREATE INDEX idx_hr_bulk_payment_items_employee ON hr_bulk_payment_items(employee_id);
CREATE INDEX idx_accounting_entries_bulk_id ON accounting_entries(hr_bulk_payment_id);

-- ============================================================
-- 5. RLS: hr_bulk_payments (private.is_god / has_role_permission pattern)
-- ============================================================
ALTER TABLE hr_bulk_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_bulk_payments_all" ON public.hr_bulk_payments
  FOR ALL TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_bulk_payments', 'select'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_bulk_payments', 'insert'))
  );

-- ============================================================
-- 6. RLS: hr_bulk_payment_items
-- ============================================================
ALTER TABLE hr_bulk_payment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_bulk_payment_items_all" ON public.hr_bulk_payment_items
  FOR ALL TO authenticated
  USING (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_bulk_payment_items', 'select'))
  )
  WITH CHECK (
    (SELECT private.is_god())
    OR (SELECT private.has_role_permission(organization_id, 'hr_bulk_payment_items', 'insert'))
  );

-- ============================================================
-- 7. updated_at trigger (moddatetime extension yerine manual fonksiyon)
-- ============================================================
CREATE OR REPLACE FUNCTION set_hr_bulk_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON hr_bulk_payments
  FOR EACH ROW
  EXECUTE FUNCTION set_hr_bulk_payments_updated_at();

-- ============================================================
-- 8. default_permission fonksiyonunu güncelle
--    hr_bulk_payments + hr_bulk_payment_items tablolarını ekle
-- ============================================================
CREATE OR REPLACE FUNCTION private.default_permission(
  _role TEXT, _table TEXT, _action TEXT
) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    -- transfers: all org members SELECT/INSERT/UPDATE, admin+manager+ik DELETE
    WHEN _table = 'transfers' AND _action IN ('select','insert','update')
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'transfers' AND _action = 'delete'
      THEN _role IN ('admin','manager','ik')

    -- transfer_audit_log: all org members SELECT only
    WHEN _table = 'transfer_audit_log' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'transfer_audit_log'
      THEN false

    -- psps: all SELECT, admin only INSERT/UPDATE/DELETE
    WHEN _table = 'psps' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'psps'
      THEN _role = 'admin'

    -- psp_commission_rates: all SELECT, admin only INSERT/DELETE
    WHEN _table = 'psp_commission_rates' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'psp_commission_rates'
      THEN _role = 'admin'

    -- psp_settlements: all SELECT, admin only INSERT/UPDATE/DELETE
    WHEN _table = 'psp_settlements' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'psp_settlements'
      THEN _role = 'admin'

    -- accounting_entries: admin+manager+ik all ops
    WHEN _table = 'accounting_entries'
      THEN _role IN ('admin','manager','ik')

    -- accounting_monthly_config: admin+manager+ik all ops
    WHEN _table = 'accounting_monthly_config'
      THEN _role IN ('admin','manager','ik')

    -- hr tables: admin+manager+ik all ops
    WHEN _table IN (
      'hr_employees','hr_employee_documents','hr_bonus_agreements',
      'hr_bonus_payments','hr_attendance','hr_salary_payments',
      'hr_settings','hr_leaves','hr_mt_config','hr_re_config',
      'hr_bulk_payments','hr_bulk_payment_items'
    ) THEN _role IN ('admin','manager','ik')

    -- organizations: all SELECT, admin UPDATE, god-only INSERT/DELETE
    WHEN _table = 'organizations' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'organizations' AND _action = 'update'
      THEN _role = 'admin'
    WHEN _table = 'organizations'
      THEN false

    -- organization_members: all SELECT, admin+manager+ik manage
    WHEN _table = 'organization_members' AND _action = 'select'
      THEN _role IN ('admin','manager','operation','ik')
    WHEN _table = 'organization_members'
      THEN _role IN ('admin','manager','ik')

    -- organization_invitations: admin+manager+ik all ops
    WHEN _table = 'organization_invitations'
      THEN _role IN ('admin','manager','ik')

    ELSE false
  END
$$;

-- get_role_permissions_with_defaults tablosu da güncelle
CREATE OR REPLACE FUNCTION public.get_role_permissions_with_defaults(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _result JSONB := '[]'::jsonb;
  _tables TEXT[] := ARRAY[
    'transfers','transfer_audit_log',
    'psps','psp_commission_rates','psp_settlements',
    'accounting_entries','accounting_monthly_config',
    'hr_employees','hr_employee_documents','hr_bonus_agreements',
    'hr_bonus_payments','hr_attendance','hr_salary_payments',
    'hr_settings','hr_leaves','hr_mt_config','hr_re_config',
    'hr_bulk_payments','hr_bulk_payment_items',
    'organizations','organization_members','organization_invitations'
  ];
  _roles TEXT[] := ARRAY['admin','manager','operation','ik'];
  _r TEXT;
  _t TEXT;
  _row JSONB;
BEGIN
  FOREACH _r IN ARRAY _roles LOOP
    FOREACH _t IN ARRAY _tables LOOP
      SELECT jsonb_build_object(
        'role', _r,
        'table_name', _t,
        'can_select', COALESCE(rp.can_select, private.default_permission(_r, _t, 'select')),
        'can_insert', COALESCE(rp.can_insert, private.default_permission(_r, _t, 'insert')),
        'can_update', COALESCE(rp.can_update, private.default_permission(_r, _t, 'update')),
        'can_delete', COALESCE(rp.can_delete, private.default_permission(_r, _t, 'delete')),
        'is_custom',  rp.id IS NOT NULL
      ) INTO _row
      FROM (SELECT NULL::uuid AS id, NULL::boolean AS can_select, NULL::boolean AS can_insert, NULL::boolean AS can_update, NULL::boolean AS can_delete) AS defaults
      LEFT JOIN role_permissions rp
        ON rp.organization_id = _org_id AND rp.role = _r AND rp.table_name = _t;

      _result := _result || _row;
    END LOOP;
  END LOOP;
  RETURN _result;
END;
$$;
