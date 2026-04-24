import { useState, useMemo, useEffect, useCallback } from 'react'
import { SpinnerGap, CheckCircle, Warning, UserCirclePlus } from '@phosphor-icons/react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Button,
  EmptyState,
} from '@ds'
import { useTransferFix } from '@/hooks/queries/useTransferFix'
import { buildEmployeeAssignments } from './comparisons'
import type { ParsedCsvData, EmployeeAssignment } from './types'

interface StepEmployeeAssignProps {
  data: ParsedCsvData
  onBack: () => void
  onReset: () => void
}

export function StepEmployeeAssign({ data, onBack, onReset }: StepEmployeeAssignProps) {
  const { fetchSystemTransfers, fetchHrEmployees, applyEmployeeAssignments } = useTransferFix()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([])
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [progressDone, setProgressDone] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [progressFailed, setProgressFailed] = useState(0)

  // Determine date range from KASA rows
  const dateRange = useMemo(() => {
    let min = '9999-12-31'
    let max = '0000-01-01'
    for (const row of data.kasa) {
      const d = row.dateRaw
      // parseTurkishDate imported indirectly via buildEmployeeAssignments
      if (d && d < min) min = d
      if (d && d > max) max = d
    }
    // Fallback: use period
    if (min > max) {
      min = `${data.period.year}-${String(data.period.month).padStart(2, '0')}-01`
      const lastDay = new Date(data.period.year, data.period.month, 0).getDate()
      max = `${data.period.year}-${String(data.period.month).padStart(2, '0')}-${lastDay}`
    }
    return { from: min, to: max }
  }, [data])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [systemTransfers, hrEmployees] = await Promise.all([
        fetchSystemTransfers(dateRange.from, dateRange.to),
        fetchHrEmployees(),
      ])
      const result = buildEmployeeAssignments(
        systemTransfers,
        data.orderSatis,
        data.ordRetDeposit,
        data.ordWithdrawal,
        hrEmployees,
      )
      setAssignments(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yükleme hatası')
    } finally {
      setLoading(false)
    }
  }, [fetchSystemTransfers, fetchHrEmployees, dateRange, data])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleSelection = (index: number) => {
    setAssignments((prev) =>
      prev.map((a, i) => (i === index ? { ...a, selected: !a.selected } : a)),
    )
  }

  const selectAll = () => {
    setAssignments((prev) => prev.map((a) => (a.resolvedEmployeeId ? { ...a, selected: true } : a)))
  }

  const deselectAll = () => {
    setAssignments((prev) => prev.map((a) => ({ ...a, selected: false })))
  }

  const counts = useMemo(() => {
    const resolved = assignments.filter((a) => a.resolvedEmployeeId).length
    const unresolved = assignments.filter((a) => !a.resolvedEmployeeId).length
    const selected = assignments.filter((a) => a.selected && a.resolvedEmployeeId).length
    return { resolved, unresolved, selected, total: assignments.length }
  }, [assignments])

  const handleApply = useCallback(async () => {
    setPhase('running')
    setProgressDone(0)
    setProgressFailed(0)
    setProgressTotal(counts.selected)
    try {
      const result = await applyEmployeeAssignments(assignments, (done, total, failed) => {
        setProgressDone(done)
        setProgressTotal(total)
        setProgressFailed(failed)
      })
      setPhase(result.failed > 0 ? 'error' : 'done')
    } catch (err) {
      setPhase('error')
      setError(err instanceof Error ? err.message : 'Atama hatası')
    }
  }, [applyEmployeeAssignments, assignments, counts.selected])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <SpinnerGap className="h-8 w-8 animate-spin text-muted" />
          <p className="text-sm text-muted">Sistem transferleri ve HR verileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error && phase === 'idle') {
    return (
      <div className="space-y-lg">
        <div className="flex flex-col items-center gap-3 py-lg">
          <Warning className="h-8 w-8 text-red-500" weight="duotone" />
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="gray" onClick={loadData}>
            Tekrar Dene
          </Button>
        </div>
        <div className="flex justify-start">
          <Button variant="gray" onClick={onBack}>
            Geri
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-md">
        <StatBox label="Toplam Eşleşme" count={counts.total} color="blue" />
        <StatBox label="HR Eşleşen" count={counts.resolved} color="green" />
        <StatBox label="HR Bulunamayan" count={counts.unresolved} color="orange" />
        <StatBox label="Seçilen" count={counts.selected} color="blue" />
      </div>

      {/* Bulk actions */}
      {phase === 'idle' && counts.total > 0 && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={selectAll}>
            Tümünü Seç ({counts.resolved})
          </Button>
          <Button variant="outline" onClick={deselectAll}>
            Seçimi Kaldır
          </Button>
        </div>
      )}

      {/* Progress */}
      {phase !== 'idle' && (
        <div className="rounded-xl border p-lg space-y-md">
          <div className="flex items-center gap-3">
            {phase === 'running' && <SpinnerGap className="h-6 w-6 animate-spin text-brand" />}
            {phase === 'done' && (
              <CheckCircle className="h-6 w-6 text-green-500" weight="duotone" />
            )}
            {phase === 'error' && <Warning className="h-6 w-6 text-red-500" weight="duotone" />}
            <div>
              <p className="text-sm font-semibold text-primary">
                {phase === 'running' && 'Çalışan ataması yapılıyor...'}
                {phase === 'done' && 'Atama tamamlandı!'}
                {phase === 'error' && 'Atama tamamlandı (hatalar var)'}
              </p>
              <p className="text-xs text-muted">
                {progressDone} / {progressTotal} transfer
                {progressFailed > 0 && ` (${progressFailed} hata)`}
              </p>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{
                width: `${progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      {assignments.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="Atama Gerekmiyor"
          description="Tüm transferlerin çalışan ataması zaten güncel."
        />
      ) : phase === 'idle' ? (
        <div className="rounded-xl border bg-bg1 overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>META ID</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Para Birimi</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>CSV Kaynak</TableHead>
                <TableHead>CSV Çalışan</TableHead>
                <TableHead>CSV Yönetici</TableHead>
                <TableHead>HR Eşleşme</TableHead>
                <TableHead>Mevcut Atama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a, i) => (
                <AssignmentRow
                  key={a.transferId}
                  assignment={a}
                  onToggle={() => toggleSelection(i)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="gray" onClick={onBack} disabled={phase === 'running'}>
          Geri
        </Button>
        <div className="flex gap-2">
          {phase === 'idle' && counts.selected > 0 && (
            <Button variant="filled" onClick={handleApply}>
              <UserCirclePlus className="h-4 w-4" />
              Çalışan Ata ({counts.selected} transfer)
            </Button>
          )}
          {(phase === 'done' || phase === 'error') && (
            <Button variant="filled" onClick={onReset}>
              Başa Dön
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBox({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: 'green' | 'orange' | 'blue'
}) {
  const colors = {
    green: 'border-green-300 dark:border-green-700',
    orange: 'border-orange-300 dark:border-orange-700',
    blue: 'border-blue-300 dark:border-blue-700',
  }
  return (
    <div className={`rounded-xl border p-md ${colors[color]}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold text-primary">{count}</p>
    </div>
  )
}

const CSV_SOURCE_LABELS: Record<string, string> = {
  'order-satis': 'ORDER SATIS',
  'ord-ret-deposit': 'RET DEPOSIT',
  'ord-withdrawal': 'WITHDRAWAL',
}

function AssignmentRow({
  assignment: a,
  onToggle,
}: {
  assignment: EmployeeAssignment
  onToggle: () => void
}) {
  const canSelect = a.resolvedEmployeeId != null

  return (
    <TableRow className={a.selected ? 'bg-blue-50/50 dark:bg-blue-900/5' : ''}>
      <TableCell>
        <input
          type="checkbox"
          checked={a.selected}
          disabled={!canSelect}
          onChange={onToggle}
          className="h-4 w-4 rounded border-border"
        />
      </TableCell>
      <TableCell className="font-mono text-xs">{a.metaId || '-'}</TableCell>
      <TableCell className="text-sm">{a.fullName}</TableCell>
      <TableCell className="text-sm">{a.transferDate}</TableCell>
      <TableCell className="text-sm font-medium">{a.currency}</TableCell>
      <TableCell className="text-right font-mono text-sm">
        {Math.abs(a.amount).toLocaleString('tr-TR')}
      </TableCell>
      <TableCell>
        <Tag
          variant={
            a.csvSource === 'order-satis'
              ? 'blue'
              : a.csvSource === 'ord-ret-deposit'
                ? 'purple'
                : 'orange'
          }
        >
          {CSV_SOURCE_LABELS[a.csvSource] || a.csvSource}
        </Tag>
      </TableCell>
      <TableCell className="text-sm font-medium">{a.csvEmployeeName}</TableCell>
      <TableCell className="text-sm text-muted">{a.csvManagerName || '-'}</TableCell>
      <TableCell className="text-sm">
        {a.resolvedEmployeeId ? (
          <Tag variant="green">{a.resolvedEmployeeName}</Tag>
        ) : (
          <Tag variant="red">Bulunamadı</Tag>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted">{a.currentEmployeeId ? 'Var' : '-'}</TableCell>
    </TableRow>
  )
}
