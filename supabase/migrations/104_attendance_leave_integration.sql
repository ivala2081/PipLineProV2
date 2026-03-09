-- Link attendance records to leave records
ALTER TABLE hr_attendance
  ADD COLUMN leave_id UUID REFERENCES hr_leaves(id) ON DELETE SET NULL;
