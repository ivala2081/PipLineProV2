import { z } from 'zod'

export const DESCRIPTION_PRESETS = [
  'maas_avans',
  'prim_avans',
  'sigortali_maas_avans',
  'diger',
] as const

export type DescriptionPreset = (typeof DESCRIPTION_PRESETS)[number]

export const entryFormSchema = z.object({
  description_preset: z
    .enum(['maas_avans', 'prim_avans', 'sigortali_maas_avans', 'diger'])
    .default('diger'),
  description: z.string().min(1, 'Description is required').trim(),
  entry_type: z.enum(['ODEME', 'TRANSFER']),
  direction: z.enum(['in', 'out']),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().min(1),
  cost_period: z.string().optional(),
  entry_date: z.string().min(1, 'Date is required'),
  payment_period: z.string().optional(),
  register: z.string().min(1),
  register_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  payee: z.string().nullable().optional(),
  exchange_rate_used: z.coerce.number().nullable().optional(),
  exchange_rate_override: z.boolean().optional(),
  hr_employee_id: z.string().nullable().optional(),
  advance_type: z.enum(['salary', 'bonus', 'insured_salary']).nullable().optional(),
})

export type EntryFormValues = z.infer<typeof entryFormSchema>

export const walletFormSchema = z.object({
  label: z.string().min(1, 'Label is required').trim(),
  address: z.string().min(1, 'Address is required').trim(),
  chain: z.enum(['tron', 'ethereum', 'bsc', 'bitcoin', 'solana']),
})

export type WalletFormValues = z.infer<typeof walletFormSchema>
