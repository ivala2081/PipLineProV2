-- Add exit_date column to hr_employees for tracking when an employee left
ALTER TABLE hr_employees ADD COLUMN exit_date DATE DEFAULT NULL;
