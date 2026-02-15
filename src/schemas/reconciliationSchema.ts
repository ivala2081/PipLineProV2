import { z } from 'zod'

export const teyitEntrySchema = z.object({
  label: z.string().min(1, 'Label is required'),
  amount: z.coerce.number(),
  currency: z.enum(['USD', 'TL']),
})

export const reconciliationConfigSchema = z.object({
  devir_usdt: z.coerce.number().nullable().optional(),
  devir_nakit_tl: z.coerce.number().nullable().optional(),
  devir_nakit_usd: z.coerce.number().nullable().optional(),
  kur: z.coerce.number().positive().nullable().optional(),
  bekl_tahs: z.coerce.number().nullable().optional(),
  teyit_entries: z.array(teyitEntrySchema),
})

export type ReconciliationConfigFormValues = z.infer<typeof reconciliationConfigSchema>
