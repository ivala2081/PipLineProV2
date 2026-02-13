-- ============================================================================
-- 025: Make transfers.psp_id nullable and optionally wipe PSP data
-- ============================================================================
-- Run this to remove all PSP references and delete PSPs (e.g. for a fresh start).

-- 1. Allow NULL on transfers.psp_id (drop NOT NULL)
alter table public.transfers
  alter column psp_id drop not null;

-- 2. Drop the foreign key so we can delete psps without touching transfers
alter table public.transfers
  drop constraint if exists transfers_psp_id_fkey;

-- 3. Clear all PSP references on existing transfers
update public.transfers set psp_id = null where psp_id is not null;

-- 4. Delete all PSPs (psp_commission_rates will cascade from psps)
delete from public.psps;

-- 5. Re-add FK as optional (nullable, ON DELETE SET NULL for future PSP deletes)
alter table public.transfers
  add constraint transfers_psp_id_fkey
  foreign key (psp_id) references public.psps (id) on delete set null;
