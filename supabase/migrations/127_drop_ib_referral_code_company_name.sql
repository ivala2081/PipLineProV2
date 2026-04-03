-- Drop referral_code and company_name from ib_partners

-- Remove unique index on referral_code first
DROP INDEX IF EXISTS idx_ib_partners_org_code;

-- Drop columns
ALTER TABLE ib_partners
  DROP COLUMN IF EXISTS referral_code,
  DROP COLUMN IF EXISTS company_name;
