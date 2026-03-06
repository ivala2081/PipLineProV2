import { canManageOrg, canManageMembers, isAdminOrAbove, getAssignableRoles } from './roles'

describe('canManageOrg', () => {
  it('admin can manage org', () => {
    expect(canManageOrg('admin')).toBe(true)
  })

  it('manager can manage org', () => {
    expect(canManageOrg('manager')).toBe(true)
  })

  it('operation cannot manage org', () => {
    expect(canManageOrg('operation')).toBe(false)
  })

  it('ik cannot manage org', () => {
    expect(canManageOrg('ik')).toBe(false)
  })

  it('null role cannot manage org', () => {
    expect(canManageOrg(null)).toBe(false)
  })

  it('undefined role cannot manage org', () => {
    expect(canManageOrg(undefined)).toBe(false)
  })
})

describe('canManageMembers', () => {
  it('admin can manage members', () => {
    expect(canManageMembers('admin')).toBe(true)
  })

  it('manager can manage members', () => {
    expect(canManageMembers('manager')).toBe(true)
  })

  it('operation cannot manage members', () => {
    expect(canManageMembers('operation')).toBe(false)
  })

  it('god overrides any role', () => {
    expect(canManageMembers('operation', true)).toBe(true)
  })

  it('god overrides null role', () => {
    expect(canManageMembers(null, true)).toBe(true)
  })
})

describe('isAdminOrAbove', () => {
  it('admin is admin or above', () => {
    expect(isAdminOrAbove('admin')).toBe(true)
  })

  it('manager is not admin or above', () => {
    expect(isAdminOrAbove('manager')).toBe(false)
  })

  it('operation is not admin or above', () => {
    expect(isAdminOrAbove('operation')).toBe(false)
  })

  it('god overrides any role', () => {
    expect(isAdminOrAbove('operation', true)).toBe(true)
  })

  it('null role without god is not admin or above', () => {
    expect(isAdminOrAbove(null, false)).toBe(false)
  })
})

describe('getAssignableRoles', () => {
  it('admin can assign all 4 roles', () => {
    expect(getAssignableRoles('admin')).toEqual(['admin', 'manager', 'operation', 'ik'])
  })

  it('god can assign all 4 roles regardless of role', () => {
    expect(getAssignableRoles('operation', true)).toEqual(['admin', 'manager', 'operation', 'ik'])
  })

  it('manager can assign manager, operation and ik', () => {
    expect(getAssignableRoles('manager')).toEqual(['manager', 'operation', 'ik'])
  })

  it('ik cannot assign any roles', () => {
    expect(getAssignableRoles('ik')).toEqual([])
  })

  it('operation cannot assign any roles', () => {
    expect(getAssignableRoles('operation')).toEqual([])
  })

  it('null role cannot assign any roles', () => {
    expect(getAssignableRoles(null)).toEqual([])
  })

  it('undefined role cannot assign any roles', () => {
    expect(getAssignableRoles(undefined)).toEqual([])
  })
})
