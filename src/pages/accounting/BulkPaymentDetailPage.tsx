import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Trash, PencilSimple, Check, X, Warning } from '@phosphor-icons/react'
import {
  Button,
  Tag,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  PageHeader,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  EmptyState,
  Input,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useBulkPaymentDetailQuery,
  useBulkPaymentItemMutations,
  type BulkPaymentItemWithEmployee,
} from '@/hooks/queries/useHrQuery'

/* ── Helpers ─────────────────────────────────────────── */

function formatNumber(n: number) {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const BATCH_TYPE_LABELS: Record<string, { tr: string; en: string; variant: 'blue' | 'green' | 'purple' }> = {
  salary: { tr: 'Maaş', en: 'Salary', variant: 'blue' },
  bonus: { tr: 'Prim', en: 'Bonus', variant: 'green' },
  bank_deposit: { tr: 'Banka Yatırımı', en: 'Bank Deposit', variant: 'purple' },
}

/* ── Main Component ──────────────────────────────────── */

export function BulkPaymentDetailPage() {
  const { bulkPaymentId } = useParams<{ bulkPaymentId: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language === 'tr' ? 'tr' : 'en'
  const toast = useToast()

  const { data, isLoading, error } = useBulkPaymentDetailQuery(bulkPaymentId ?? '')
  const { updateItem, deleteItem, deleteBulkPayment } = useBulkPaymentItemMutations(bulkPaymentId ?? '')

  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deleteItemTarget, setDeleteItemTarget] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState('')

  if (!bulkPaymentId) {
    navigate('/accounting', { replace: true })
    return null
  }

  if (isLoading) {
    return (
      <div className="space-y-lg">
        <PageHeader
          title={<Skeleton className="h-7 w-64" />}
          actions={<Skeleton className="h-9 w-24" />}
        />
        <div className="space-y-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-lg">
        <PageHeader
          title={t('accounting.bulk.detailTitle', 'Toplu Ödeme Detayı')}
          actions={
            <Button variant="ghost" onClick={() => navigate('/accounting')}>
              <ArrowLeft size={16} />
              {lang === 'tr' ? 'Geri' : 'Back'}
            </Button>
          }
        />
        <EmptyState
          icon={Warning}
          title={lang === 'tr' ? 'Kayıt bulunamadı' : 'Record not found'}
          description={lang === 'tr' ? 'Bu toplu ödeme kaydı bulunamadı.' : 'This bulk payment record was not found.'}
        />
      </div>
    )
  }

  const { bulkPayment: bp, items } = data
  const typeInfo = BATCH_TYPE_LABELS[bp.batch_type] ?? BATCH_TYPE_LABELS.salary
  const isSalary = bp.batch_type === 'salary'

  const handleStartEdit = (item: BulkPaymentItemWithEmployee) => {
    setEditingItemId(item.id)
    setEditingAmount(String(item.amount))
  }

  const handleSaveEdit = async () => {
    if (!editingItemId) return
    const newAmount = parseFloat(editingAmount)
    if (isNaN(newAmount) || newAmount < 0) return

    try {
      await updateItem.mutateAsync({ itemId: editingItemId, amount: newAmount })
      toast.success(lang === 'tr' ? 'Tutar güncellendi' : 'Amount updated')
    } catch {
      toast.error(lang === 'tr' ? 'Güncelleme başarısız' : 'Update failed')
    }
    setEditingItemId(null)
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
    setEditingAmount('')
  }

  const handleDeleteItem = async () => {
    if (!deleteItemTarget) return
    try {
      await deleteItem.mutateAsync(deleteItemTarget)
      toast.success(lang === 'tr' ? 'Kalem silindi' : 'Item deleted')

      // If no items left, navigate back
      if (items.length <= 1) {
        navigate('/accounting', { replace: true })
      }
    } catch {
      toast.error(lang === 'tr' ? 'Silme başarısız' : 'Delete failed')
    }
    setDeleteItemTarget(null)
  }

  const handleDeleteAll = async () => {
    try {
      await deleteBulkPayment.mutateAsync()
      toast.success(lang === 'tr' ? 'Toplu ödeme silindi' : 'Bulk payment deleted')
      navigate('/accounting', { replace: true })
    } catch {
      toast.error(lang === 'tr' ? 'Silme başarısız' : 'Delete failed')
    }
    setDeleteAllOpen(false)
  }

  const paidDate = new Date(bp.paid_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-lg">
      {/* Header */}
      <PageHeader
        title={t('accounting.bulk.detailTitle', 'Toplu Ödeme Detayı')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/accounting')}>
              <ArrowLeft size={16} />
              {lang === 'tr' ? 'Geri' : 'Back'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteAllOpen(true)}
              disabled={deleteBulkPayment.isPending}
            >
              <Trash size={16} />
              {t('accounting.bulk.deleteAll', 'Tümünü Sil')}
            </Button>
          </div>
        }
      />

      {/* Summary Card */}
      <div className="rounded-xl border border-black/10 bg-bg1 p-card">
        <div className="flex flex-wrap items-center gap-4">
          <Tag variant={typeInfo.variant}>{typeInfo[lang as 'tr' | 'en']}</Tag>
          <div className="text-sm text-black/60">
            <span className="font-medium text-black/90">{bp.period}</span>
            <span className="mx-2">·</span>
            {paidDate}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-black/40">{t('accounting.bulk.totalAmount', 'Toplam Tutar')}</div>
              <div className="font-mono text-lg font-semibold tabular-nums text-red">
                -{formatNumber(bp.total_amount)} {bp.currency}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-black/40">{t('accounting.bulk.itemCount', 'Kalem Sayısı')}</div>
              <div className="text-lg font-semibold">{bp.item_count}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      {items.length === 0 ? (
        <EmptyState
          icon={Warning}
          title={t('accounting.bulk.noItems', 'Bu toplu ödemede kalem bulunmuyor.')}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/10 bg-bg1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('accounting.bulk.employee', 'Çalışan')}</TableHead>
                <TableHead>{t('accounting.bulk.description', 'Açıklama')}</TableHead>
                <TableHead className="text-right">{t('accounting.bulk.amount', 'Tutar')}</TableHead>
                <TableHead>{lang === 'tr' ? 'Para Birimi' : 'Currency'}</TableHead>
                {isSalary && (
                  <TableHead className="text-right">{t('accounting.bulk.deductions', 'Kesintiler')}</TableHead>
                )}
                <TableHead className="w-24 px-2" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-black/[0.04]">
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-black/[0.015]">
                  <TableCell className="whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-black/90">{item.employee_name}</div>
                      <div className="text-xs text-black/40">{item.employee_role}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-black/60">{item.description}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {editingItemId === item.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          value={editingAmount}
                          onChange={(e) => setEditingAmount(e.target.value)}
                          className="w-28 text-right"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                        />
                        <Button
                          variant="ghost"
                          className="size-7 p-0 text-green"
                          onClick={handleSaveEdit}
                          disabled={updateItem.isPending}
                        >
                          <Check size={14} weight="bold" />
                        </Button>
                        <Button variant="ghost" className="size-7 p-0" onClick={handleCancelEdit}>
                          <X size={14} weight="bold" />
                        </Button>
                      </div>
                    ) : (
                      <span className="font-mono text-sm font-medium tabular-nums text-red">
                        -{formatNumber(item.amount)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Tag variant="default">{item.currency}</Tag>
                  </TableCell>
                  {isSalary && (
                    <TableCell className="whitespace-nowrap text-right text-sm text-black/50">
                      {(item.attendance_deduction ?? 0) > 0 || (item.unpaid_leave_deduction ?? 0) > 0 ? (
                        <div className="space-y-0.5">
                          {(item.attendance_deduction ?? 0) > 0 && (
                            <div>{lang === 'tr' ? 'Devamsızlık' : 'Absence'}: -{formatNumber(item.attendance_deduction!)}</div>
                          )}
                          {(item.unpaid_leave_deduction ?? 0) > 0 && (
                            <div>{lang === 'tr' ? 'Ücretsiz İzin' : 'Unpaid Leave'}: -{formatNumber(item.unpaid_leave_deduction!)}</div>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap px-2">
                    <div className="flex items-center gap-1">
                      {editingItemId !== item.id && (
                        <Button
                          variant="ghost"
                          className="size-7 p-0 text-black/40 hover:text-black/70"
                          onClick={() => handleStartEdit(item)}
                        >
                          <PencilSimple size={14} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="size-7 p-0 text-black/40 hover:text-red"
                        onClick={() => setDeleteItemTarget(item.id)}
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals Row */}
              <TableRow className="bg-black/[0.02] font-medium">
                <TableCell colSpan={2} className="text-sm text-black/60">
                  {lang === 'tr' ? 'Toplam' : 'Total'} ({items.length} {lang === 'tr' ? 'kalem' : 'items'})
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <span className="font-mono text-sm font-semibold tabular-nums text-red">
                    -{formatNumber(items.reduce((sum, i) => sum + i.amount, 0))}
                  </span>
                </TableCell>
                <TableCell>
                  <Tag variant="default">{bp.currency}</Tag>
                </TableCell>
                {isSalary && <TableCell />}
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete All Dialog */}
      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent size="sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t('accounting.bulk.deleteAll', 'Tümünü Sil')}</DialogTitle>
            <DialogDescription>
              {t(
                'accounting.bulk.deleteAllConfirm',
                'Bu toplu ödeme ve tüm alt kalemleri silinecek. Bu işlem geri alınamaz.',
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAllOpen(false)}>
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={deleteBulkPayment.isPending}
            >
              <Trash size={14} />
              {lang === 'tr' ? 'Evet, Sil' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <Dialog open={!!deleteItemTarget} onOpenChange={() => setDeleteItemTarget(null)}>
        <DialogContent size="sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t('accounting.bulk.deleteItem', 'Kalemi Sil')}</DialogTitle>
            <DialogDescription>
              {t(
                'accounting.bulk.deleteItemConfirm',
                'Bu kalem silinecek ve toplam tutar güncellenecek.',
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItemTarget(null)}>
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteItem}
              disabled={deleteItem.isPending}
            >
              <Trash size={14} />
              {lang === 'tr' ? 'Evet, Sil' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
