import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import type { ReactNode } from 'react'

interface RoleRouteProps {
  allowedRoles: string[]
  children: ReactNode
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { isGod } = useAuth()
  const { isLoading, membership } = useOrganization()

  if (isLoading) return null

  if (isGod) return <>{children}</>

  const userRole = membership?.role
  if (userRole && allowedRoles.includes(userRole)) {
    return <>{children}</>
  }

  return <Navigate to="/" replace />
}
