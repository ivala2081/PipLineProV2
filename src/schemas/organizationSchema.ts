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
})

export type UpdateOrganizationValues = z.infer<typeof updateOrganizationSchema>

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email').min(1, 'Email is required').trim(),
  role: z.enum(['admin', 'operation']),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long'),
  displayName: z.string().trim().optional(),
})

export type InviteMemberValues = z.infer<typeof inviteMemberSchema>
