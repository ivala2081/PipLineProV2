import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, CreditCard, Tag as TagIcon, GitBranch, Trash, Warning } from '@phosphor-icons/react'
import type { useLookupQueries } from '@/hooks/queries/useLookupQueries'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTransfersQuery } from '@/hooks/queries/useTransfersQuery'
import { useToast } from '@/hooks/useToast'
import { BulkDeleteConfirmDialog } from './BulkDeleteConfirmDialog'
import {
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Button,
} from '@ds'

interface LookupSettingsProps {
  lookupData: ReturnType<typeof useLookupQueries>
}

export function LookupSettings({ lookupData }: LookupSettingsProps) {
  const { t } = useTranslation('pages')
  const { isGod } = useAuth()
  const transfers = useTransfersQuery()
  const { toast } = useToast()
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('transfers.settings.title')}</h2>
          <p className="mt-1 text-sm text-black/40">{t('transfers.settings.subtitleReadOnly')}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5 text-xs text-black/40">
          <Lock size={12} weight="bold" />
          {t('transfers.settings.readOnly')}
        </div>
      </div>

      {/* Transfer Types */}
      <Card padding="spacious" className="border border-black/[0.06] bg-bg1">
        <SectionHeader
          icon={<GitBranch size={16} weight="duotone" />}
          title={t('transfers.settings.types')}
          count={lookupData.transferTypes.length}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">{t('transfers.settings.name')}</TableHead>
              <TableHead>{t('transfers.settings.aliases', 'Import Aliases')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lookupData.transferTypes.map((tt) => (
              <TableRow key={tt.id}>
                <TableCell className="font-medium">{tt.name}</TableCell>
                <TableCell>
                  <AliasesList aliases={tt.aliases} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Categories */}
      <Card padding="spacious" className="border border-black/[0.06] bg-bg1">
        <SectionHeader
          icon={<TagIcon size={16} weight="duotone" />}
          title={t('transfers.settings.categories')}
          count={lookupData.categories.length}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">{t('transfers.settings.name')}</TableHead>
              <TableHead className="w-[120px]">{t('transfers.settings.isDeposit')}</TableHead>
              <TableHead>{t('transfers.settings.aliases', 'Import Aliases')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lookupData.categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell>
                  <Tag variant={cat.is_deposit ? 'green' : 'red'}>
                    {cat.is_deposit
                      ? t('transfers.settings.deposit')
                      : t('transfers.settings.withdrawal')}
                  </Tag>
                </TableCell>
                <TableCell>
                  <AliasesList aliases={cat.aliases} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Payment Methods */}
      <Card padding="spacious" className="border border-black/[0.06] bg-bg1">
        <SectionHeader
          icon={<CreditCard size={16} weight="duotone" />}
          title={t('transfers.settings.paymentMethods')}
          count={lookupData.paymentMethods.length}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">{t('transfers.settings.name')}</TableHead>
              <TableHead>{t('transfers.settings.aliases', 'Import Aliases')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lookupData.paymentMethods.map((pm) => (
              <TableRow key={pm.id}>
                <TableCell className="font-medium">{pm.name}</TableCell>
                <TableCell>
                  <AliasesList aliases={pm.aliases} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Danger Zone — Admin only */}
      {isGod && (
        <Card padding="spacious" className="border border-red/20 bg-red/[0.02]">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-red/10 text-red">
              <Warning size={16} weight="duotone" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red">
                {t('transfers.bulkDelete.dangerZone', 'Danger Zone')}
              </h3>
              <p className="text-xs text-black/40">
                {t(
                  'transfers.bulkDelete.dangerDescription',
                  'Destructive actions that cannot be undone.',
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-red/10 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium text-black/80">
                {t('transfers.bulkDelete.deleteAll', 'Delete all transfers')}
              </p>
              <p className="text-xs text-black/40">
                {t(
                  'transfers.bulkDelete.deleteAllDescription',
                  'Permanently remove all {{count}} transfers from the database.',
                  { count: transfers.total },
                )}
              </p>
            </div>
            <Button
              variant="filled"
              size="sm"
              className="gap-1.5 bg-red hover:bg-red/80"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={transfers.total === 0}
            >
              <Trash size={14} />
              {t('transfers.bulkDelete.deleteAllButton', 'Delete All Transfers')}
            </Button>
          </div>
        </Card>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {isGod && (
        <BulkDeleteConfirmDialog
          ids={bulkDeleteOpen ? ['__all__'] : null}
          count={transfers.total}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={async () => {
            const count = transfers.total
            await transfers.bulkDeleteTransfers(['__all__'])
            toast({
              title: t('transfers.toast.bulkDeleted', { count }),
              variant: 'success',
            })
            setBulkDeleteOpen(false)
          }}
          isDeleting={transfers.isBulkDeleting}
        />
      )}
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode
  title: string
  count: number
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="flex size-8 items-center justify-center rounded-lg bg-black/[0.05] text-black/50">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <span className="flex size-5 items-center justify-center rounded-full bg-black/[0.06] text-[10px] font-medium text-black/40">
        {count}
      </span>
    </div>
  )
}

function AliasesList({ aliases }: { aliases: string[] }) {
  const { t } = useTranslation('pages')
  if (!aliases || aliases.length === 0) {
    return <span className="text-xs text-black/20">{t('transfers.settings.noAliases', '—')}</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {aliases.map((alias) => (
        <span
          key={alias}
          className="inline-flex rounded bg-black/[0.04] px-1.5 py-0.5 text-[11px] text-black/50"
        >
          {alias}
        </span>
      ))}
    </div>
  )
}
