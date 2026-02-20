import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, MagnifyingGlass } from '@phosphor-icons/react'
import {
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  PageHeader,
} from '@ds'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { canManageOrg } from '@/lib/roles'
import { useOrganizationsQuery } from '@/hooks/queries/useOrganizationsQuery'
import { OrganizationsTable } from './OrganizationsTable'
import { CreateOrganizationDialog } from './CreateOrganizationDialog'

type StatusFilter = 'all' | 'active' | 'inactive'

export function OrganizationsListPage() {
  const { t } = useTranslation('pages')
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const canManage = isGod || canManageOrg(membership?.role)
  const navigate = useNavigate()

  const { data: organizations = [], isLoading, error, refetch } = useOrganizationsQuery()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    let result = organizations

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (org) => org.name.toLowerCase().includes(q) || org.slug.toLowerCase().includes(q),
      )
    }

    if (statusFilter === 'active') {
      result = result.filter((org) => org.is_active)
    } else if (statusFilter === 'inactive') {
      result = result.filter((org) => !org.is_active)
    }

    return result
  }, [organizations, search, statusFilter])

  return (
    <div className="space-y-lg">
      {/* Header */}
      <PageHeader
        title={t('organizations.title')}
        subtitle={t('organizations.subtitle')}
        actions={
          canManage ? (
            <Button variant="filled" onClick={() => setCreateDialogOpen(true)}>
              <Plus size={16} weight="bold" />
              {t('organizations.create')}
            </Button>
          ) : undefined
        }
      />

      {/* Search + Filter Bar (minimal) */}
      <div className="flex flex-wrap items-center gap-sm">
        <div className="relative w-56">
          <MagnifyingGlass
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/35"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('organizations.searchPlaceholder')}
            inputSize="sm"
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger selectSize="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('organizations.filterAll')}</SelectItem>
            <SelectItem value="active">{t('organizations.filterActive')}</SelectItem>
            <SelectItem value="inactive">{t('organizations.filterInactive')}</SelectItem>
          </SelectContent>
        </Select>
        {!isLoading && organizations.length > 0 && (
          <span className="text-xs text-black/40">
            {t('organizations.orgCount', { count: filtered.length })}
          </span>
        )}
      </div>

      {/* Table */}
      <OrganizationsTable
        organizations={filtered}
        isLoading={isLoading}
        error={error}
        onRowClick={(org) => navigate(`/organizations/${org.id}`)}
        onRetry={() => refetch()}
      />

      {canManage && (
        <CreateOrganizationDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
        />
      )}
    </div>
  )
}
