-- 124: Add ib_partner_id to transfers
ALTER TABLE public.transfers
  ADD COLUMN ib_partner_id UUID REFERENCES public.ib_partners(id);

CREATE INDEX idx_transfers_ib_partner ON public.transfers(ib_partner_id);
