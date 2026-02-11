import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Receipt,
  Wallet,
  CalendarBlank,
} from '@phosphor-icons/react'
import { useAccountingQuery } from '@/hooks/queries/useAccountingQuery'
import { useWalletsQuery } from '@/hooks/queries/useWalletsQuery'
import type { AccountingEntry } from '@/lib/database.types'
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, Skeleton } from '@ds'
import { LedgerSummary } from './LedgerSummary'
import { LedgerTab } from './LedgerTab'
import { WalletsTab } from './WalletsTab'
import { EntryDialog } from './EntryDialog'
import { DeleteEntryDialog } from './DeleteEntryDialog'
import { WalletDialog } from './WalletDialog'

/* ── Quick stat chip ──────────────────────────────────── */

function QuickStat({
  icon: Icon,
  label,
  value,
  isLoading,
}: {
  icon: typeof Receipt
  label: string
  value: string
  isLoading: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-black/[0.06] bg-bg1 px-4 py-3">
      <div className="flex size-8 items-center justify-center rounded-lg bg-black/[0.04]">
        <Icon size={16} className="text-black/40" />
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-black/40">
          {label}
        </p>
        {isLoading ? (
          <Skeleton className="mt-1 h-5 w-12 rounded" />
        ) : (
          <p className="text-sm font-semibold tabular-nums text-black/80">
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

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

  // Derive last entry date
  const lastEntryDate = accounting.entries[0]?.entry_date
  const lastDateLabel = lastEntryDate
    ? new Date(lastEntryDate + 'T00:00:00').toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
      })
    : '—'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('accounting.title')}</h1>
          <p className="mt-1 text-sm text-black/60">{t('accounting.subtitle')}</p>
        </div>
        {activeTab === 'ledger' ? (
          <Button variant="filled" onClick={handleAddEntry}>
            <Plus size={16} weight="bold" />
            {t('accounting.addEntry')}
          </Button>
        ) : (
          <Button variant="filled" onClick={() => setWalletDialogOpen(true)}>
            <Plus size={16} weight="bold" />
            {t('accounting.addWallet')}
          </Button>
        )}
      </div>

      {/* Dashboard overview: summary cards */}
      <LedgerSummary
        summary={accounting.summary}
        isLoading={accounting.isSummaryLoading}
      />

      {/* Quick stats row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QuickStat
          icon={Receipt}
          label={t('accounting.stats.totalEntries')}
          value={String(accounting.total)}
          isLoading={accounting.isLoading}
        />
        <QuickStat
          icon={Wallet}
          label={t('accounting.stats.activeWallets')}
          value={String(wallets.wallets.length)}
          isLoading={wallets.isLoading}
        />
        <QuickStat
          icon={CalendarBlank}
          label={t('accounting.stats.lastEntry')}
          value={lastDateLabel}
          isLoading={accounting.isLoading}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ledger">
            {t('accounting.tabs.ledger')}
          </TabsTrigger>
          <TabsTrigger value="wallets">
            {t('accounting.tabs.wallets')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ledger">
          <LedgerTab
            entries={accounting.entries}
            isLoading={accounting.isLoading}
            page={accounting.page}
            pageSize={accounting.pageSize}
            total={accounting.total}
            onPageChange={accounting.setPage}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
          />
        </TabsContent>
        <TabsContent value="wallets">
          <WalletsTab wallets={wallets} />
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
