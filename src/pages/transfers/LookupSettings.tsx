import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, PencilSimple, Trash, ClockCounterClockwise } from '@phosphor-icons/react'
import { useLookupMutation } from '@/hooks/queries/useLookupMutation'
import { useToast } from '@/hooks/useToast'
import { LookupFormDialog } from './LookupFormDialog'
import { PspRateHistoryDialog } from './PspRateHistoryDialog'
import type { Psp } from '@/lib/database.types'
import {
  Card,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Separator,
} from '@ds'

type LookupTable =
  | 'psps'
  | 'transfer_categories'
  | 'payment_methods'
  | 'transfer_types'

interface SectionConfig {
  table: LookupTable
  titleKey: string
  hasCommissionRate?: boolean
  hasIsDeposit?: boolean
}

const sections: SectionConfig[] = [
  {
    table: 'psps',
    titleKey: 'transfers.settings.psps',
    hasCommissionRate: true,
  },
  {
    table: 'transfer_categories',
    titleKey: 'transfers.settings.categories',
    hasIsDeposit: true,
  },
  { table: 'payment_methods', titleKey: 'transfers.settings.paymentMethods' },
  { table: 'transfer_types', titleKey: 'transfers.settings.types' },
]

function LookupSection({ config }: { config: SectionConfig }) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { items, createItem, updateItem, deleteItem, isCreating, isUpdating } =
    useLookupMutation(config.table)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(
    null,
  )
  const [rateHistoryPsp, setRateHistoryPsp] = useState<Psp | null>(null)

  const openAdd = () => {
    setEditingItem(null)
    setDialogOpen(true)
  }

  const openEdit = (item: Record<string, unknown>) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id as string, data)
        toast({
          title: t('transfers.toast.lookupUpdated'),
          variant: 'success',
        })
      } else {
        await createItem(data)
        toast({
          title: t('transfers.toast.lookupCreated'),
          variant: 'success',
        })
      }
      // No manual refresh needed - useLookupMutation handles it!
    } catch (error) {
      toast({
        title: (error as Error).message || t('transfers.toast.error'),
        variant: 'error',
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id)
      toast({
        title: t('transfers.toast.lookupDeleted'),
        variant: 'success',
      })
      // No manual refresh needed!
    } catch (error) {
      toast({
        title: (error as Error).message || t('transfers.toast.error'),
        variant: 'error',
      })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t(config.titleKey)}</h3>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus size={14} weight="bold" />
          {t('transfers.settings.addItem')}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="py-4 text-sm text-black/40">
          {t('transfers.settings.noItems')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('transfers.settings.name')}</TableHead>
              {config.hasCommissionRate && (
                <TableHead>{t('transfers.settings.commissionRate')}</TableHead>
              )}
              {config.hasIsDeposit && (
                <TableHead>{t('transfers.settings.isDeposit')}</TableHead>
              )}
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                {config.hasCommissionRate && (
                  <TableCell
                    className="cursor-pointer font-mono tabular-nums hover:text-blue-600"
                    onClick={() => setRateHistoryPsp(item as unknown as Psp)}
                  >
                    {(
                      ((item as Record<string, unknown>).commission_rate as number) *
                      100
                    ).toFixed(1)}
                    %
                  </TableCell>
                )}
                {config.hasIsDeposit && (
                  <TableCell>
                    <Tag
                      variant={
                        (item as Record<string, unknown>).is_deposit
                          ? 'green'
                          : 'red'
                      }
                    >
                      {(item as Record<string, unknown>).is_deposit
                        ? t('transfers.settings.deposit')
                        : t('transfers.settings.withdrawal')}
                    </Tag>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex gap-1">
                    {config.hasCommissionRate && (
                      <Button
                        variant="borderless"
                        size="sm"
                        onClick={() =>
                          setRateHistoryPsp(item as unknown as Psp)
                        }
                        title={t('transfers.settings.rateHistory')}
                      >
                        <ClockCounterClockwise size={14} />
                      </Button>
                    )}
                    <Button
                      variant="borderless"
                      size="sm"
                      onClick={() => openEdit(item)}
                    >
                      <PencilSimple size={14} />
                    </Button>
                    <Button
                      variant="borderless"
                      size="sm"
                      className="text-red"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <LookupFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        editingItem={editingItem}
        hasCommissionRate={config.hasCommissionRate}
        hasIsDeposit={config.hasIsDeposit}
        title={
          editingItem
            ? t('transfers.settings.editItem')
            : t('transfers.settings.addItem')
        }
        isSaving={isCreating || isUpdating}
      />

      {config.hasCommissionRate && (
        <PspRateHistoryDialog
          psp={rateHistoryPsp}
          open={rateHistoryPsp !== null}
          onClose={() => setRateHistoryPsp(null)}
        />
      )}
    </div>
  )
}

export function LookupSettings() {
  const { t } = useTranslation('pages')

  return (
    <Card className="space-y-6 border border-black/5 bg-bg1 p-6">
      <div>
        <h2 className="text-lg font-semibold">{t('transfers.settings.title')}</h2>
        <p className="mt-1 text-sm text-black/40">
          {t('transfers.settings.subtitle')}
        </p>
      </div>

      {sections.map((config, i) => (
        <div key={config.table}>
          <LookupSection config={config} />
          {i < sections.length - 1 && <Separator className="mt-6" />}
        </div>
      ))}
    </Card>
  )
}
