import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Buildings, ChartLineUp, Diamond, Image } from '@phosphor-icons/react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Tag,
  Card,
  Skeleton,
} from '@ds'
import { useLocale } from '@ds/hooks'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganizationDetailQuery } from '@/hooks/queries/useOrganizationDetailQuery'
import { useOrgMembersQuery } from '@/hooks/queries/useOrgMembersQuery'
import { OverviewTab } from './tabs/OverviewTab'
import { MembersTab } from './tabs/MembersTab'
import { SettingsTab } from './tabs/SettingsTab'

const ORG_ICONS: Record<string, { icon: React.ReactNode }> = {
  orderinvest: {
    icon: <ChartLineUp size={28} weight="bold" className="text-black/60" />,
  },
  vestaprime: {
    icon: <Diamond size={28} weight="bold" className="text-black/60" />,
  },
}

function OrgDetailAvatar({ name, slug, logoUrl }: { name: string; slug: string; logoUrl?: string | null }) {
  // Priority: logoUrl > custom icon > fallback to initials
  if (logoUrl) {
    return (
      <div className="flex size-14 items-center justify-center overflow-hidden rounded-xl border-2 border-black/10 bg-black/5">
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="size-full object-cover"
        />
      </div>
    )
  }

  const custom = ORG_ICONS[slug.toLowerCase()]

  if (custom) {
    return (
      <div className="flex size-14 items-center justify-center rounded-xl bg-black/5">
        {custom.icon}
      </div>
    )
  }

  return (
    <div className="flex size-14 items-center justify-center rounded-xl bg-brand text-xl font-bold text-white">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export function OrganizationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('pages')
  const { isGod, user } = useAuth()
  const { locale } = useLocale()

  const { data: org, isLoading } = useOrganizationDetailQuery(orgId ?? '')
  const { data: members = [] } = useOrgMembersQuery(orgId ?? '')

  const currentUserMember = members.find((m) => m.user_id === user?.id)
  const canManage = isGod || currentUserMember?.role === 'admin'

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const currentRole = isGod
    ? 'God'
    : currentUserMember?.role === 'admin'
      ? t('organizations.members.roles.admin')
      : currentUserMember?.role === 'operation'
        ? t('organizations.members.roles.operation')
        : null

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card padding="spacious" className="border border-black/5 bg-bg1">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </Card>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-black/5">
          <Buildings size={28} className="text-black/40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-black/60">
            {t('organizations.notFound')}
          </p>
          <p className="mt-1 text-xs text-black/40">
            {t('organizations.notFoundDescription')}
          </p>
        </div>
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

      {/* Org header card */}
      <Card padding="spacious" className="border border-black/5 bg-bg1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <OrgDetailAvatar name={org.name} slug={org.slug} logoUrl={org.logo_url} />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{org.name}</h1>
                <Tag variant={org.is_active ? 'green' : 'red'}>
                  {org.is_active
                    ? t('organizations.active')
                    : t('organizations.inactive')}
                </Tag>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <span className="font-mono text-sm text-black/60">{org.slug}</span>
                <span className="text-black/20">·</span>
                <span className="text-sm text-black/40">{formatDate(org.created_at)}</span>
                {currentRole && (
                  <>
                    <span className="text-black/20">·</span>
                    <Tag variant="blue">{currentRole}</Tag>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

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
