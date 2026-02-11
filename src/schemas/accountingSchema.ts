import { z } from 'zod'

export const entryFormSchema = z.object({
  description: z.string().min(1, 'Description is required').trim(),
  entry_type: z.enum(['ODEME', 'TRANSFER']),
  direction: z.enum(['in', 'out']),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.enum(['TL', 'USD', 'USDT']),
  cost_period: z.string().optional(),
  entry_date: z.string().min(1, 'Date is required'),
  payment_period: z.string().optional(),
  register: z.enum(['USDT', 'NAKIT_TL', 'NAKIT_USD']),
})

export type EntryFormValues = z.infer<typeof entryFormSchema>

export const walletFormSchema = z.object({
  label: z.string().min(1, 'Label is required').trim(),
  address: z.string().min(1, 'Address is required').trim(),
  chain: z.enum(['tron', 'ethereum', 'bsc', 'bitcoin', 'solana']),
})

export type WalletFormValues = z.infer<typeof walletFormSchema>
