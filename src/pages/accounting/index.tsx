import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  UploadSimple,
  DownloadSimple,
  CaretDown,
  FileXls,
  FileCsv,
  ArrowsLeftRight,
} from '@phosphor-icons/react'
import { localYMD } from '@/lib/date'
import { useAccountingQuery } from '@/hooks/queries/useAccountingQuery'
import { SectionErrorBoundary } from '@/components/ErrorBoundary'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { queryKeys } from '@/lib/queryKeys'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import type { AccountingEntry } from '@/lib/database.types'
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  PageHeader,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@ds'
import { LedgerTable } from './LedgerTable'
import { EntryDialog } from './EntryDialog'
import { DeleteEntryDialog } from './DeleteEntryDialog'
import { LedgerImportDialog } from './LedgerImportDialog'
import { ReconciliationTab } from './ReconciliationTab'
import { AccountingSummary } from './AccountingSummary'
import { CategoryBreakdown } from './CategoryBreakdown'
import { PortfolioVerification } from './PortfolioVerification'
import { RegisterSettingsTab } from './RegisterSettingsTab'
import { CategorySettingsTab } from './CategorySettingsTab'
import { ConversionDialog } from './ConversionDialog'
import { exportLedgerCsv, downloadCsv } from '@/lib/csvExport/exportLedgerCsv'
import { exportLedgerXlsx } from '@/lib/csvExport/exportLedgerXlsx'

/* ── Main Page ────────────────────────────────────────── */

export function AccountingPage() {
  const { t } = useTranslation('pages')
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const isAdmin = isGod || membership?.role === 'admin'
  const accounting = useAccountingQuery()

  useRealtimeSubscription('accounting_entries', [queryKeys.accounting.all])

  const [activeTab, setActiveTab] = useState('overview')
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<AccountingEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AccountingEntry | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const navigate = useNavigate()

  // Period state shared between overview components
  const now = new Date()
  const [overviewPeriod] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  )

  const handleAddEntry = () => {
    setEditingEntry(null)
    setEntryDialogOpen(true)
  }

  const handleEditEntry = (entry: AccountingEntry) => {
    if (entry.hr_bulk_payment_id) {
      navigate(`/accounting/bulk/${entry.hr_bulk_payment_id}`)
      return
    }
    setEditingEntry(entry)
    setEntryDialogOpen(true)
  }

  const handleDeleteEntry = (entry: AccountingEntry) => {
    setDeleteTarget(entry)
  }

  const handleExportCsv = async () => {
    setIsExporting(true)
    try {
      const entries = await accounting.fetchAllEntries()
      const csv = exportLedgerCsv(entries)
      const timestamp = localYMD(new Date())
      const filename = `ledger-export-${timestamp}.csv`
      downloadCsv(csv, filename)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportXlsx = async () => {
    setIsExporting(true)
    try {
      const entries = await accounting.fetchAllEntries()
      const timestamp = localYMD(new Date())
      const filename = `ledger-export-${timestamp}`
      exportLedgerXlsx(entries, filename)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  // Listen for global Ctrl+E shortcut
  useEffect(() => {
    const handler = () => void handleExportXlsx()
    window.addEventListener('shortcut:export', handler)
    return () => window.removeEventListener('shortcut:export', handler)
  })

  /* ── Tab-specific actions ─────────────────────────────── */
  const ledgerActions = (
    <>
      <Button variant="ghost" size="sm" onClick={() => setConversionDialogOpen(true)}>
        <ArrowsLeftRight size={16} weight="bold" />
        {t('accounting.conversion.button', 'Conversion')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" disabled={isExporting}>
            <DownloadSimple size={16} weight="bold" />
            {isExporting
              ? t('accounting.export.exporting', 'Exporting...')
              : t('accounting.export.button', 'Export')}
            <CaretDown size={12} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCsv}>
            <FileCsv size={16} className="mr-2" />
            {t('accounting.export.csv', 'Export CSV')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportXlsx}>
            <FileXls size={16} className="mr-2" />
            {t('accounting.export.xlsx', 'Export Excel')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
        <UploadSimple size={16} weight="bold" />
        {t('accounting.import.button', 'Import CSV')}
      </Button>
      <Button variant="filled" onClick={handleAddEntry}>
        <Plus size={16} weight="bold" />
        {t('accounting.addEntry')}
      </Button>
    </>
  )

  return (
    <div className="space-y-lg">
      {/* Page header */}
      <PageHeader
        title={t('accounting.title')}
        subtitle={t('accounting.subtitle')}
        actions={activeTab === 'ledger' ? ledgerActions : undefined}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{t('accounting.tabs.overview', 'Overview')}</TabsTrigger>
          <TabsTrigger value="ledger">{t('accounting.tabs.ledger')}</TabsTrigger>
          <TabsTrigger value="reconciliation">{t('accounting.tabs.reconciliation')}</TabsTrigger>
          <TabsTrigger value="settings">{t('accounting.tabs.settings', 'Settings')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <SectionErrorBoundary sectionName="Accounting Overview">
            <div className="space-y-lg">
              <AccountingSummary />
              <div className="grid gap-lg lg:grid-cols-2">
                <CategoryBreakdown period={overviewPeriod} />
                <PortfolioVerification period={overviewPeriod} />
              </div>
            </div>
          </SectionErrorBoundary>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger">
          <SectionErrorBoundary sectionName="Accounting Ledger">
            <LedgerTable
              entries={accounting.entries}
              isLoading={accounting.isLoading}
              page={accounting.page}
              pageSize={accounting.pageSize}
              total={accounting.total}
              onPageChange={accounting.setPage}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
              fetchEntriesByDate={accounting.fetchEntriesByDate}
              filters={accounting.filters}
              onFilterChange={accounting.setFilter}
              onClearFilters={accounting.clearFilters}
              hasActiveFilters={accounting.hasActiveFilters}
            />
          </SectionErrorBoundary>
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation">
          <SectionErrorBoundary sectionName="Reconciliation">
            <ReconciliationTab />
          </SectionErrorBoundary>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <SectionErrorBoundary sectionName="Accounting Settings">
            {isAdmin ? (
              <div className="space-y-xl">
                <RegisterSettingsTab />
                <div className="border-t border-black/10" />
                <CategorySettingsTab />
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-black/50">
                  {t(
                    'accounting.settings.adminOnly',
                    'Only administrators can manage accounting settings.',
                  )}
                </p>
              </div>
            )}
          </SectionErrorBoundary>
        </TabsContent>
      </Tabs>

      <EntryDialog
        open={entryDialogOpen}
        onClose={() => {
          setEntryDialogOpen(false)
          setEditingEntry(null)
        }}
        entry={editingEntry}
        onSubmit={async (data) => {
          if (editingEntry) {
            await accounting.updateEntry(editingEntry.id, data)
          } else {
            await accounting.createEntry(data)
          }
          setEntryDialogOpen(false)
          setEditingEntry(null)
        }}
        isSubmitting={accounting.isCreating || accounting.isUpdating}
      />

      <DeleteEntryDialog
        entry={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await accounting.deleteEntry(deleteTarget.id)
            setDeleteTarget(null)
          }
        }}
      />

      <LedgerImportDialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} />

      <ConversionDialog
        open={conversionDialogOpen}
        onClose={() => setConversionDialogOpen(false)}
      />
    </div>
  )
}
