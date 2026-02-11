import { useTranslation } from 'react-i18next'
import {
  Buildings,
  Users,
  CaretRight,
  WarningCircle,
  ChartLineUp,
  Diamond,
} from '@phosphor-icons/react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Skeleton,
  Card,
  Button,
} from '@ds'
import { useLocale } from '@ds/hooks'
import type { OrganizationWithCount } from '@/hooks/queries/useOrganizationsQuery'

interface OrganizationsTableProps {
  organizations: OrganizationWithCount[]
  isLoading: boolean
  error: Error | null
  onRowClick: (org: OrganizationWithCount) => void
  onRetry?: () => void
}

const ORG_ICONS: Record<string, { icon: React.ReactNode }> = {
  orderinvest: {
    icon: <ChartLineUp size={20} weight="bold" className="text-black/60" />,
  },
  vestaprime: {
    icon: <Diamond size={20} weight="bold" className="text-black/60" />,
  },
}

function OrgAvatar({ name, slug }: { name: string; slug: string }) {
  const custom = ORG_ICONS[slug.toLowerCase()]

  if (custom) {
    return (
      <div className="flex size-9 items-center justify-center rounded-lg bg-black/5">
        {custom.icon}
      </div>
    )
  }

  const initial = name.charAt(0).toUpperCase()
  return (
    <div className="flex size-9 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white">
      {initial}
    </div>
  )
}

export function OrganizationsTable({
  organizations,
  isLoading,
  error,
  onRowClick,
  onRetry,
}: OrganizationsTableProps) {
  const { t } = useTranslation('pages')
  const { locale } = useLocale()

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 border border-black/5 bg-bg1 py-20">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-red/10">
          <WarningCircle size={28} className="text-red" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-black/80">
            {t('organizations.toast.error')}
          </p>
          <p className="mt-1 text-xs text-black/40">{error.message}</p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t('organizations.errorRetry')}
          </Button>
        )}
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-black/5 bg-bg1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>{t('organizations.columns.name')}</TableHead>
              <TableHead>{t('organizations.columns.slug')}</TableHead>
              <TableHead className="text-center">{t('organizations.columns.members')}</TableHead>
              <TableHead>{t('organizations.columns.status')}</TableHead>
              <TableHead>{t('organizations.columns.createdAt')}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="size-9 rounded-lg" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-center"><Skeleton className="mx-auto h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="size-4" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 border border-black/5 bg-bg1 py-20">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-black/5">
          <Buildings size={28} className="text-black/40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-black/60">
            {t('organizations.empty.title')}
          </p>
          <p className="mt-1 text-xs text-black/40">
            {t('organizations.empty.description')}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="rounded-lg border border-black/5 bg-bg1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12" />
            <TableHead>{t('organizations.columns.name')}</TableHead>
            <TableHead>{t('organizations.columns.slug')}</TableHead>
            <TableHead className="text-center">
              {t('organizations.columns.members')}
            </TableHead>
            <TableHead>{t('organizations.columns.status')}</TableHead>
            <TableHead>{t('organizations.columns.createdAt')}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org) => (
            <TableRow
              key={org.id}
              className="group cursor-pointer transition-colors hover:bg-black/4"
              onClick={() => onRowClick(org)}
            >
              <TableCell>
                <OrgAvatar name={org.name} slug={org.slug} />
              </TableCell>
              <TableCell className="font-medium">{org.name}</TableCell>
              <TableCell className="font-mono text-sm text-black/60">
                {org.slug}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1.5 text-black/60">
                  <Users size={14} />
                  <span>{org.member_count}</span>
                </div>
              </TableCell>
              <TableCell>
                <Tag variant={org.is_active ? 'green' : 'red'}>
                  {org.is_active
                    ? t('organizations.active')
                    : t('organizations.inactive')}
                </Tag>
              </TableCell>
              <TableCell className="text-sm text-black/60">
                {formatDate(org.created_at)}
              </TableCell>
              <TableCell>
                <CaretRight
                  size={16}
                  className="text-black/20 transition-colors group-hover:text-black/60"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
