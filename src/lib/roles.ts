import type { OrgMemberRole } from '@/lib/database.types'

/** Returns true if the role has org management privileges (admin or manager). */
export function canManageOrg(role?: OrgMemberRole | string | null): boolean {
  return role === 'admin' || role === 'manager'
}
