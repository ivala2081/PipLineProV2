import { z } from 'zod'

export const settlementFormSchema = z.object({
  settlement_date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.enum(['TL', 'USD']),
  notes: z.string().optional(),
})

export type SettlementFormValues = z.infer<typeof settlementFormSchema>
