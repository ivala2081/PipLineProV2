-- Per-day exemption flag on attendance records
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS deduction_exempt boolean DEFAULT false NOT NULL;

-- Global toggle switches for deduction types on hr_settings
ALTER TABLE hr_settings ADD COLUMN IF NOT EXISTS daily_deduction_enabled boolean DEFAULT true NOT NULL;
ALTER TABLE hr_settings ADD COLUMN IF NOT EXISTS hourly_deduction_enabled boolean DEFAULT true NOT NULL;
