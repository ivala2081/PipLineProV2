import { useTranslation } from 'react-i18next'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Skeleton,
} from '@ds'
import type { OrganizationWithCount } from '@/hooks/queries/useOrganizationsQuery'

interface OrganizationsTableProps {
  organizations: OrganizationWithCount[]
  isLoading: boolean
  error: Error | null
  onRowClick: (org: OrganizationWithCount) => void
}

export function OrganizationsTable({
  organizations,
  isLoading,
  error,
  onRowClick,
}: OrganizationsTableProps) {
  const { t } = useTranslation('pages')

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <p className="text-sm font-medium text-red-500">
          {t('organizations.toast.error')}
        </p>
        <p className="text-xs text-black/40">{error.message}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <p className="text-sm font-medium text-black/60">
          {t('organizations.empty.title')}
        </p>
        <p className="text-xs text-black/40">
          {t('organizations.empty.description')}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-black/5 bg-bg1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('organizations.columns.name')}</TableHead>
            <TableHead>{t('organizations.columns.slug')}</TableHead>
            <TableHead className="text-center">
              {t('organizations.columns.members')}
            </TableHead>
            <TableHead>{t('organizations.columns.status')}</TableHead>
            <TableHead>{t('organizations.columns.createdAt')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org) => (
            <TableRow
              key={org.id}
              className="cursor-pointer hover:bg-black/[0.02]"
              onClick={() => onRowClick(org)}
            >
              <TableCell className="font-medium">{org.name}</TableCell>
              <TableCell className="font-mono text-sm text-black/60">
                {org.slug}
              </TableCell>
              <TableCell className="text-center">{org.member_count}</TableCell>
              <TableCell>
                <Tag variant={org.is_active ? 'green' : 'red'}>
                  {org.is_active
                    ? t('organizations.active')
                    : t('organizations.inactive')}
                </Tag>
              </TableCell>
              <TableCell className="text-sm text-black/60">
                {new Date(org.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
