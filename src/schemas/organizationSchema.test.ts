import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
} from './organizationSchema'

describe('createOrganizationSchema', () => {
  it('accepts valid name and slug', () => {
    const result = createOrganizationSchema.safeParse({ name: 'My Org', slug: 'my-org' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createOrganizationSchema.safeParse({ name: '', slug: 'my-org' })
    expect(result.success).toBe(false)
  })

  it('rejects empty slug', () => {
    const result = createOrganizationSchema.safeParse({ name: 'My Org', slug: '' })
    expect(result.success).toBe(false)
  })

  it('rejects slug with uppercase letters', () => {
    const result = createOrganizationSchema.safeParse({ name: 'My Org', slug: 'MyOrg' })
    expect(result.success).toBe(false)
  })

  it('rejects slug with spaces', () => {
    const result = createOrganizationSchema.safeParse({ name: 'My Org', slug: 'my org' })
    expect(result.success).toBe(false)
  })

  it('accepts slug with hyphens and numbers', () => {
    const result = createOrganizationSchema.safeParse({ name: 'Org 123', slug: 'org-123' })
    expect(result.success).toBe(true)
  })

  it('trims name whitespace', () => {
    const result = createOrganizationSchema.safeParse({ name: '  My Org  ', slug: 'my-org' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('My Org')
  })
})

describe('updateOrganizationSchema', () => {
  it('accepts valid update', () => {
    const result = updateOrganizationSchema.safeParse({ name: 'Updated', is_active: true })
    expect(result.success).toBe(true)
  })

  it('accepts nullable logo_url', () => {
    const result = updateOrganizationSchema.safeParse({
      name: 'Org',
      is_active: true,
      logo_url: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = updateOrganizationSchema.safeParse({ name: '', is_active: true })
    expect(result.success).toBe(false)
  })
})

describe('inviteMemberSchema', () => {
  it('accepts valid invitation', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'user@example.com',
      password: 'StrongP@ss1',
      role: 'admin',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'notanemail',
      password: 'StrongP@ss1',
      role: 'admin',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short password (< 8 chars)', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'user@example.com',
      password: '1234567',
      role: 'admin',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid roles', () => {
    for (const role of ['admin', 'manager', 'operation'] as const) {
      const result = inviteMemberSchema.safeParse({
        email: 'user@example.com',
        password: 'StrongP@ss1',
        role,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid role', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'user@example.com',
      password: 'StrongP@ss1',
      role: 'superadmin',
    })
    expect(result.success).toBe(false)
  })
})
