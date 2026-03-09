-- Add barem_roles setting: which department roles have the barem (threshold) toggle
-- Default empty = no departments use barem
alter table hr_settings add column if not exists barem_roles jsonb not null default '[]'::jsonb;
