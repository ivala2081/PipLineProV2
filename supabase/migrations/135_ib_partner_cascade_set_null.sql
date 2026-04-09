-- 135: Change ib_partner_id FK to SET NULL on delete
-- so that deleting an IB partner does not fail when transfers reference it
ALTER TABLE public.transfers
  DROP CONSTRAINT transfers_ib_partner_id_fkey,
  ADD CONSTRAINT transfers_ib_partner_id_fkey
    FOREIGN KEY (ib_partner_id) REFERENCES public.ib_partners(id)
    ON DELETE SET NULL;
