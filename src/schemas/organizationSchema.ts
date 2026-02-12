import { z } from 'zod'

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .trim(),
})

export type CreateOrganizationValues = z.infer<typeof createOrganizationSchema>

export const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  is_active: z.boolean(),
  logo_url: z.string().nullable().optional(),
})

export type UpdateOrganizationValues = z.infer<typeof updateOrganizationSchema>

export const addMemberSchema = z.object({
  email: z.string().email('Invalid email').min(1, 'Email is required').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'operation']),
  display_name: z.string().optional(),
})

export type AddMemberValues = z.infer<typeof addMemberSchema>
