import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { Wrench, SpinnerGap } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

interface RoleRouteProps {
  allowedRoles: string[]
  children: ReactNode
  /** When true, only god admins can access – others see a maintenance screen */
  godOnly?: boolean
}

export function RoleRoute({ allowedRoles, children, godOnly }: RoleRouteProps) {
  const { isGod } = useAuth()
  const { isLoading, membership } = useOrganization()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <SpinnerGap className="h-8 w-8 animate-spin text-muted" />
      </div>
    )
  }

  if (isGod) return <>{children}</>

  if (godOnly) return <MaintenanceScreen />

  const userRole = membership?.role
  if (userRole && allowedRoles.includes(userRole)) {
    return <>{children}</>
  }

  return <Navigate to="/" replace />
}

function MaintenanceScreen() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <Wrench className="h-8 w-8 text-amber-600 dark:text-amber-400" weight="duotone" />
      </div>
      <h2 className="text-xl font-semibold text-primary">{t('maintenanceTitle')}</h2>
      <p className="max-w-md text-sm text-muted">{t('maintenanceDescription')}</p>
    </div>
  )
}
