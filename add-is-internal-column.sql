-- Add missing is_internal column to psps table
ALTER TABLE public.psps
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;
