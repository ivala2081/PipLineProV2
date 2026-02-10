import { z } from 'zod'

export const transferFormSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').trim(),
  payment_method_id: z.string().min(1, 'Payment method is required'),
  transfer_date: z.string().min(1, 'Date is required'),
  category_id: z.string().min(1, 'Category is required'),
  raw_amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.enum(['TL', 'USD']),
  psp_id: z.string().min(1, 'PSP is required'),
  type_id: z.string().min(1, 'Type is required'),
  crm_id: z.string().optional(),
  meta_id: z.string().optional(),
})

export type TransferFormValues = z.infer<typeof transferFormSchema>
