import { useState, useMemo, useEffect } from 'react'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { localYMD } from '@/lib/date'
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
  ArrowsDownUp as SortIcon,
  SpinnerGap,
  CaretDown,
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
  DatePickerField,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DatePicker,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@ds'
import { useLocale } from '@ds/hooks'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { usePspDashboardQuery } from '@/hooks/queries/usePspDashboardQuery'
import { usePspLedgerQuery } from '@/hooks/queries/usePspLedgerQuery'
import { usePspSettlementsQuery } from '@/hooks/queries/usePspSettlementsQuery'
import { useLookupMutation } from '@/hooks/queries/useLookupMutation'
import { usePspRates, usePspRateMutations } from '@/hooks/queries/usePspRatesQuery'
import { useToast } from '@/hooks/useToast'
import { ManagerPinDialog } from '@ds'
import { settlementFormSchema, type SettlementFormValues } from '@/schemas/pspSettlementSchema'
import type { PspSettlement } from '@/lib/database.types'
import { MonthlyTab } from './PspMonthlyTab'
import { BlokeTab } from './PspBlokeTab'
import { UniPaymentWalletTab } from './UniPaymentWalletTab'
import { UniPaymentTransactionsTab } from './UniPaymentTransactionsTab'
import { UniPaymentInvoicesTab } from './UniPaymentInvoicesTab'
import { UniPaymentPaymentsTab } from './UniPaymentPaymentsTab'
import { UniPaymentSyncTab } from './UniPaymentSyncTab'

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
  const { t, i18n } = useTranslation('pages')
  const lang = (i18n.language === 'tr' ? 'tr' : 'en') as 'tr' | 'en'
  const [amountDisplay, setAmountDisplay] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: {
      settlement_date: new Date().toISOString().split('T')[0],
      amount: '' as unknown as number,
      currency: 'TL',
      notes: '',
    },
  })

  // Re-populate form whenever the dialog opens (mirrors EntryDialog pattern)
  useEffect(() => {
    if (open) {
      reset({
        settlement_date: initialData?.settlement_date ?? new Date().toISOString().split('T')[0],
        amount: (initialData?.amount || '') as unknown as number,
        currency: (initialData?.currency ?? 'TL') as 'TL' | 'USD',
        notes: initialData?.notes ?? '',
      })
      setAmountDisplay(initialData?.amount ? numberToDisplay(Number(initialData.amount), lang) : '')
    }
  }, [open, initialData, reset, lang])

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch
  const currencyVal = watch('currency')

  const handleClose = () => {
    onClose()
  }

  const onSubmit = async (data: SettlementFormValues) => {
    await onSave(data)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('psps.settlement.editTitle') : t('psps.settlement.title')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-md">
          {/* Date */}
          <div className="space-y-sm">
            <Label>{t('psps.settlement.date')}</Label>
            <DatePickerField
              value={watch('settlement_date')}
              onChange={(e) => setValue('settlement_date', e.target.value)}
            />
            {errors.settlement_date && (
              <p className="text-xs text-red-500">{errors.settlement_date.message}</p>
            )}
          </div>

          {/* Amount + Currency toggle */}
          <div className="space-y-sm">
            <Label>{t('psps.settlement.amount')}</Label>
            <div className="flex items-start gap-sm">
              <div className="flex-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={amountPlaceholder(lang)}
                  className="text-lg font-semibold tabular-nums"
                  value={amountDisplay}
                  onChange={(e) => {
                    const formatted = formatAmount(e.target.value, lang)
                    setAmountDisplay(formatted)
                    setValue('amount', parseAmount(formatted, lang) as unknown as number, { shouldValidate: true })
                  }}
                />
              </div>
              <div className="flex gap-1 pt-0.5">
                <Button
                  type="button"
                  variant={currencyVal === 'TL' ? 'filled' : 'outline'}
                  size="sm"
                  className="w-14"
                  onClick={() => setValue('currency', 'TL')}
                >
                  TL
                </Button>
                <Button
                  type="button"
                  variant={currencyVal === 'USD' ? 'filled' : 'outline'}
                  size="sm"
                  className="w-14"
                  onClick={() => setValue('currency', 'USD')}
                >
                  USD
                </Button>
              </div>
            </div>
            {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-sm">
            <Label>{t('psps.settlement.notes')}</Label>
            <Input {...register('notes')} placeholder={t('psps.settlement.notesPlaceholder')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
              {t('psps.settlement.cancel')}
            </Button>
            <Button type="submit" variant="filled" disabled={isSaving}>
              {isSaving ? t('psps.settlement.saving') : t('psps.settlement.save')}
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
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('psps.deleteSettlement.title')}</DialogTitle>
        </DialogHeader>
        <p className="py-2 text-sm text-black/60">
          {t('psps.deleteSettlement.description', {
            amount: settlement ? formatCurrency(Number(settlement.amount)) : '',
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

function LedgerTab({
  pspId,
  currency,
  dateFrom,
  dateTo,
  sortBy,
  sortDir,
  isAdmin,
}: {
  pspId: string
  currency: string
  dateFrom: string | null
  dateTo: string | null
  sortBy: PspLedgerSortKey
  sortDir: 'asc' | 'desc'
  isAdmin: boolean
}) {
  const { t } = useTranslation('pages')
  const { locale } = useLocale()
  const { rows, isLoading } = usePspLedgerQuery(pspId)
  const { createSettlement, isCreating } = usePspSettlementsQuery(pspId)
  const { toast } = useToast()
  const [quickFormOpen, setQuickFormOpen] = useState(false)
  const [quickFormInitial, setQuickFormInitial] = useState<SettlementFormValues | undefined>(
    undefined,
  )

  const handleQuickAdd = (date: string, net: number) => {
    setQuickFormInitial({
      settlement_date: date,
      amount: net > 0 ? net : 0,
      currency: (currency === 'USDT' ? 'USD' : currency) as 'TL' | 'USD',
      notes: '',
    })
    setQuickFormOpen(true)
  }

  const handleQuickSave = async (data: SettlementFormValues) => {
    try {
      await createSettlement(data)
      toast({ title: t('psps.toast.settlementCreated'), variant: 'success' })
      setQuickFormOpen(false)
    } catch {
      toast({ title: t('psps.toast.error'), variant: 'error' })
    }
  }

  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US'

  const formatDate = (dateStr: string) =>
    new Date(dateStr.slice(0, 10) + 'T00:00:00').toLocaleDateString(localeTag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const filteredAndSortedRows = useMemo(() => {
    let result = [...rows]
    if (dateFrom) result = result.filter((r) => r.date >= dateFrom)
    if (dateTo) result = result.filter((r) => r.date <= dateTo)
    result.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      const av = a[sortBy as keyof typeof a]
      const bv = b[sortBy as keyof typeof b]
      if (typeof av === 'string' && typeof bv === 'string') return mul * av.localeCompare(bv)
      return mul * (Number(av) - Number(bv))
    })
    return result
  }, [rows, dateFrom, dateTo, sortBy, sortDir])

  if (isLoading) {
    return (
      <div className="space-y-sm pt-md">
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

  const cur = <span className="ml-1 text-[10px] font-normal text-black/30">{currency}</span>

  if (filteredAndSortedRows.length === 0) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={ArrowsDownUp}
          title={t('psps.detail.noData')}
          description={t('psps.ledger.noResultsForDate', 'No entries for the selected date range.')}
        />
      </div>
    )
  }

  return (
    <>
      <div className="pt-4">
        <div className="rounded-lg border border-black/10">
          <Table cardOnMobile>
            <TableHeader>
              <TableRow className="bg-black/[0.02]">
                <TableHead className="w-[110px]">{t('psps.columns.date')}</TableHead>
                <TableHead className="text-right">
                  {t('psps.columns.deposit')}
                  {cur}
                </TableHead>
                <TableHead className="text-right">
                  {t('psps.columns.withdrawal')}
                  {cur}
                </TableHead>
                <TableHead className="text-right">
                  {t('psps.columns.total')}
                  {cur}
                </TableHead>
                <TableHead className="text-right">
                  {t('psps.columns.commission')}
                  {cur}
                </TableHead>
                <TableHead className="text-right">
                  {t('psps.columns.net')}
                  {cur}
                </TableHead>
                <TableHead className="text-right">
                  {t('psps.columns.settlement')}
                  {cur}
                </TableHead>
                <TableHead className="text-right">
                  {t('psps.columns.kasaTop')}
                  {cur}
                </TableHead>
                <TableHead className="text-right">
                  {t('psps.columns.devir')}
                  {cur}
                </TableHead>
                {isAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedRows.map((row) => (
                <TableRow
                  key={row.date}
                  className={`group ${row.settlement > 0 ? 'bg-green/[0.03]' : 'hover:bg-black/[0.01]'}`}
                >
                  <TableCell className="text-xs font-medium" data-label={t('psps.columns.date')}>
                    {formatDate(row.date)}
                  </TableCell>
                  {/* YATIRIM – deposits */}
                  <TableCell
                    className="text-right tabular-nums text-sm text-green-600"
                    data-label={t('psps.columns.deposit')}
                  >
                    {row.deposit > 0 ? formatCurrency(row.deposit) : '–'}
                  </TableCell>
                  {/* ÇEKME – withdrawals displayed as negative */}
                  <TableCell
                    className="text-right tabular-nums text-sm text-red-500"
                    data-label={t('psps.columns.withdrawal')}
                  >
                    {row.withdrawal > 0 ? `-${formatCurrency(row.withdrawal)}` : '–'}
                  </TableCell>
                  {/* TOPLAM = deposit - withdrawal */}
                  <TableCell
                    className="text-right tabular-nums text-sm font-medium"
                    data-label={t('psps.columns.total')}
                  >
                    <span
                      className={
                        row.total > 0
                          ? 'text-green-600'
                          : row.total < 0
                            ? 'text-red-500'
                            : 'text-black/40'
                      }
                    >
                      {row.deposit > 0 || row.withdrawal > 0 ? formatCurrency(row.total) : '–'}
                    </span>
                  </TableCell>
                  {/* KOMİSYON */}
                  <TableCell
                    className="text-right tabular-nums text-sm text-black/50"
                    data-label={t('psps.columns.commission')}
                  >
                    {row.commission > 0 ? formatCurrency(row.commission) : '–'}
                  </TableCell>
                  {/* NET */}
                  <TableCell
                    className="text-right tabular-nums text-sm font-medium"
                    data-label={t('psps.columns.net')}
                  >
                    <span
                      className={
                        row.net > 0
                          ? 'text-green-600'
                          : row.net < 0
                            ? 'text-red-500'
                            : 'text-black/40'
                      }
                    >
                      {row.deposit > 0 || row.withdrawal > 0 ? formatCurrency(row.net) : '–'}
                    </span>
                  </TableCell>
                  {/* TAHS TUTARI */}
                  <TableCell
                    className="text-right tabular-nums text-sm font-medium text-blue"
                    data-label={t('psps.columns.settlement')}
                  >
                    {row.settlement > 0 ? formatCurrency(row.settlement) : '–'}
                  </TableCell>
                  {/* KASA TOP = devir + net */}
                  <TableCell
                    className={`text-right tabular-nums text-sm font-semibold ${
                      row.kasaTop > 0
                        ? 'text-amber-600'
                        : row.kasaTop < 0
                          ? 'text-red-500'
                          : 'text-green-600'
                    }`}
                    data-label={t('psps.columns.kasaTop')}
                  >
                    {formatCurrency(row.kasaTop)}
                  </TableCell>
                  {/* DEVİR – carry-over from previous day */}
                  <TableCell
                    className="text-right tabular-nums text-sm text-black/40"
                    data-label={t('psps.columns.devir')}
                  >
                    {row.devir !== 0 ? formatCurrency(row.devir) : '–'}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="w-10 px-2" isActions>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleQuickAdd(row.date, row.net)}
                      >
                        <Receipt size={13} />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <SettlementFormDialog
        open={quickFormOpen}
        onClose={() => setQuickFormOpen(false)}
        onSave={handleQuickSave}
        isSaving={isCreating}
        initialData={quickFormInitial}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Settlements Tab                                                    */
/* ------------------------------------------------------------------ */

function SettlementsTab({ pspId, isAdmin }: { pspId: string; isAdmin: boolean }) {
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
        <div className="rounded-lg border border-black/10">
          <Table cardOnMobile>
            <TableHeader>
              <TableRow className="bg-black/[0.02]">
                <TableHead>{t('psps.columns.date')}</TableHead>
                <TableHead className="text-right">{t('psps.settlement.amount')}</TableHead>
                <TableHead>{t('psps.settlement.currency')}</TableHead>
                <TableHead>{t('psps.columns.notes')}</TableHead>
                {isAdmin && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.map((s) => (
                <TableRow key={s.id} className="hover:bg-black/[0.01]">
                  <TableCell className="text-sm" data-label={t('psps.columns.date')}>
                    {formatDate(s.settlement_date)}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums text-sm font-semibold text-green-600"
                    data-label={t('psps.settlement.amount')}
                  >
                    {formatCurrency(Number(s.amount))}
                  </TableCell>
                  <TableCell data-label={t('psps.settlement.currency')}>
                    <Tag variant="default" className="text-xs">
                      {s.currency}
                    </Tag>
                  </TableCell>
                  <TableCell
                    className="max-w-[200px] truncate text-xs text-black/50"
                    data-label={t('psps.columns.notes')}
                  >
                    {s.notes || '–'}
                  </TableCell>
                  {isAdmin && (
                    <TableCell isActions>
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
/*  Delete PSP Confirmation Dialog                                    */
/* ------------------------------------------------------------------ */

function DeletePspDialog({
  open,
  onClose,
  onConfirm,
  isDeleting,
  pspName,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
  pspName: string
}) {
  const { t } = useTranslation('pages')

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t('psps.deletePsp.title')}</DialogTitle>
        </DialogHeader>
        <p className="py-2 text-sm text-black/60">
          {t('psps.deletePsp.description', { name: pspName })}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            {t('psps.deletePsp.cancel')}
          </Button>
          <Button
            variant="filled"
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? <SpinnerGap size={14} className="mr-1.5 animate-spin" /> : null}
            {t('psps.deletePsp.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Settings Tab                                                       */
/* ------------------------------------------------------------------ */

function SettingsTab({
  pspId,
  pspName,
  currentRate,
  isActive,
  isInternal,
  currency,
}: {
  pspId: string
  pspName: string
  currentRate: number
  isActive: boolean
  isInternal: boolean
  currency: string
}) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const navigate = useNavigate()

  const pspMutation = useLookupMutation('psps')

  // Active/inactive toggle
  const [statusPinOpen, setStatusPinOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<boolean | null>(null)

  const handleStatusToggle = () => {
    setPendingStatus(!isActive)
    setStatusPinOpen(true)
  }

  const handleStatusPinConfirm = async () => {
    setStatusPinOpen(false)
    if (pendingStatus === null) return
    try {
      await pspMutation.updateItem(pspId, { is_active: pendingStatus })
      toast({ title: t('transfers.toast.lookupUpdated'), variant: 'success' })
    } catch (error) {
      toast({
        title: (error as Error).message || t('transfers.toast.error'),
        variant: 'error',
      })
    }
    setPendingStatus(null)
  }

  // Internal toggle
  const [internalPinOpen, setInternalPinOpen] = useState(false)
  const [pendingInternal, setPendingInternal] = useState<boolean | null>(null)

  const handleInternalToggle = () => {
    setPendingInternal(!isInternal)
    setInternalPinOpen(true)
  }

  const handleInternalPinConfirm = async () => {
    setInternalPinOpen(false)
    if (pendingInternal === null) return
    try {
      // When marking as internal, also set commission to 0
      const update: Record<string, unknown> = { is_internal: pendingInternal }
      if (pendingInternal) update.commission_rate = 0
      await pspMutation.updateItem(pspId, update)
      toast({ title: t('transfers.toast.lookupUpdated'), variant: 'success' })
    } catch (error) {
      toast({
        title: (error as Error).message || t('transfers.toast.error'),
        variant: 'error',
      })
    }
    setPendingInternal(null)
  }

  // Currency change
  const handleCurrencyChange = async (newCurrency: string) => {
    if (newCurrency === currency) return
    try {
      await pspMutation.updateItem(pspId, { currency: newCurrency })
      toast({ title: t('transfers.toast.lookupUpdated'), variant: 'success' })
    } catch (error) {
      toast({
        title: (error as Error).message || t('transfers.toast.error'),
        variant: 'error',
      })
    }
  }

  // Simple rate update
  const [newRate, setNewRate] = useState('')
  const [ratePinOpen, setRatePinOpen] = useState(false)

  const handleRateSave = () => {
    const parsed = parseFloat(newRate)
    if (isNaN(parsed) || parsed < 0 || parsed >= 100) return
    setRatePinOpen(true)
  }

  const handleRatePinConfirm = async () => {
    setRatePinOpen(false)
    const parsed = parseFloat(newRate) / 100
    try {
      await pspMutation.updateItem(pspId, { commission_rate: parsed })
      toast({ title: t('transfers.toast.lookupUpdated'), variant: 'success' })
      setNewRate('')
    } catch (error) {
      toast({
        title: (error as Error).message || t('transfers.toast.error'),
        variant: 'error',
      })
    }
  }

  // Effective-from rate history (optional / collapsible)
  const [historyOpen, setHistoryOpen] = useState(false)
  const { rates, isLoading: ratesLoading } = usePspRates(historyOpen ? pspId : null)
  const { createRate, deleteRate, isCreating, isDeleting } = usePspRateMutations()

  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [ratePercent, setRatePercent] = useState('')
  const [historyPinOpen, setHistoryPinOpen] = useState(false)
  const [pendingAdd, setPendingAdd] = useState<{
    rate: number
    effectiveFrom: string
  } | null>(null)
  const [pendingDeleteRateId, setPendingDeleteRateId] = useState<string | null>(null)

  const todayStr = localYMD(new Date())

  const handleAddClick = () => {
    if (!effectiveFrom || !ratePercent) return
    const rate = parseFloat(ratePercent) / 100
    if (isNaN(rate) || rate < 0 || rate >= 1) return
    setPendingAdd({ rate, effectiveFrom })
    setPendingDeleteRateId(null)
    setHistoryPinOpen(true)
  }

  const handleHistoryPinConfirm = async () => {
    const addData = pendingAdd
    const deleteId = pendingDeleteRateId
    setHistoryPinOpen(false)
    setPendingAdd(null)
    setPendingDeleteRateId(null)

    if (addData) {
      try {
        await createRate({
          pspId,
          commissionRate: addData.rate,
          effectiveFrom: addData.effectiveFrom,
        })
        toast({ title: t('transfers.toast.rateCreated'), variant: 'success' })
        setEffectiveFrom('')
        setRatePercent('')
      } catch (error) {
        toast({
          title: (error as Error).message || t('transfers.toast.error'),
          variant: 'error',
        })
      }
    } else if (deleteId) {
      try {
        await deleteRate({ id: deleteId, pspId })
        toast({ title: t('transfers.toast.rateDeleted'), variant: 'success' })
      } catch (error) {
        toast({
          title: (error as Error).message || t('transfers.toast.error'),
          variant: 'error',
        })
      }
    }
  }

  const handleDeleteClick = (rateId: string) => {
    const nonFutureRates = rates.filter((r) => r.effective_from <= todayStr)
    const targetFrom = rates.find((r) => r.id === rateId)?.effective_from ?? ''
    const isNonFuture = targetFrom <= todayStr
    if (isNonFuture && nonFutureRates.length <= 1) {
      toast({
        title: t('transfers.settings.lastRateWarning'),
        variant: 'error',
      })
      return
    }
    setPendingDeleteRateId(rateId)
    setPendingAdd(null)
    setHistoryPinOpen(true)
  }

  const currentRateId = rates.find((r) => r.effective_from <= todayStr)?.id

  // Delete PSP
  const [deletePspDialogOpen, setDeletePspDialogOpen] = useState(false)
  const [deletePinOpen, setDeletePinOpen] = useState(false)

  const handleDeletePspClick = () => {
    setDeletePspDialogOpen(true)
  }

  const handleDeletePspConfirm = () => {
    setDeletePspDialogOpen(false)
    setDeletePinOpen(true)
  }

  const handleDeletePinConfirm = async () => {
    setDeletePinOpen(false)
    try {
      await pspMutation.deleteItem(pspId)
      toast({ title: t('psps.toast.pspDeleted'), variant: 'success' })
      navigate('/psps')
    } catch (error) {
      toast({
        title: (error as Error).message || t('psps.toast.error'),
        variant: 'error',
      })
    }
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Status */}
      <Card padding="spacious" className="border border-black/5 bg-bg1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t('psps.settings.status')}</h3>
            <p className="mt-1 text-xs text-black/40">{t('psps.settings.statusDesc')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Tag variant={isActive ? 'green' : 'red'}>
              {isActive ? t('psps.card.active') : t('psps.card.inactive')}
            </Tag>
            <button
              type="button"
              onClick={handleStatusToggle}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isActive ? 'bg-green-500' : 'bg-black/15'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow transition-transform ${
                  isActive ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Internal Account */}
      <Card padding="spacious" className="border border-black/5 bg-bg1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t('psps.settings.internal')}</h3>
            <p className="mt-1 text-xs text-black/40">{t('psps.settings.internalDesc')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Tag variant={isInternal ? 'blue' : 'default'}>
              {isInternal ? t('psps.settings.internalTag') : t('psps.settings.externalTag')}
            </Tag>
            <button
              type="button"
              onClick={handleInternalToggle}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isInternal ? 'bg-blue' : 'bg-black/15'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow transition-transform ${
                  isInternal ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Currency */}
      <Card padding="spacious" className="border border-black/5 bg-bg1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t('psps.settings.currency')}</h3>
            <p className="mt-1 text-xs text-black/40">{t('psps.settings.currencyDesc')}</p>
          </div>
          <Select value={currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger selectSize="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TL">TL</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="USDT">USDT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Commission Rate */}
      <Card
        padding="spacious"
        className={`border border-black/5 bg-bg1 ${isInternal ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">{t('psps.settings.commissionRate')}</h3>
            <p className="mt-1 text-xs text-black/40">{t('psps.settings.commissionRateDesc')}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-black/[0.03] px-3 py-2">
              <span className="text-xs text-black/50">{t('psps.settings.current')}</span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {(currentRate * 100).toFixed(1)}%
              </span>
            </div>

            <Separator orientation="vertical" className="h-8" />

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="99.99"
                step="0.1"
                placeholder="%"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="w-24"
                inputSize="sm"
              />
              <Button
                size="sm"
                onClick={handleRateSave}
                disabled={pspMutation.isUpdating || !newRate || isNaN(parseFloat(newRate))}
              >
                {pspMutation.isUpdating ? <SpinnerGap size={14} className="animate-spin" /> : null}
                {t('psps.settings.updateRate')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Effective-From Rate History (optional, hidden for internal PSPs) */}
      {!isInternal && (
        <Card padding="spacious" className="border border-black/5 bg-bg1">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{t('psps.settings.effectiveFromTitle')}</h3>
                <p className="mt-1 text-xs text-black/40">{t('psps.settings.effectiveFromDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(!historyOpen)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  historyOpen ? 'bg-blue' : 'bg-black/15'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow transition-transform ${
                    historyOpen ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {historyOpen && (
              <>
                {/* Add rate form */}
                <div className="flex items-end gap-2 border-t border-black/5 pt-4">
                  <div className="flex-1">
                    <Label className="mb-1 text-xs font-medium">
                      {t('transfers.settings.effectiveFrom')}
                    </Label>
                    <DatePickerField
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                    />
                  </div>
                  <div className="w-28">
                    <Label className="mb-1 text-xs font-medium">
                      {t('transfers.settings.commissionRate')}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="99.99"
                      step="0.1"
                      placeholder="%"
                      value={ratePercent}
                      onChange={(e) => setRatePercent(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddClick}
                    disabled={isCreating || !effectiveFrom || !ratePercent}
                  >
                    {isCreating ? (
                      <SpinnerGap size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} weight="bold" />
                    )}
                    {t('transfers.settings.addRate')}
                  </Button>
                </div>

                {/* Rate history table */}
                {ratesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded" />
                    ))}
                  </div>
                ) : rates.length === 0 ? (
                  <p className="py-6 text-center text-sm text-black/40">
                    {t('transfers.settings.noRateHistory')}
                  </p>
                ) : (
                  <div className="rounded-lg border border-black/10">
                    <Table cardOnMobile>
                      <TableHeader>
                        <TableRow className="bg-black/[0.02]">
                          <TableHead>{t('transfers.settings.effectiveFrom')}</TableHead>
                          <TableHead>{t('transfers.settings.commissionRate')}</TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rates.map((rate) => {
                          const isCurrent = rate.id === currentRateId
                          const isFuture = rate.effective_from > todayStr

                          return (
                            <TableRow key={rate.id}>
                              <TableCell data-label={t('transfers.settings.effectiveFrom')}>
                                <span className="font-mono text-sm tabular-nums">
                                  {rate.effective_from}
                                </span>
                              </TableCell>
                              <TableCell data-label={t('transfers.settings.commissionRate')}>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm tabular-nums">
                                    {(rate.commission_rate * 100).toFixed(1)}%
                                  </span>
                                  {isCurrent && (
                                    <Tag variant="green">{t('transfers.settings.currentRate')}</Tag>
                                  )}
                                  {isFuture && (
                                    <Tag variant="blue">{t('transfers.settings.futureRate')}</Tag>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell isActions>
                                <Button
                                  variant="borderless"
                                  size="sm"
                                  className="text-red"
                                  onClick={() => handleDeleteClick(rate.id)}
                                  disabled={isDeleting}
                                >
                                  <Trash size={14} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {/* Danger Zone - Delete PSP */}
      <Card padding="spacious" className="border border-red/20 bg-red/5">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-red">{t('psps.settings.dangerZone')}</h3>
            <p className="mt-1 text-xs text-red/50">{t('psps.settings.dangerZoneDesc')}</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-red/15 bg-bg1 p-3">
            <div>
              <p className="text-sm font-medium text-black">{t('psps.settings.deletePsp')}</p>
              <p className="mt-0.5 text-xs text-black/50">
                {t('psps.deletePsp.description', { name: pspName })}
              </p>
            </div>
            <Button
              variant="filled"
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeletePspClick}
              disabled={pspMutation.isDeleting}
            >
              <Trash size={14} weight="bold" className="mr-1.5" />
              {t('psps.settings.deletePsp')}
            </Button>
          </div>
        </div>
      </Card>

      <ManagerPinDialog
        open={statusPinOpen}
        onClose={() => {
          setStatusPinOpen(false)
          setPendingStatus(null)
        }}
        onConfirm={handleStatusPinConfirm}
      />

      <ManagerPinDialog
        open={internalPinOpen}
        onClose={() => {
          setInternalPinOpen(false)
          setPendingInternal(null)
        }}
        onConfirm={handleInternalPinConfirm}
      />

      <ManagerPinDialog
        open={ratePinOpen}
        onClose={() => setRatePinOpen(false)}
        onConfirm={handleRatePinConfirm}
      />

      <ManagerPinDialog
        open={historyPinOpen}
        onClose={() => {
          setHistoryPinOpen(false)
          setPendingAdd(null)
          setPendingDeleteRateId(null)
        }}
        onConfirm={handleHistoryPinConfirm}
      />

      <ManagerPinDialog
        open={deletePinOpen}
        onClose={() => setDeletePinOpen(false)}
        onConfirm={handleDeletePinConfirm}
      />

      <DeletePspDialog
        open={deletePspDialogOpen}
        onClose={() => setDeletePspDialogOpen(false)}
        onConfirm={handleDeletePspConfirm}
        isDeleting={pspMutation.isDeleting}
        pspName={pspName}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PSP Detail Page                                                    */
/* ------------------------------------------------------------------ */

type PspLedgerSortKey =
  | 'date'
  | 'deposit'
  | 'withdrawal'
  | 'total'
  | 'commission'
  | 'net'
  | 'settlement'
  | 'kasaTop'
  | 'devir'

export function PspDetailPage() {
  const { pspId } = useParams<{ pspId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('pages')
  const [activeTab, setActiveTab] = useState('ledger')
  const [ledgerDateFrom, setLedgerDateFrom] = useState<string | null>(null)
  const [ledgerDateTo, setLedgerDateTo] = useState<string | null>(null)
  const [ledgerSortBy, setLedgerSortBy] = useState<PspLedgerSortKey>('date')
  const [ledgerSortDir, setLedgerSortDir] = useState<'asc' | 'desc'>('desc')
  const { locale } = useLocale()
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const isAdmin = isGod || membership?.role === 'admin' || membership?.role === 'manager'

  const { psps, isLoading } = usePspDashboardQuery()
  const psp = psps.find((p) => p.psp_id === pspId)
  const isUniPayment = psp?.provider === 'unipayment'

  // Set default tab to 'wallet' for UniPayment PSPs
  useEffect(() => {
    if (psp && isUniPayment && activeTab === 'ledger') {
      setActiveTab('wallet')
    }
  }, [psp, isUniPayment]) // eslint-disable-line react-hooks/exhaustive-deps

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
            {t('psps.detail.notFoundDesc', 'The PSP you are looking for does not exist.')}
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
      <Card padding="none" className="overflow-hidden border border-black/5 bg-bg1">
        <div className="flex">
          {/* Left accent stripe — blue for internal, balance-based for external */}
          <div
            className={`w-1 shrink-0 ${
              psp.is_internal
                ? 'bg-blue-400'
                : psp.balance > 0
                  ? 'bg-amber-400'
                  : psp.balance < 0
                    ? 'bg-red-400'
                    : 'bg-green-400'
            }`}
          />
          <div className="flex flex-1 items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4">
              <div
                className={`flex size-12 items-center justify-center rounded-xl ${
                  psp.is_internal ? 'bg-blue-50' : 'bg-black/5'
                }`}
              >
                <CreditCard
                  size={22}
                  className={psp.is_internal ? 'text-blue-400' : 'text-black/40'}
                />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-semibold">{psp.psp_name}</h1>
                  <Tag variant={psp.is_active ? 'green' : 'red'} className="text-[11px]">
                    {psp.is_active ? t('psps.card.active') : t('psps.card.inactive')}
                  </Tag>
                  {psp.is_internal && (
                    <Tag variant="blue" className="text-[11px]">
                      {t('psps.settings.internalTag')}
                    </Tag>
                  )}
                  {psp.psp_scope === 'global' && (
                    <Tag variant="cyan" className="text-[11px]">
                      Global
                    </Tag>
                  )}
                  {psp.provider && (
                    <Tag variant="blue" className="text-[11px]">
                      {psp.provider === 'unipayment' ? 'UniPayment' : psp.provider}
                    </Tag>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3">
                  {!isUniPayment && (
                    <span className="text-xs text-black/50">
                      {t('psps.card.commission')}:{' '}
                      <span className="font-semibold text-black/70">
                        {(psp.commission_rate * 100).toFixed(1)}%
                      </span>
                    </span>
                  )}
                  {psp.last_settlement_date && (
                    <>
                      <span className="text-black/20">·</span>
                      <span className="text-xs text-black/40">
                        {t('psps.card.lastSettlement')}: {formatDate(psp.last_settlement_date)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div
        className={`grid grid-cols-2 gap-3 ${psp.is_internal ? 'lg:grid-cols-3' : 'lg:grid-cols-5'}`}
      >
        {!psp.is_internal && (
          <StatCard
            icon={Coins}
            iconBg={
              psp.balance > 0 ? 'bg-amber-100' : psp.balance < 0 ? 'bg-red-100' : 'bg-green-100'
            }
            iconColor={
              psp.balance > 0
                ? 'text-amber-600'
                : psp.balance < 0
                  ? 'text-red-600'
                  : 'text-green-600'
            }
            label={t('psps.stats.outstanding')}
            value={formatCurrency(psp.balance)}
          />
        )}
        {!psp.is_internal && (
          <StatCard
            icon={ArrowDown}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            label={t('psps.stats.settlements')}
            value={formatCurrency(psp.total_settlements)}
          />
        )}
        <StatCard
          icon={ArrowUp}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label={t('psps.stats.deposits')}
          value={formatCurrency(psp.total_deposits)}
        />
        {!psp.is_internal && (
          <StatCard
            icon={CreditCard}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            label={t('psps.stats.commission')}
            value={formatCurrency(psp.total_commission)}
          />
        )}
        <StatCard
          icon={ArrowDown}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          label={t('psps.detail.withdrawals', 'Withdrawals')}
          value={formatCurrency(psp.total_withdrawals)}
        />
      </div>

      {/* Tabs: Ledger + Settlements */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList>
            {isUniPayment && (
              <>
                <TabsTrigger value="wallet">{t('psps.detail.tabs.wallet', 'Wallet')}</TabsTrigger>
                <TabsTrigger value="up-transactions">{t('psps.detail.tabs.upTransactions', 'Transactions')}</TabsTrigger>
                <TabsTrigger value="invoices">{t('psps.detail.tabs.invoices', 'Invoices')}</TabsTrigger>
                <TabsTrigger value="up-payments">{t('psps.detail.tabs.upPayments', 'Payments')}</TabsTrigger>
              </>
            )}
            <TabsTrigger value="ledger">{t('psps.detail.tabs.ledger', 'Ledger')}</TabsTrigger>
            {!psp.is_internal && !isUniPayment && (
              <TabsTrigger value="settlements">
                {t('psps.detail.tabs.settlements', 'Settlements')}
              </TabsTrigger>
            )}
            {!isUniPayment && (
              <TabsTrigger value="monthly">{t('psps.detail.tabs.monthly', 'Monthly')}</TabsTrigger>
            )}
            {!isUniPayment && (
              <TabsTrigger value="bloke">{t('psps.detail.tabs.bloke', 'Bloke')}</TabsTrigger>
            )}
            {isUniPayment && (
              <TabsTrigger value="sync">{t('psps.detail.tabs.sync', 'Sync')}</TabsTrigger>
            )}
            <TabsTrigger value="settings">{t('psps.detail.tabs.settings', 'Settings')}</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {activeTab === 'ledger' && psp && (
              <>
                <DatePicker
                  dateFrom={ledgerDateFrom}
                  dateTo={ledgerDateTo}
                  onChange={(from, to) => {
                    setLedgerDateFrom(from)
                    setLedgerDateTo(to)
                  }}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 min-w-[10rem] items-center gap-2 rounded-lg border border-black/10 bg-bg1 px-3 text-left text-xs font-medium transition-colors hover:border-black/20 hover:bg-black/[0.02]"
                    >
                      <SortIcon size={14} className="text-black/40" />
                      <span className="flex-1 truncate">
                        {t('psps.ledger.sortBy', 'Sort by')}:{' '}
                        {t(`psps.ledger.sort.${ledgerSortBy}`)}
                      </span>
                      <CaretDown size={12} className="text-black/40" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[11rem]">
                    {(
                      [
                        'date',
                        'deposit',
                        'withdrawal',
                        'total',
                        'commission',
                        'net',
                        'settlement',
                        'kasaTop',
                        'devir',
                      ] as const
                    ).map((key) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => {
                          setLedgerSortBy(key)
                          setLedgerSortDir((d) =>
                            ledgerSortBy === key ? (d === 'asc' ? 'desc' : 'asc') : 'desc',
                          )
                        }}
                      >
                        {t(`psps.ledger.sort.${key}`)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {/* UniPayment-specific tabs */}
        {isUniPayment && (
          <>
            <TabsContent value="wallet">
              <UniPaymentWalletTab pspId={pspId!} />
            </TabsContent>
            <TabsContent value="up-transactions">
              <UniPaymentTransactionsTab pspId={pspId!} />
            </TabsContent>
            <TabsContent value="invoices">
              <UniPaymentInvoicesTab pspId={pspId!} isAdmin={isAdmin} />
            </TabsContent>
            <TabsContent value="up-payments">
              <UniPaymentPaymentsTab pspId={pspId!} isAdmin={isAdmin} />
            </TabsContent>
          </>
        )}

        <TabsContent value="ledger">
          <LedgerTab
            pspId={pspId!}
            currency={psp.currency ?? 'TL'}
            dateFrom={ledgerDateFrom}
            dateTo={ledgerDateTo}
            sortBy={ledgerSortBy}
            sortDir={ledgerSortDir}
            isAdmin={isAdmin}
          />
        </TabsContent>

        {!psp.is_internal && !isUniPayment && (
          <TabsContent value="settlements">
            <SettlementsTab pspId={pspId!} isAdmin={isAdmin} />
          </TabsContent>
        )}

        {!isUniPayment && (
          <TabsContent value="monthly">
            <MonthlyTab pspId={pspId!} pspName={psp.psp_name} currency={psp.currency ?? 'TL'} />
          </TabsContent>
        )}

        {!isUniPayment && (
          <TabsContent value="bloke">
            <BlokeTab pspId={pspId!} isAdmin={isAdmin} />
          </TabsContent>
        )}

        {isUniPayment && (
          <TabsContent value="sync">
            <UniPaymentSyncTab pspId={pspId!} isAdmin={isAdmin} />
          </TabsContent>
        )}

        <TabsContent value="settings">
          <SettingsTab
            pspId={pspId!}
            pspName={psp.psp_name}
            currentRate={psp.commission_rate}
            isActive={psp.is_active}
            isInternal={psp.is_internal}
            currency={psp.currency ?? 'TL'}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
