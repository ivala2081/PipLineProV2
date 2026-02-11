import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users,
  ShieldCheck,
  User,
  CalendarBlank,
  Clock,
  Hash,
  Fingerprint,
} from '@phosphor-icons/react'
import {
  Card,
  Tag,
  Separator,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@ds'
import { useLocale } from '@ds/hooks'
import {
  useOrgMembersQuery,
  type MemberWithProfile,
} from '@/hooks/queries/useOrgMembersQuery'
import type { Organization } from '@/lib/database.types'

interface OverviewTabProps {
  org: Organization
  orgId: string
}

/* ------------------------------------------------------------------ */
/*  Metric Card                                                        */
/* ------------------------------------------------------------------ */

function MetricCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: number
}) {
  return (
    <Card className="flex items-center gap-4 border border-black/10 bg-bg1 p-5">
      <div
        className={`flex size-10 items-center justify-center rounded-lg ${iconBg}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-black/40">
          {label}
        </p>
        <p className="mt-0.5 text-2xl font-semibold">{value}</p>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Detail Row                                                         */
/* ------------------------------------------------------------------ */

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 text-black/40">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-sm font-medium">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Member Row                                                         */
/* ------------------------------------------------------------------ */

function MemberRow({
  member,
  formatDate,
}: {
  member: MemberWithProfile
  formatDate: (d: string) => string
}) {
  const { t } = useTranslation('pages')
  const name = member.profile?.display_name ?? member.user_id
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar className="size-8">
        {member.profile?.avatar_url && (
          <AvatarImage src={member.profile.avatar_url} />
        )}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
      </div>
      <Tag variant={member.role === 'admin' ? 'green' : 'blue'}>
        {t(`organizations.members.roles.${member.role}`)}
      </Tag>
      <span className="hidden text-xs text-black/40 sm:block">
        {formatDate(member.created_at)}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Overview Tab                                                       */
/* ------------------------------------------------------------------ */

export function OverviewTab({ org, orgId }: OverviewTabProps) {
  const { t } = useTranslation('pages')
  const { locale } = useLocale()
  const { data: members = [] } = useOrgMembersQuery(orgId)

  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US'

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(localeTag, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const { admins, operations } = useMemo(() => {
    let adminCount = 0
    let opCount = 0
    for (const m of members) {
      if (m.role === 'admin') adminCount++
      else opCount++
    }
    return { admins: adminCount, operations: opCount }
  }, [members])

  const previewMembers = members.slice(0, 5)

  return (
    <div className="space-y-4 pt-4">
      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          icon={<Users size={20} className="text-blue" />}
          iconBg="bg-blue/10"
          label={t('organizations.overview.members')}
          value={members.length}
        />
        <MetricCard
          icon={<ShieldCheck size={20} className="text-green" />}
          iconBg="bg-green/10"
          label={t('organizations.overview.admins')}
          value={admins}
        />
        <MetricCard
          icon={<User size={20} className="text-indigo" />}
          iconBg="bg-indigo/10"
          label={t('organizations.overview.operations')}
          value={operations}
        />
      </div>

      {/* Team Members Preview */}
      {previewMembers.length > 0 && (
        <Card className="border border-black/10 bg-bg1 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {t('organizations.overview.teamPreview')}
            </h3>
            <span className="text-xs text-black/40">
              {t('organizations.members.count', { count: members.length })}
            </span>
          </div>
          <Separator className="mt-3" />
          <div className="divide-y divide-black/10">
            {previewMembers.map((member) => (
              <MemberRow
                key={member.user_id}
                member={member}
                formatDate={formatDate}
              />
            ))}
          </div>
          {members.length > 5 && (
            <p className="pt-2 text-center text-xs text-black/40">
              {t('organizations.overview.moreMembers', {
                count: members.length - 5,
              })}
            </p>
          )}
        </Card>
      )}

      {/* Organization Details */}
      <Card className="border border-black/10 bg-bg1 p-5">
        <h3 className="text-sm font-semibold">
          {t('organizations.overview.details')}
        </h3>
        <Separator className="mt-3" />
        <div className="divide-y divide-black/10">
          <DetailRow
            icon={<Fingerprint size={16} />}
            label={t('organizations.overview.orgId')}
          >
            <span className="font-mono text-xs text-black/60">{org.id}</span>
          </DetailRow>
          <DetailRow
            icon={<Hash size={16} />}
            label={t('organizations.overview.slug')}
          >
            <span className="font-mono">{org.slug}</span>
          </DetailRow>
          <DetailRow
            icon={
              <div
                className={`size-2 rounded-full ${org.is_active ? 'bg-green' : 'bg-red'}`}
              />
            }
            label={t('organizations.overview.status')}
          >
            <Tag variant={org.is_active ? 'green' : 'red'}>
              {org.is_active
                ? t('organizations.active')
                : t('organizations.inactive')}
            </Tag>
          </DetailRow>
          <DetailRow
            icon={<CalendarBlank size={16} />}
            label={t('organizations.overview.createdAt')}
          >
            {formatDate(org.created_at)}
          </DetailRow>
          <DetailRow
            icon={<Clock size={16} />}
            label={t('organizations.overview.updatedAt')}
          >
            {formatDate(org.updated_at)}
          </DetailRow>
        </div>
      </Card>
    </div>
  )
}
