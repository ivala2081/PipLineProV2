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
} from '@ds'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganizationsQuery } from '@/hooks/queries/useOrganizationsQuery'
import { OrganizationsTable } from './OrganizationsTable'
import { CreateOrganizationDialog } from './CreateOrganizationDialog'

type StatusFilter = 'all' | 'active' | 'inactive'

export function OrganizationsListPage() {
  const { t } = useTranslation('pages')
  const { isGod } = useAuth()
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
        (org) =>
          org.name.toLowerCase().includes(q) ||
          org.slug.toLowerCase().includes(q),
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('organizations.title')}</h1>
          <p className="mt-1 text-sm text-black/60">
            {t('organizations.subtitle')}
          </p>
        </div>
        {isGod && (
          <Button
            variant="filled"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus size={16} weight="bold" />
            {t('organizations.create')}
          </Button>
        )}
      </div>

      {/* Search + Filter Bar (minimal) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-56">
          <MagnifyingGlass
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/35"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('organizations.searchPlaceholder')}
            className="h-8 !rounded-lg !px-2.5 !pl-8 !py-1.5 !text-sm placeholder:!text-black/40"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="h-8 w-28 !rounded-lg !px-2.5 !py-1.5 !text-sm">
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

      {isGod && (
        <CreateOrganizationDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
        />
      )}
    </div>
  )
}
