import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Lock, Trash, PencilSimple, FloppyDisk } from '@phosphor-icons/react'
import {
  useAccountingRegisters,
  useAccountingRegisterMutations,
  useSeedRegisters,
} from '@/hooks/queries/useAccountingRegisters'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import type { AccountingRegister } from '@/lib/database.types'
import {
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Skeleton,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@ds'

/* ── Add/Edit Dialog ───────────────────────────────────── */

interface RegisterDialogProps {
  open: boolean
  onClose: () => void
  register: AccountingRegister | null
}

function RegisterDialog({ open, onClose, register }: RegisterDialogProps) {
  const { t } = useTranslation('pages')
  const { createRegister, updateRegister } = useAccountingRegisterMutations()
  const isEditing = !!register

  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [currency, setCurrency] = useState('TRY')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setName(register?.name ?? '')
      setLabel(register?.label ?? '')
      setCurrency(register?.currency ?? 'TRY')
    }
    if (!v) onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (isEditing) {
        await updateRegister.mutateAsync({ id: register.id, label, currency })
      } else {
        await createRegister.mutateAsync({
          name: name.toUpperCase().replace(/\s+/g, '_'),
          label,
          currency,
        })
      }
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('accounting.settings.editRegister', 'Edit Register')
              : t('accounting.settings.addRegister', 'Add Register')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-md">
          {!isEditing && (
            <div className="space-y-sm">
              <Label>{t('accounting.settings.registerName', 'Name (code)')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CRYPTO_EUR"
                required
              />
            </div>
          )}
          <div className="space-y-sm">
            <Label>{t('accounting.settings.registerLabel', 'Display Label')}</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Crypto EUR"
              required
            />
          </div>
          <div className="space-y-sm">
            <Label>{t('accounting.settings.registerCurrency', 'Currency')}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">TRY</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="USDT">USDT</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="TRX">TRX</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('accounting.form.cancel')}
            </Button>
            <Button type="submit" variant="filled" disabled={isSubmitting}>
              {isSubmitting ? t('accounting.form.saving') : t('accounting.form.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ── Main Component ────────────────────────────────────── */

export function RegisterSettingsTab() {
  const { t } = useTranslation('pages')
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const isAdmin = isGod || membership?.role === 'admin'

  const { data: registers = [], isLoading } = useAccountingRegisters()
  const { deleteRegister } = useAccountingRegisterMutations()
  const seedRegisters = useSeedRegisters()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRegister, setEditingRegister] = useState<AccountingRegister | null>(null)

  const handleAdd = () => {
    setEditingRegister(null)
    setDialogOpen(true)
  }

  const handleEdit = (reg: AccountingRegister) => {
    setEditingRegister(reg)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    await deleteRegister.mutateAsync(id)
  }

  const handleSeed = async () => {
    await seedRegisters.mutateAsync()
  }

  if (isLoading) {
    return (
      <div className="space-y-sm">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (registers.length === 0) {
    return (
      <div className="space-y-md">
        <EmptyState
          icon={FloppyDisk}
          title={t('accounting.settings.noRegisters', 'No registers configured')}
          description={t(
            'accounting.settings.noRegistersDesc',
            'Seed default registers to get started.',
          )}
        />
        {isAdmin && (
          <div className="flex justify-center">
            <Button variant="filled" onClick={handleSeed} disabled={seedRegisters.isPending}>
              {seedRegisters.isPending
                ? t('accounting.settings.seeding', 'Seeding...')
                : t('accounting.settings.seedDefaults', 'Seed Default Registers')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-black/70">
          {t('accounting.settings.registersTitle', 'Registers')}
        </h3>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus size={14} weight="bold" />
            {t('accounting.settings.addRegister', 'Add Register')}
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10">
        <Table>
          <TableHeader>
            <TableRow className="bg-black/[0.02] hover:bg-black/[0.02]">
              <TableHead>{t('accounting.settings.name', 'Name')}</TableHead>
              <TableHead>{t('accounting.settings.label', 'Label')}</TableHead>
              <TableHead>{t('accounting.settings.currency', 'Currency')}</TableHead>
              <TableHead>{t('accounting.settings.status', 'Status')}</TableHead>
              {isAdmin && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {registers.map((reg) => (
              <TableRow key={reg.id}>
                <TableCell className="font-mono text-sm">{reg.name}</TableCell>
                <TableCell className="text-sm">{reg.label}</TableCell>
                <TableCell>
                  <Tag variant="default">{reg.currency}</Tag>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {reg.is_system && (
                      <Tag variant="purple" className="gap-1">
                        <Lock size={10} />
                        {t('accounting.settings.system', 'System')}
                      </Tag>
                    )}
                    <Tag variant={reg.is_active ? 'default' : 'red'}>
                      {reg.is_active
                        ? t('accounting.settings.active', 'Active')
                        : t('accounting.settings.inactive', 'Inactive')}
                    </Tag>
                  </div>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0"
                        onClick={() => handleEdit(reg)}
                      >
                        <PencilSimple size={14} />
                      </Button>
                      {!reg.is_system && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0 text-red hover:text-red"
                          onClick={() => handleDelete(reg.id)}
                        >
                          <Trash size={14} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RegisterDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingRegister(null)
        }}
        register={editingRegister}
      />
    </div>
  )
}
