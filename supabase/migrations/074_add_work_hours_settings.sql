-- Add standard work hours and timezone to hr_settings
ALTER TABLE hr_settings ADD COLUMN IF NOT EXISTS standard_check_in text DEFAULT '10:00' NOT NULL;
ALTER TABLE hr_settings ADD COLUMN IF NOT EXISTS standard_check_out text DEFAULT '18:30' NOT NULL;
ALTER TABLE hr_settings ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Istanbul' NOT NULL;
