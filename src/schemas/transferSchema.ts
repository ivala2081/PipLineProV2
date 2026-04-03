import { z } from 'zod'

export const transferFormSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').trim(),
  payment_method_id: z.string().min(1, 'Payment method is required'),
  psp_id: z.string().min(1, 'PSP is required'),
  transfer_date: z.string().min(1, 'Date is required'),
  category_id: z.string().min(1, 'Category is required'),
  raw_amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  type_id: z.string().min(1, 'Type is required'),
  exchange_rate: z.coerce
    .number()
    .positive()
    .max(100000, 'Exchange rate seems too high')
    .default(1),
  crm_id: z.string().optional(),
  meta_id: z.string().optional(),
  employee_id: z.string().optional(),
  ib_partner_id: z.string().min(1, 'IB Partner is required'),
  is_first_deposit: z.boolean().nullable().default(null),
  notes: z.string().optional(),
})

export type TransferFormValues = z.infer<typeof transferFormSchema>
