import { z } from 'zod'

export const transferFormSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').trim(),
  payment_method_id: z.string().min(1, 'Payment method is required'),
  psp_id: z.string().min(1, 'PSP is required'),
  transfer_date: z.string().min(1, 'Date is required'),
  category_id: z.string().min(1, 'Category is required'),
  raw_amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.enum(['TL', 'USD']),
  type_id: z.string().min(1, 'Type is required'),
  exchange_rate: z.coerce.number().positive().default(1),
  crm_id: z.string().optional(),
  meta_id: z.string().optional(),
  employee_id: z.string().optional(),
  is_first_deposit: z.boolean().optional().default(false),
})

export type TransferFormValues = z.infer<typeof transferFormSchema>
