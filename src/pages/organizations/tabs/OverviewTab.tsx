import { useTranslation } from 'react-i18next'
import { Card, Tag } from '@ds'
import { useOrgMembersQuery } from '@/hooks/queries/useOrgMembersQuery'
import type { Organization } from '@/lib/database.types'

interface OverviewTabProps {
  org: Organization
  orgId: string
}

export function OverviewTab({ org, orgId }: OverviewTabProps) {
  const { t } = useTranslation('pages')
  const { data: members = [] } = useOrgMembersQuery(orgId)

  return (
    <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="border border-black/5 bg-bg1 p-5">
        <p className="text-xs font-medium uppercase text-black/60">
          {t('organizations.overview.name')}
        </p>
        <p className="mt-1 text-lg font-semibold">{org.name}</p>
      </Card>

      <Card className="border border-black/5 bg-bg1 p-5">
        <p className="text-xs font-medium uppercase text-black/60">
          {t('organizations.overview.slug')}
        </p>
        <p className="mt-1 font-mono text-lg font-semibold">{org.slug}</p>
      </Card>

      <Card className="border border-black/5 bg-bg1 p-5">
        <p className="text-xs font-medium uppercase text-black/60">
          {t('organizations.overview.status')}
        </p>
        <Tag variant={org.is_active ? 'green' : 'red'} className="mt-2">
          {org.is_active
            ? t('organizations.active')
            : t('organizations.inactive')}
        </Tag>
      </Card>

      <Card className="border border-black/5 bg-bg1 p-5">
        <p className="text-xs font-medium uppercase text-black/60">
          {t('organizations.overview.members')}
        </p>
        <p className="mt-1 text-lg font-semibold">{members.length}</p>
      </Card>

      <Card className="border border-black/5 bg-bg1 p-5">
        <p className="text-xs font-medium uppercase text-black/60">
          {t('organizations.overview.createdAt')}
        </p>
        <p className="mt-1 text-sm">
          {new Date(org.created_at).toLocaleDateString()}
        </p>
      </Card>
    </div>
  )
}
