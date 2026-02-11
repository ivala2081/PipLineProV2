import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ArrowsLeftRight,
  Table,
  ClipboardText,
  Users,
  Buildings,
  ArrowRight,
  TrendUp,
} from '@phosphor-icons/react'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { Card, Tag } from '@ds'
import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-3 border border-black/5 bg-bg1 p-5">
      <span className="text-xs font-medium text-black/40 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold text-black">{value}</span>
        <Tag variant="green" className="text-[10px]">
          <TrendUp size={12} />
          —
        </Tag>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Quick Action                                                       */
/* ------------------------------------------------------------------ */

function QuickAction({
  icon: Icon,
  label,
  description,
  href,
}: {
  icon: ComponentType<IconProps>
  label: string
  description: string
  href: string
}) {
  return (
    <Link
      to={href}
      className="ui-surface group flex items-center gap-4 rounded-xl border border-black/10 bg-bg2/70 p-4 hover:bg-bg5"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black/10 text-black/80 transition-colors group-hover:bg-brand/15 group-hover:text-brand">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-black">{label}</p>
        <p className="truncate text-xs text-black/60">{description}</p>
      </div>
      <ArrowRight
        size={16}
        className="shrink-0 text-black/40 transition-colors group-hover:text-black/80"
      />
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page                                                     */
/* ------------------------------------------------------------------ */

export function DashboardPage() {
  const { t } = useTranslation('pages')
  const { profile, isGod } = useAuth()
  const { currentOrg, organizations, membership } = useOrganization()

  const displayName = profile?.display_name || t('dashboard.defaultUser')

  const roleBadge = isGod
    ? { label: 'God', variant: 'red' as const }
    : membership?.role === 'admin'
      ? { label: 'Admin', variant: 'green' as const }
      : membership?.role === 'operation'
        ? { label: 'Operation', variant: 'blue' as const }
        : null

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Welcome section */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black">
            {t('dashboard.welcome', { name: displayName })}
          </h1>
          <p className="mt-1 text-sm text-black/60">
            {currentOrg
              ? t('dashboard.orgContext', { org: currentOrg.name })
              : t('dashboard.subtitle')}
          </p>
        </div>
        {roleBadge && (
          <Tag variant={roleBadge.variant} className="w-fit text-xs">
            {roleBadge.label}
          </Tag>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('dashboard.stats.totalRecords')} value="—" />
        <StatCard label={t('dashboard.stats.thisWeek')} value="—" />
        <StatCard label={t('dashboard.stats.members')} value="—" />
        <StatCard
          label={t('dashboard.stats.organizations')}
          value={String(organizations.length)}
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-black/60 uppercase tracking-wider">
          {t('dashboard.quickActions')}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            icon={ArrowsLeftRight}
            label={t('nav.transfers')}
            description={t('dashboard.actions.transfers')}
            href="/transfers"
          />
          <QuickAction
            icon={Table}
            label={t('nav.module2')}
            description={t('dashboard.actions.module2')}
            href="/module-2"
          />
          <QuickAction
            icon={ClipboardText}
            label={t('nav.module3')}
            description={t('dashboard.actions.module3')}
            href="/module-3"
          />
          <QuickAction
            icon={Users}
            label={t('nav.members')}
            description={t('dashboard.actions.members')}
            href="/members"
          />
          <QuickAction
            icon={Buildings}
            label={t('nav.organizations')}
            description={t('dashboard.actions.organizations')}
            href="/organizations"
          />
        </div>
      </div>
    </div>
  )
}
