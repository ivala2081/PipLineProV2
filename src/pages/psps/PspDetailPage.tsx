import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Coins,
  ArrowDown,
  ArrowUp,
  PencilSimple,
  Trash,
  Receipt,
  ArrowsDownUp,
} from '@phosphor-icons/react'
import {
  Button,
  Card,
  Tag,
  Skeleton,
  StatCard,
  EmptyState,
  Separator,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@ds'
import { useLocale } from '@ds/hooks'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { usePspDashboardQuery } from '@/hooks/queries/usePspDashboardQuery'
import { usePspLedgerQuery } from '@/hooks/queries/usePspLedgerQuery'
import { usePspSettlementsQuery } from '@/hooks/queries/usePspSettlementsQuery'
import { useToast } from '@/hooks/useToast'
import {
  settlementFormSchema,
  type SettlementFormValues,
} from '@/schemas/pspSettlementSchema'
import type { PspSettlement } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/* ------------------------------------------------------------------ */
/*  Settlement Form Dialog                                             */
/* ------------------------------------------------------------------ */

function SettlementFormDialog({
  open,
  onClose,
  onSave,
  isSaving,
  initialData,
  isEdit,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: SettlementFormValues) => Promise<void>
  isSaving: boolean
  initialData?: SettlementFormValues
  isEdit?: boolean
}) {
  const { t } = useTranslation('pages')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: initialData ?? {
      settlement_date: new Date().toISOString().split('T')[0],
      amount: 0,
      currency: 'TL',
      notes: '',
    },
  })

  const currencyVal = watch('currency')

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (data: SettlementFormValues) => {
    await onSave(data)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('psps.settlement.editTitle')
              : t('psps.settlement.title')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('psps.settlement.date')}</Label>
            <Input type="date" {...register('settlement_date')} />
            {errors.settlement_date && (
              <p className="text-xs text-red-500">
                {errors.settlement_date.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('psps.settlement.amount')}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('amount')}
            />
            {errors.amount && (
              <p className="text-xs text-red-500">{errors.amount.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('psps.settlement.currency')}</Label>
            <Select
              value={currencyVal}
              onValueChange={(v) =>
                setValue('currency', v as 'TL' | 'USD')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TL">TL</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('psps.settlement.notes')}</Label>
            <Input
              {...register('notes')}
              placeholder={t('psps.settlement.notesPlaceholder')}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              {t('psps.settlement.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? t('psps.settlement.saving')
                : t('psps.settlement.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Delete Confirmation Dialog                                         */
/* ------------------------------------------------------------------ */

function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  isDeleting,
  settlement,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
  settlement: PspSettlement | null
}) {
  const { t } = useTranslation('pages')

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('psps.deleteSettlement.title')}</DialogTitle>
        </DialogHeader>
        <p className="py-2 text-sm text-black/60">
          {t('psps.deleteSettlement.description', {
            amount: settlement
              ? formatCurrency(Number(settlement.amount))
              : '',
            currency: settlement?.currency ?? '',
          })}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            {t('psps.deleteSettlement.cancel')}
          </Button>
          <Button
            variant="filled"
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {t('psps.deleteSettlement.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Ledger Tab                                                         */
/* ------------------------------------------------------------------ */

function LedgerTab({ pspId }: { pspId: string }) {
  const { t } = useTranslation('pages')
  const { locale } = useLocale()
  const { rows, isLoading } = usePspLedgerQuery(pspId)

  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US'

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString(localeTag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="pt-8">
        <EmptyState
          icon={ArrowsDownUp}
          title={t('psps.detail.noData')}
          description={t('psps.detail.noDataDesc')}
        />
      </div>
    )
  }

  return (
    <div className="pt-4">
      <div className="overflow-x-auto rounded-lg border border-black/10">
        <Table>
          <TableHeader>
            <TableRow className="bg-black/[0.02]">
              <TableHead className="w-[100px]">{t('psps.columns.date')}</TableHead>
              <TableHead className="w-[80px]">{t('psps.columns.type')}</TableHead>
              <TableHead className="text-right">{t('psps.columns.deposit')}</TableHead>
              <TableHead className="text-right">{t('psps.columns.withdrawal')}</TableHead>
              <TableHead className="text-right">{t('psps.columns.commission')}</TableHead>
              <TableHead className="text-right">{t('psps.columns.net')}</TableHead>
              <TableHead className="text-right">{t('psps.columns.settlement')}</TableHead>
              <TableHead className="text-right">{t('psps.columns.balance')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={
                  row.type === 'settlement'
                    ? 'bg-green-50/50'
                    : 'hover:bg-black/[0.01]'
                }
              >
                <TableCell className="text-xs">{formatDate(row.date)}</TableCell>
                <TableCell>
                  <Tag
                    variant={row.type === 'settlement' ? 'green' : 'blue'}
                    className="text-[10px]"
                  >
                    {t(`psps.rowType.${row.type}`)}
                  </Tag>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {row.deposit > 0 ? formatCurrency(row.deposit) : '–'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {row.withdrawal > 0 ? formatCurrency(row.withdrawal) : '–'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm text-black/50">
                  {row.commission > 0 ? formatCurrency(row.commission) : '–'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm font-medium">
                  {row.net !== 0 ? formatCurrency(row.net) : '–'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm text-green-600 font-medium">
                  {row.settlement > 0
                    ? formatCurrency(row.settlement)
                    : '–'}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums text-sm font-semibold ${
                    row.balance > 0
                      ? 'text-amber-600'
                      : row.balance < 0
                        ? 'text-red-600'
                        : 'text-green-600'
                  }`}
                >
                  {formatCurrency(row.balance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Settlements Tab                                                    */
/* ------------------------------------------------------------------ */

function SettlementsTab({
  pspId,
  isAdmin,
}: {
  pspId: string
  isAdmin: boolean
}) {
  const { t } = useTranslation('pages')
  const { locale } = useLocale()
  const { toast } = useToast()

  const {
    settlements,
    isLoading,
    createSettlement,
    updateSettlement,
    deleteSettlement,
    isCreating,
    isUpdating,
    isDeleting,
  } = usePspSettlementsQuery(pspId)

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PspSettlement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PspSettlement | null>(null)

  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US'

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString(localeTag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const handleCreate = async (data: SettlementFormValues) => {
    try {
      await createSettlement(data)
      toast({ title: t('psps.toast.settlementCreated'), variant: 'success' })
      setFormOpen(false)
    } catch {
      toast({ title: t('psps.toast.error'), variant: 'error' })
    }
  }

  const handleUpdate = async (data: SettlementFormValues) => {
    if (!editTarget) return
    try {
      await updateSettlement(editTarget.id, data)
      toast({ title: t('psps.toast.settlementUpdated'), variant: 'success' })
      setEditTarget(null)
    } catch {
      toast({ title: t('psps.toast.error'), variant: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteSettlement(deleteTarget.id)
      toast({ title: t('psps.toast.settlementDeleted'), variant: 'success' })
      setDeleteTarget(null)
    } catch {
      toast({ title: t('psps.toast.error'), variant: 'error' })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Add button */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus size={14} weight="bold" className="mr-1" />
            {t('psps.detail.addSettlement')}
          </Button>
        </div>
      )}

      {settlements.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t('psps.detail.noData')}
          description={t('psps.detail.noDataDesc')}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-black/[0.02]">
                <TableHead>{t('psps.columns.date')}</TableHead>
                <TableHead className="text-right">
                  {t('psps.settlement.amount')}
                </TableHead>
                <TableHead>{t('psps.settlement.currency')}</TableHead>
                <TableHead>{t('psps.columns.notes')}</TableHead>
                {isAdmin && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.map((s) => (
                <TableRow key={s.id} className="hover:bg-black/[0.01]">
                  <TableCell className="text-sm">
                    {formatDate(s.settlement_date)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold text-green-600">
                    {formatCurrency(Number(s.amount))}
                  </TableCell>
                  <TableCell>
                    <Tag variant="default" className="text-xs">
                      {s.currency}
                    </Tag>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-black/50">
                    {s.notes || '–'}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0"
                          onClick={() => setEditTarget(s)}
                        >
                          <PencilSimple size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0 text-red-500 hover:text-red-600"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <SettlementFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleCreate}
        isSaving={isCreating}
      />

      {/* Edit Dialog */}
      <SettlementFormDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleUpdate}
        isSaving={isUpdating}
        isEdit
        initialData={
          editTarget
            ? {
                settlement_date: editTarget.settlement_date,
                amount: Number(editTarget.amount),
                currency: editTarget.currency as 'TL' | 'USD',
                notes: editTarget.notes ?? '',
              }
            : undefined
        }
      />

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        settlement={deleteTarget}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PSP Detail Page                                                    */
/* ------------------------------------------------------------------ */

export function PspDetailPage() {
  const { pspId } = useParams<{ pspId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('pages')
  const { locale } = useLocale()
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const isAdmin = isGod || membership?.role === 'admin'

  const { psps, isLoading } = usePspDashboardQuery()
  const psp = psps.find((p) => p.psp_id === pspId)

  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US'

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString(localeTag, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  /* Loading */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card padding="spacious" className="border border-black/5 bg-bg1">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  /* Not Found */
  if (!psp) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-black/5">
          <CreditCard size={28} className="text-black/40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-black/60">
            {t('psps.detail.notFound', 'PSP not found')}
          </p>
          <p className="mt-1 text-xs text-black/40">
            {t(
              'psps.detail.notFoundDesc',
              'The PSP you are looking for does not exist.',
            )}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/psps')}>
          <ArrowLeft size={16} />
          {t('psps.backToList')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="gray" size="sm" onClick={() => navigate('/psps')}>
        <ArrowLeft size={16} />
        {t('psps.backToList')}
      </Button>

      {/* PSP Header Card */}
      <Card padding="spacious" className="border border-black/5 bg-bg1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-black/5">
              <CreditCard size={24} className="text-black/40" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{psp.psp_name}</h1>
                <Tag variant={psp.is_active ? 'green' : 'red'}>
                  {psp.is_active
                    ? t('psps.card.active')
                    : t('psps.card.inactive')}
                </Tag>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-sm text-black/60">
                  {t('psps.card.commission')}:{' '}
                  <span className="font-medium">
                    {(psp.commission_rate * 100).toFixed(1)}%
                  </span>
                </span>
                {psp.last_settlement_date && (
                  <>
                    <span className="text-black/20">·</span>
                    <span className="text-sm text-black/40">
                      {t('psps.card.lastSettlement')}:{' '}
                      {formatDate(psp.last_settlement_date)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={Coins}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          label={t('psps.stats.outstanding')}
          value={formatCurrency(psp.balance)}
        />
        <StatCard
          icon={ArrowDown}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label={t('psps.stats.settlements')}
          value={formatCurrency(psp.total_settlements)}
        />
        <StatCard
          icon={ArrowUp}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label={t('psps.stats.deposits')}
          value={formatCurrency(psp.total_deposits)}
        />
        <StatCard
          icon={CreditCard}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label={t('psps.stats.commission')}
          value={formatCurrency(psp.total_commission)}
        />
        <StatCard
          icon={ArrowDown}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          label={t('psps.detail.withdrawals', 'Withdrawals')}
          value={formatCurrency(psp.total_withdrawals)}
        />
      </div>

      {/* Tabs: Ledger + Settlements */}
      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">
            {t('psps.detail.tabs.ledger', 'Ledger')}
          </TabsTrigger>
          <TabsTrigger value="settlements">
            {t('psps.detail.tabs.settlements', 'Settlements')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger">
          <LedgerTab pspId={pspId!} />
        </TabsContent>

        <TabsContent value="settlements">
          <SettlementsTab pspId={pspId!} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
