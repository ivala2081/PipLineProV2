-- Add security_pin column to organizations
-- Used to protect daily exchange-rate overrides in the transfers page
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS security_pin TEXT;
