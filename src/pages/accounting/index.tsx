import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  UploadSimple,
  DownloadSimple,
  CaretDown,
  FileXls,
  FileCsv,
} from '@phosphor-icons/react'
import { localYMD } from '@/lib/date'
import { useAccountingQuery } from '@/hooks/queries/useAccountingQuery'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { queryKeys } from '@/lib/queryKeys'
import { useWalletsQuery } from '@/hooks/queries/useWalletsQuery'
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
import { WalletsTab } from './WalletsTab'
import { EntryDialog } from './EntryDialog'
import { DeleteEntryDialog } from './DeleteEntryDialog'
import { WalletDialog } from './WalletDialog'
import { LedgerImportDialog } from './LedgerImportDialog'
import { ReconciliationTab } from './ReconciliationTab'
import { exportLedgerCsv, downloadCsv } from '@/lib/csvExport/exportLedgerCsv'
import { exportLedgerXlsx } from '@/lib/csvExport/exportLedgerXlsx'

/* ── Main Page ────────────────────────────────────────── */

export function AccountingPage() {
  const { t } = useTranslation('pages')
  const accounting = useAccountingQuery()
  const wallets = useWalletsQuery()

  useRealtimeSubscription('accounting_entries', [queryKeys.accounting.all])

  const [activeTab, setActiveTab] = useState('ledger')
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<AccountingEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AccountingEntry | null>(null)
  const [walletDialogOpen, setWalletDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const navigate = useNavigate()

  const handleAddEntry = () => {
    setEditingEntry(null)
    setEntryDialogOpen(true)
  }

  const handleEditEntry = (entry: AccountingEntry) => {
    // Bulk payment entries → navigate to detail page instead of edit dialog
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

  return (
    <div className="space-y-lg">
      {/* Page header */}
      <PageHeader
        title={t('accounting.title')}
        subtitle={t('accounting.subtitle')}
        actions={
          activeTab === 'ledger' ? (
            <>
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
          ) : activeTab === 'wallets' ? (
            <Button variant="filled" onClick={() => setWalletDialogOpen(true)}>
              <Plus size={16} weight="bold" />
              {t('accounting.addWallet')}
            </Button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ledger">{t('accounting.tabs.ledger')}</TabsTrigger>
          <TabsTrigger value="wallets">{t('accounting.tabs.wallets')}</TabsTrigger>
          <TabsTrigger value="reconciliation">{t('accounting.tabs.reconciliation')}</TabsTrigger>
        </TabsList>
        <TabsContent value="ledger">
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
        </TabsContent>
        <TabsContent value="wallets">
          <WalletsTab wallets={wallets} />
        </TabsContent>
        <TabsContent value="reconciliation">
          <ReconciliationTab />
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

      <WalletDialog
        open={walletDialogOpen}
        onClose={() => setWalletDialogOpen(false)}
        onSubmit={async (data) => {
          await wallets.createWallet(data)
          setWalletDialogOpen(false)
        }}
        isSubmitting={wallets.isCreating}
      />
    </div>
  )
}
