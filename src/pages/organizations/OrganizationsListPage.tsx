import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus } from '@phosphor-icons/react'
import { Button } from '@ds'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganizationsQuery } from '@/hooks/queries/useOrganizationsQuery'
import { OrganizationsTable } from './OrganizationsTable'
import { CreateOrganizationDialog } from './CreateOrganizationDialog'

export function OrganizationsListPage() {
  const { t } = useTranslation('pages')
  const { isGod } = useAuth()
  const navigate = useNavigate()

  const { data: organizations = [], isLoading, error } = useOrganizationsQuery()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
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

      <OrganizationsTable
        organizations={organizations}
        isLoading={isLoading}
        error={error}
        onRowClick={(org) => navigate(`/organizations/${org.id}`)}
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
