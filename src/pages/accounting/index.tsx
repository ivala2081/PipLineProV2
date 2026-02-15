import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, UploadSimple } from '@phosphor-icons/react'
import { useAccountingQuery } from '@/hooks/queries/useAccountingQuery'
import { useWalletsQuery } from '@/hooks/queries/useWalletsQuery'
import type { AccountingEntry } from '@/lib/database.types'
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@ds'
import { LedgerTable } from './LedgerTable'
import { WalletsTab } from './WalletsTab'
import { EntryDialog } from './EntryDialog'
import { DeleteEntryDialog } from './DeleteEntryDialog'
import { WalletDialog } from './WalletDialog'
import { LedgerImportDialog } from './LedgerImportDialog'
import { ReconciliationTab } from './ReconciliationTab'

/* ── Main Page ────────────────────────────────────────── */

export function AccountingPage() {
  const { t } = useTranslation('pages')
  const accounting = useAccountingQuery()
  const wallets = useWalletsQuery()

  const [activeTab, setActiveTab] = useState('ledger')
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<AccountingEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AccountingEntry | null>(null)
  const [walletDialogOpen, setWalletDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const handleAddEntry = () => {
    setEditingEntry(null)
    setEntryDialogOpen(true)
  }

  const handleEditEntry = (entry: AccountingEntry) => {
    setEditingEntry(entry)
    setEntryDialogOpen(true)
  }

  const handleDeleteEntry = (entry: AccountingEntry) => {
    setDeleteTarget(entry)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('accounting.title')}</h1>
          <p className="mt-1 text-sm text-black/60">{t('accounting.subtitle')}</p>
        </div>
        {activeTab === 'ledger' && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <UploadSimple size={16} weight="bold" />
              {t('accounting.import.button', 'Import CSV')}
            </Button>
            <Button variant="filled" onClick={handleAddEntry}>
              <Plus size={16} weight="bold" />
              {t('accounting.addEntry')}
            </Button>
          </div>
        )}
        {activeTab === 'wallets' && (
          <Button variant="filled" onClick={() => setWalletDialogOpen(true)}>
            <Plus size={16} weight="bold" />
            {t('accounting.addWallet')}
          </Button>
        )}
      </div>

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
