import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, PencilSimple, Trash } from '@phosphor-icons/react'
import { useLookupManagement } from '@/hooks/useLookupManagement'
import { useToast } from '@/hooks/useToast'
import {
  Card,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Separator,
} from '@ds'

interface LookupSettingsProps {
  onLookupChange: () => Promise<void>
}

type LookupTable = 'psps' | 'transfer_categories' | 'payment_methods' | 'transfer_types'

interface SectionConfig {
  table: LookupTable
  titleKey: string
  hasCommissionRate?: boolean
  hasIsDeposit?: boolean
}

const sections: SectionConfig[] = [
  { table: 'psps', titleKey: 'transfers.settings.psps', hasCommissionRate: true },
  { table: 'transfer_categories', titleKey: 'transfers.settings.categories', hasIsDeposit: true },
  { table: 'payment_methods', titleKey: 'transfers.settings.paymentMethods' },
  { table: 'transfer_types', titleKey: 'transfers.settings.types' },
]

function LookupSection({
  config,
  onLookupChange,
}: {
  config: SectionConfig
  onLookupChange: () => Promise<void>
}) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { items, createItem, updateItem, deleteItem } = useLookupManagement(config.table)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [commissionRate, setCommissionRate] = useState('')
  const [isDeposit, setIsDeposit] = useState(true)
  const [saving, setSaving] = useState(false)

  const openAdd = () => {
    setEditingId(null)
    setName('')
    setCommissionRate('')
    setIsDeposit(true)
    setDialogOpen(true)
  }

  const openEdit = (item: Record<string, unknown>) => {
    setEditingId(item.id as string)
    setName(item.name as string)
    if (config.hasCommissionRate) {
      setCommissionRate(String(((item.commission_rate as number) ?? 0) * 100))
    }
    if (config.hasIsDeposit) {
      setIsDeposit((item.is_deposit as boolean) ?? true)
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    const data: Record<string, unknown> = { name: name.trim() }
    if (config.hasCommissionRate) {
      data.commission_rate = (parseFloat(commissionRate) || 0) / 100
    }
    if (config.hasIsDeposit) {
      data.is_deposit = isDeposit
    }

    const result = editingId
      ? await updateItem(editingId, data)
      : await createItem(data)

    setSaving(false)

    if (result.error) {
      toast({ title: result.error, variant: 'error' })
    } else {
      toast({
        title: editingId ? t('transfers.toast.lookupUpdated') : t('transfers.toast.lookupCreated'),
        variant: 'success',
      })
      setDialogOpen(false)
      await onLookupChange()
    }
  }

  const handleDelete = async (id: string) => {
    const result = await deleteItem(id)
    if (result.error) {
      toast({ title: result.error, variant: 'error' })
    } else {
      toast({ title: t('transfers.toast.lookupDeleted'), variant: 'success' })
      await onLookupChange()
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
        <p className="text-sm text-black/40 py-4">{t('transfers.settings.noItems')}</p>
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
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                {config.hasCommissionRate && (
                  <TableCell>
                    {(((item as Record<string, unknown>).commission_rate as number) * 100).toFixed(1)}%
                  </TableCell>
                )}
                {config.hasIsDeposit && (
                  <TableCell>
                    <Tag variant={(item as Record<string, unknown>).is_deposit ? 'green' : 'red'}>
                      {(item as Record<string, unknown>).is_deposit ? 'Deposit' : 'Withdrawal'}
                    </Tag>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="borderless" size="sm" onClick={() => openEdit(item)}>
                      <PencilSimple size={14} />
                    </Button>
                    <Button
                      variant="borderless"
                      size="sm"
                      className="text-red-600"
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

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('transfers.settings.editItem') : t('transfers.settings.addItem')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-1 text-sm font-medium">{t('transfers.settings.name')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('transfers.settings.namePlaceholder')}
              />
            </div>

            {config.hasCommissionRate && (
              <div>
                <Label className="mb-1 text-sm font-medium">
                  {t('transfers.settings.commissionRate')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  placeholder={t('transfers.settings.commissionRatePlaceholder')}
                />
              </div>
            )}

            {config.hasIsDeposit && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-deposit"
                  checked={isDeposit}
                  onChange={(e) => setIsDeposit(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <Label htmlFor="is-deposit" className="text-sm">
                  {t('transfers.settings.isDeposit')}
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('transfers.settings.cancel')}
            </Button>
            <Button variant="filled" onClick={handleSave} disabled={saving}>
              {t('transfers.settings.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function LookupSettings({ onLookupChange }: LookupSettingsProps) {
  const { t } = useTranslation('pages')

  return (
    <Card className="space-y-6 border border-black/5 bg-bg1 p-6">
      <div>
        <h2 className="text-lg font-semibold">{t('transfers.settings.title')}</h2>
        <p className="mt-1 text-sm text-black/40">{t('transfers.settings.subtitle')}</p>
      </div>

      {sections.map((config, i) => (
        <div key={config.table}>
          <LookupSection config={config} onLookupChange={onLookupChange} />
          {i < sections.length - 1 && <Separator className="mt-6" />}
        </div>
      ))}
    </Card>
  )
}
