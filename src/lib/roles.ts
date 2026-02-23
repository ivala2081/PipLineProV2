import type { OrgMemberRole } from '@/lib/database.types'

/** Returns true if the role has org management privileges (admin or manager). */
export function canManageOrg(role?: OrgMemberRole | string | null): boolean {
  return role === 'admin' || role === 'manager'
}

/** Returns true if the user can manage members (add/remove/change roles). */
export function canManageMembers(role?: OrgMemberRole | string | null, isGod = false): boolean {
  return isGod || role === 'admin' || role === 'manager'
}

/** Returns true if the user is admin or god (highest non-system privilege). */
export function isAdminOrAbove(role?: OrgMemberRole | string | null, isGod = false): boolean {
  return isGod || role === 'admin'
}

/** Returns the set of roles a user with the given role can assign to others. */
export function getAssignableRoles(
  role?: OrgMemberRole | string | null,
  isGod = false,
): OrgMemberRole[] {
  if (isGod || role === 'admin') return ['admin', 'manager', 'operation']
  if (role === 'manager') return ['manager', 'operation']
  return []
}
