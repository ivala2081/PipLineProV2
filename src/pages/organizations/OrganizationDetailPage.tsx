import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from '@phosphor-icons/react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Tag,
  Skeleton,
} from '@ds'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganizationDetailQuery } from '@/hooks/queries/useOrganizationDetailQuery'
import { useOrgMembersQuery } from '@/hooks/queries/useOrgMembersQuery'
import { OverviewTab } from './tabs/OverviewTab'
import { MembersTab } from './tabs/MembersTab'
import { SettingsTab } from './tabs/SettingsTab'

export function OrganizationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('pages')
  const { isGod, user } = useAuth()

  const { data: org, isLoading } = useOrganizationDetailQuery(orgId ?? '')
  const { data: members = [] } = useOrgMembersQuery(orgId ?? '')

  // Determine if current user can manage this org
  const currentUserMember = members.find((m) => m.user_id === user?.id)
  const canManage = isGod || currentUserMember?.role === 'admin'

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-sm text-black/60">Organization not found</p>
        <Button variant="outline" onClick={() => navigate('/organizations')}>
          <ArrowLeft size={16} />
          {t('organizations.backToList')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="gray"
        size="sm"
        onClick={() => navigate('/organizations')}
      >
        <ArrowLeft size={16} />
        {t('organizations.backToList')}
      </Button>

      {/* Org header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{org.name}</h1>
          <p className="mt-1 font-mono text-sm text-black/60">{org.slug}</p>
        </div>
        <Tag variant={org.is_active ? 'green' : 'red'}>
          {org.is_active
            ? t('organizations.active')
            : t('organizations.inactive')}
        </Tag>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            {t('organizations.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="members">
            {t('organizations.tabs.members')}
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="settings">
              {t('organizations.tabs.settings')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab org={org} orgId={orgId!} />
        </TabsContent>
        <TabsContent value="members">
          <MembersTab orgId={orgId!} canManage={canManage} />
        </TabsContent>
        {canManage && (
          <TabsContent value="settings">
            <SettingsTab org={org} orgId={orgId!} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
