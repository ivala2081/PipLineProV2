-- hr_attendance.absent_hours was `smallint` with CHECK (1..23), but the UI
-- stores fractional hours (e.g. `calculateLateHours` returns 8.83 for being
-- 8h50m late). Any manual check_in edit that produced a non-integer lateness
-- hit:  "invalid input syntax for type smallint: '8.83'"
--
-- Switch to numeric(4,2) so decimals are preserved for payroll deduction,
-- and relax the constraint to allow any positive value up to 23.

ALTER TABLE hr_attendance DROP CONSTRAINT IF EXISTS chk_absent_hours;

ALTER TABLE hr_attendance
  ALTER COLUMN absent_hours TYPE numeric(4,2) USING absent_hours::numeric;

ALTER TABLE hr_attendance
  ADD CONSTRAINT chk_absent_hours
    CHECK (absent_hours IS NULL OR (absent_hours > 0 AND absent_hours <= 23));
