import { z } from 'zod'

export const AGREEMENT_TYPES = ['salary', 'cpa', 'lot_rebate', 'revenue_share', 'hybrid'] as const
export type AgreementType = (typeof AGREEMENT_TYPES)[number]

export const IB_STATUSES = ['active', 'paused', 'terminated'] as const
export const REFERRAL_STATUSES = ['registered', 'ftd', 'active', 'churned'] as const
export const COMMISSION_STATUSES = ['draft', 'confirmed', 'paid'] as const

/* ── Per-type agreement detail schemas ──────────────────────────── */

export const salaryDetailsSchema = z.object({
  amount: z.coerce.number().min(0, 'Amount must be non-negative'),
  currency: z.enum(['USD', 'TRY', 'EUR']).default('USD'),
  period: z.enum(['weekly', 'monthly']).default('monthly'),
})

export const cpaDetailsSchema = z.object({
  cpa_amount: z.coerce.number().min(0, 'CPA amount must be non-negative'),
  currency: z.enum(['USD', 'TRY', 'EUR']).default('USD'),
  min_ftd_amount: z.coerce.number().min(0, 'Min FTD must be non-negative').optional(),
})

export const lotRebateDetailsSchema = z.object({
  rebate_per_lot: z.coerce.number().min(0, 'Rebate must be non-negative'),
  currency: z.enum(['USD', 'TRY', 'EUR']).default('USD'),
})

export const revenueShareDetailsSchema = z.object({
  revshare_pct: z.coerce
    .number()
    .min(0, 'Percentage must be non-negative')
    .max(100, 'Percentage must be 0-100'),
  source: z.enum(['spread', 'commission', 'net_revenue']).default('spread'),
})

const hybridComponentSchema = z
  .object({ type: z.enum(['salary', 'cpa', 'lot_rebate', 'revenue_share']) })
  .passthrough()

export const hybridDetailsSchema = z
  .object({
    components: z.array(hybridComponentSchema).min(1, 'At least one component required'),
  })
  .passthrough()

const detailSchemaMap = {
  salary: salaryDetailsSchema,
  cpa: cpaDetailsSchema,
  lot_rebate: lotRebateDetailsSchema,
  revenue_share: revenueShareDetailsSchema,
  hybrid: hybridDetailsSchema,
} as const

/** Validate agreement_details against the correct schema for the given type. */
export function validateAgreementDetails(
  agreementType: AgreementType,
  details: Record<string, unknown>,
):
  | { success: true; data: Record<string, unknown> }
  | { success: false; errors: Record<string, string> } {
  const schema = detailSchemaMap[agreementType]
  const result = schema.safeParse(details)

  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown> }
  }

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_root'
    if (!errors[key]) errors[key] = issue.message
  }
  return { success: false, errors }
}

/* ── Partner form schema (base fields — details validated separately) ── */

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
