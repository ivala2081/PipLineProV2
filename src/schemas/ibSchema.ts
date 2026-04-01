import { z } from 'zod'

export const AGREEMENT_TYPES = ['salary', 'cpa', 'lot_rebate', 'revenue_share', 'hybrid'] as const
export type AgreementType = (typeof AGREEMENT_TYPES)[number]

export const IB_STATUSES = ['active', 'paused', 'terminated'] as const
export const REFERRAL_STATUSES = ['registered', 'ftd', 'active', 'churned'] as const
export const COMMISSION_STATUSES = ['draft', 'confirmed', 'paid'] as const

export const ibPartnerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional().or(z.literal('')),
  referral_code: z
    .string()
    .min(3, 'Referral code must be at least 3 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Only letters, numbers, hyphens, and underscores'),
  agreement_type: z.enum(AGREEMENT_TYPES),
  agreement_details: z.record(z.unknown()).default({}),
  status: z.enum(IB_STATUSES).default('active'),
  notes: z.string().optional().or(z.literal('')),
})

export type IBPartnerFormValues = z.infer<typeof ibPartnerSchema>

export const ibReferralSchema = z.object({
  ib_partner_id: z.string().uuid('Select a partner'),
  client_name: z.string().min(2, 'Client name must be at least 2 characters').trim(),
  ftd_date: z.string().optional().or(z.literal('')),
  ftd_amount: z.coerce.number().min(0).optional(),
  is_ftd: z.boolean().default(false),
  lots_traded: z.coerce.number().min(0, 'Lots must be non-negative').default(0),
  status: z.enum(REFERRAL_STATUSES).default('registered'),
  notes: z.string().optional().or(z.literal('')),
})

export type IBReferralFormValues = z.infer<typeof ibReferralSchema>

export const ibCommissionOverrideSchema = z.object({
  override_amount: z.coerce.number().positive('Amount must be positive'),
  override_reason: z.string().min(1, 'Reason is required').trim(),
})

export type IBCommissionOverrideValues = z.infer<typeof ibCommissionOverrideSchema>

export const ibPaymentSchema = z.object({
  ib_partner_id: z.string().uuid('Select a partner'),
  ib_commission_id: z.string().uuid().optional().or(z.literal('')),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  register: z.enum(['USDT', 'NAKIT_TL', 'NAKIT_USD', 'TRX']),
  payment_method: z.string().optional().or(z.literal('')),
  reference: z.string().optional().or(z.literal('')),
  payment_date: z.string().min(1, 'Date is required'),
  description: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
})

export type IBPaymentFormValues = z.infer<typeof ibPaymentSchema>

export const ibCalculateSchema = z.object({
  ib_partner_id: z.string().uuid('Select a partner'),
  period_start: z.string().min(1, 'Start date is required'),
  period_end: z.string().min(1, 'End date is required'),
})

export type IBCalculateFormValues = z.infer<typeof ibCalculateSchema>
