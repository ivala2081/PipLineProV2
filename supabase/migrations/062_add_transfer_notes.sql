-- 062_add_transfer_notes.sql
-- Add optional notes column to transfers table

ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS notes TEXT;
