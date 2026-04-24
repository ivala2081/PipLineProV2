import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  SpinnerGap,
  CheckCircle,
  Warning,
  ArrowsClockwise,
  Trash,
  Plus,
} from '@phosphor-icons/react'
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
import { parseTurkishDate, parseTurkishDecimal } from '@/lib/csvImport/parseCsv'
import { useTransferFix } from '@/hooks/queries/useTransferFix'
import { compareKasaToSystem, buildCsvEnrichmentMap } from './comparisons'
import type { SystemDiscrepancy, FixAction, ParsedCsvData } from './types'

interface StepSystemCompareProps {
  data: ParsedCsvData
  onNext: (discrepancies: SystemDiscrepancy[]) => void
  onBack: () => void
}

export function StepSystemCompare({ data, onNext, onBack }: StepSystemCompareProps) {
  const { fetchSystemTransfers } = useTransferFix()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [discrepancies, setDiscrepancies] = useState<SystemDiscrepancy[]>([])

  // Determine date range from KASA rows
  const dateRange = useMemo(() => {
    let min = '9999-12-31'
    let max = '0000-01-01'
    for (const row of data.kasa) {
      const d = parseTurkishDate(row.dateRaw)
      if (d && d < min) min = d
      if (d && d > max) max = d
    }
    return { from: min, to: max }
  }, [data.kasa])

  const runComparison = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const systemTransfers = await fetchSystemTransfers(dateRange.from, dateRange.to)
      const csvEnrichment = buildCsvEnrichmentMap(
        data.orderSatis,
        data.ordRetDeposit,
        data.ordWithdrawal,
      )
      const results = compareKasaToSystem(data.kasa, systemTransfers, csvEnrichment)
      setDiscrepancies(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Karşılaştırma hatası')
    } finally {
      setLoading(false)
    }
  }, [fetchSystemTransfers, dateRange, data.kasa])

  useEffect(() => {
    runComparison()
  }, [runComparison])

  const updateAction = (index: number, action: FixAction) => {
    setDiscrepancies((prev) => prev.map((d, i) => (i === index ? { ...d, action } : d)))
  }

  const setAllAction = (type: SystemDiscrepancy['type'], action: FixAction) => {
    setDiscrepancies((prev) => prev.map((d) => (d.type === type ? { ...d, action } : d)))
  }

  const counts = useMemo(() => {
    const missingInSystem = discrepancies.filter((d) => d.type === 'missing-in-system').length
    const missingInKasa = discrepancies.filter((d) => d.type === 'missing-in-kasa').length
    const fieldMismatch = discrepancies.filter((d) => d.type === 'field-mismatch').length
    const toFix = discrepancies.filter((d) => d.action !== 'skip').length
    return { missingInSystem, missingInKasa, fieldMismatch, toFix }
  }, [discrepancies])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <SpinnerGap className="h-8 w-8 animate-spin text-muted" />
          <p className="text-sm text-muted">
            Sistem transferleri yükleniyor ve karşılaştırılıyor...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-lg">
        <div className="flex flex-col items-center gap-3 py-lg">
          <Warning className="h-8 w-8 text-red-500" weight="duotone" />
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="gray" onClick={runComparison}>
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
        <StatBox label="Sistemde Eksik" count={counts.missingInSystem} color="red" />
        <StatBox label="KASA'da Eksik" count={counts.missingInKasa} color="orange" />
        <StatBox label="Alan Farkı" count={counts.fieldMismatch} color="yellow" />
        <StatBox label="Düzeltilecek" count={counts.toFix} color="blue" />
      </div>

      {/* Bulk actions */}
      <div className="flex gap-2 flex-wrap">
        {counts.missingInSystem > 0 && (
          <Button variant="outline" onClick={() => setAllAction('missing-in-system', 'insert')}>
            <Plus className="h-4 w-4" />
            Tümünü Ekle ({counts.missingInSystem})
          </Button>
        )}
        {counts.fieldMismatch > 0 && (
          <Button variant="outline" onClick={() => setAllAction('field-mismatch', 'update')}>
            <ArrowsClockwise className="h-4 w-4" />
            Tümünü Güncelle ({counts.fieldMismatch})
          </Button>
        )}
        {counts.missingInKasa > 0 && (
          <Button variant="outline" onClick={() => setAllAction('missing-in-kasa', 'delete')}>
            <Trash className="h-4 w-4" />
            Tümünü Sil ({counts.missingInKasa})
          </Button>
        )}
      </div>

      {discrepancies.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="Sistem Uyumlu"
          description="KASA CSV ile sistem transferleri tamamen eşleşiyor."
        />
      ) : (
        <div className="rounded-xl border bg-bg1 overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[130px]">Durum</TableHead>
                <TableHead>META ID</TableHead>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Çalışan</TableHead>
                <TableHead>Yönetici</TableHead>
                <TableHead>Para Birimi</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Fark Detayı</TableHead>
                <TableHead className="w-[130px]">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discrepancies.map((d, i) => (
                <SystemDiscrepancyRow
                  key={i}
                  discrepancy={d}
                  onActionChange={(action) => updateAction(i, action)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="gray" onClick={onBack}>
          Geri
        </Button>
        <Button
          variant="filled"
          disabled={counts.toFix === 0}
          onClick={() => onNext(discrepancies)}
        >
          Düzelt ({counts.toFix} işlem)
        </Button>
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
  color: 'red' | 'orange' | 'yellow' | 'blue'
}) {
  const colors = {
    red: 'border-red-300 dark:border-red-700',
    orange: 'border-orange-300 dark:border-orange-700',
    yellow: 'border-yellow-300 dark:border-yellow-700',
    blue: 'border-blue-300 dark:border-blue-700',
  }
  return (
    <div className={`rounded-xl border p-md ${colors[color]}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold text-primary">{count}</p>
    </div>
  )
}

function SystemDiscrepancyRow({
  discrepancy: d,
  onActionChange,
}: {
  discrepancy: SystemDiscrepancy
  onActionChange: (action: FixAction) => void
}) {
  const metaId = d.kasaRow?.metaId || d.systemRow?.meta_id || '-'
  const name = d.kasaRow?.fullName || d.systemRow?.full_name || '-'
  const date = d.kasaRow
    ? parseTurkishDate(d.kasaRow.dateRaw) || d.kasaRow.dateRaw
    : d.systemRow?.transfer_date?.slice(0, 10) || '-'
  const amount = d.kasaRow ? parseTurkishDecimal(d.kasaRow.amountRaw) : d.systemRow?.amount

  return (
    <TableRow className={d.action !== 'skip' ? 'bg-blue-50/50 dark:bg-blue-900/5' : ''}>
      <TableCell>
        {d.type === 'missing-in-system' && <Tag variant="red">Sistemde Yok</Tag>}
        {d.type === 'missing-in-kasa' && <Tag variant="orange">KASA'da Yok</Tag>}
        {d.type === 'field-mismatch' && <Tag variant="yellow">Fark Var</Tag>}
      </TableCell>
      <TableCell className="font-mono text-xs">{metaId}</TableCell>
      <TableCell className="text-sm">{name}</TableCell>
      <TableCell className="text-sm">{date}</TableCell>
      <TableCell className="text-sm">{d.employeeName || '-'}</TableCell>
      <TableCell className="text-sm">{d.managerName || '-'}</TableCell>
      <TableCell className="text-sm font-medium">{d.currency || '-'}</TableCell>
      <TableCell className="text-right font-mono text-sm">
        {amount != null ? Math.abs(amount).toLocaleString('tr-TR') : '-'}
      </TableCell>
      <TableCell className="text-xs text-muted max-w-[250px]">
        {d.diffs && d.diffs.length > 0
          ? d.diffs.map((diff, i) => (
              <div key={i}>
                <span className="font-medium">{diff.field}:</span>{' '}
                <span className="text-red-500">{String(diff.kasaValue)}</span>
                {' → '}
                <span className="text-green-600">{String(diff.systemValue)}</span>
              </div>
            ))
          : '-'}
      </TableCell>
      <TableCell>
        <select
          className="rounded border bg-bg1 px-2 py-1 text-xs text-primary"
          value={d.action}
          onChange={(e) => onActionChange(e.target.value as FixAction)}
        >
          <option value="skip">Atla</option>
          {d.type === 'missing-in-system' && <option value="insert">Ekle</option>}
          {d.type === 'field-mismatch' && <option value="update">Güncelle</option>}
          {d.type === 'missing-in-kasa' && <option value="delete">Sil</option>}
        </select>
      </TableCell>
    </TableRow>
  )
}
