import { useTranslation } from 'react-i18next'
import { Buildings, Users, WarningCircle } from '@phosphor-icons/react'
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
      <Card
        padding="none"
        className="flex flex-col items-center justify-center gap-md border border-black/5 bg-bg1 py-20"
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-red/10">
          <WarningCircle size={28} className="text-red" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-black/80">{t('organizations.toast.error')}</p>
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
              <TableHead>{t('organizations.columns.name')}</TableHead>
              <TableHead>{t('organizations.columns.slug')}</TableHead>
              <TableHead className="text-center">{t('organizations.columns.members')}</TableHead>
              <TableHead>{t('organizations.columns.status')}</TableHead>
              <TableHead>{t('organizations.columns.createdAt')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="mx-auto h-4 w-8" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-md" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <Card
        padding="none"
        className="flex flex-col items-center justify-center gap-md border border-black/5 bg-bg1 py-20"
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-black/5">
          <Buildings size={28} className="text-black/40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-black/60">{t('organizations.empty.title')}</p>
          <p className="mt-1 text-xs text-black/40">{t('organizations.empty.description')}</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="rounded-lg border border-black/5 bg-bg1">
      <Table cardOnMobile>
        <TableHeader>
          <TableRow>
            <TableHead>{t('organizations.columns.name')}</TableHead>
            <TableHead>{t('organizations.columns.slug')}</TableHead>
            <TableHead className="text-center">{t('organizations.columns.members')}</TableHead>
            <TableHead>{t('organizations.columns.status')}</TableHead>
            <TableHead>{t('organizations.columns.createdAt')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org) => (
            <TableRow
              key={org.id}
              className="cursor-pointer transition-colors hover:bg-black/4"
              onClick={() => onRowClick(org)}
            >
              <TableCell data-label={t('organizations.columns.name')}>
                <div className="flex items-center gap-sm">
                  {org.logo_url ? (
                    <div className="flex size-8 items-center justify-center overflow-hidden rounded-md border border-black/10 bg-black/5">
                      <img
                        src={org.logo_url}
                        alt={`${org.name} logo`}
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-md bg-brand text-xs font-bold text-white">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium">{org.name}</span>
                </div>
              </TableCell>
              <TableCell
                className="font-mono text-sm text-black/60"
                data-label={t('organizations.columns.slug')}
              >
                {org.slug}
              </TableCell>
              <TableCell data-label={t('organizations.columns.members')}>
                <div className="flex items-center justify-center gap-1.5 text-black/60">
                  <Users size={14} />
                  <span>{org.member_count}</span>
                </div>
              </TableCell>
              <TableCell data-label={t('organizations.columns.status')}>
                <Tag variant={org.is_active ? 'green' : 'red'}>
                  {org.is_active ? t('organizations.active') : t('organizations.inactive')}
                </Tag>
              </TableCell>
              <TableCell
                className="text-sm text-black/60"
                data-label={t('organizations.columns.createdAt')}
              >
                {formatDate(org.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
