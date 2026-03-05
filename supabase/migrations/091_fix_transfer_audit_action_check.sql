-- ============================================================================
-- 091: Fix transfer_audit_log action check constraint
-- Migration 086 added 'deleted' and 'restored' to the audit trigger but
-- never updated the CHECK constraint (which still only allowed 'created'|'updated').
-- This causes a constraint violation when soft-deleting a transfer.
-- ============================================================================

ALTER TABLE public.transfer_audit_log
  DROP CONSTRAINT IF EXISTS transfer_audit_log_action_check;

ALTER TABLE public.transfer_audit_log
  ADD CONSTRAINT transfer_audit_log_action_check
  CHECK (action IN ('created', 'updated', 'deleted', 'restored'));
