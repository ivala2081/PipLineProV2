import { useMemo } from 'react'
import { CheckCircle, Warning } from '@phosphor-icons/react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
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
import type { AllCsvCompareResults, CsvCompareResult } from './comparisons'
import type { CsvDiscrepancy, ParsedCsvData } from './types'
import { getSalesRowMeta, getSalesRowDate, getSalesRowName, getSalesRowAmountUsd, getSalesRowAmountTl } from './parsers'

interface StepCsvCompareProps {
  results: AllCsvCompareResults
  data: ParsedCsvData
  onNext: () => void
  onBack: () => void
}

export function StepCsvCompare({ results, data, onNext, onBack }: StepCsvCompareProps) {
  const totalIssues =
    results.orderSatis.missingInKasa.length +
    results.orderSatis.amountMismatch.length +
    results.ordRetDeposit.missingInKasa.length +
    results.ordRetDeposit.amountMismatch.length +
    results.ordWithdrawal.missingInCsv.length +
    results.ordWithdrawal.missingInKasa.length +
    results.ordWithdrawal.amountMismatch.length +
    results.unmatchedKasaDeposits.length

  return (
    <div className="space-y-lg">
      {/* KASA breakdown */}
      <div className="rounded-xl border bg-bg1 p-md">
        <p className="text-sm font-semibold text-primary mb-2">KASA Dağılımı</p>
        <div className="flex gap-4 text-xs text-muted">
          <span>Toplam: <b className="text-primary">{data.kasa.length}</b></span>
          <span>Müşteri Yatırım: <b className="text-green-600">{results.kasaClientDeposits}</b></span>
          <span>Müşteri Çekim: <b className="text-red-600">{results.kasaClientWithdrawals}</b></span>
          <span>Ödeme/Bloke: <b className="text-muted">{results.kasaNonClient}</b> (karşılaştırma dışı)</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-md">
        <SummaryCard title="ORDER SATIS (İlk Yatırım)" result={results.orderSatis} />
        <SummaryCard title="ORD RET DEPOSIT (Tekrar)" result={results.ordRetDeposit} />
        <SummaryCard title="ORD WITHDRAWAL (Çekim)" result={results.ordWithdrawal} />
      </div>

      {/* Unmatched KASA deposits warning */}
      {results.unmatchedKasaDeposits.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/10 p-md">
          <div className="flex items-center gap-2 mb-2">
            <Warning className="h-5 w-5 text-red-500" weight="duotone" />
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">
              KASA'da olup hiçbir satış CSV'sinde eşleşmeyen yatırımlar: {results.unmatchedKasaDeposits.length}
            </span>
          </div>
        </div>
      )}

      {totalIssues === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="Tüm CSV'ler Uyumlu"
          description="KASA ile satış CSV'leri arasında tutarsızlık bulunamadı."
        />
      ) : (
        <Tabs defaultValue={
          results.unmatchedKasaDeposits.length > 0 ? 'unmatched' :
          getIssueCount(results.orderSatis) > 0 ? 'order-satis' :
          getIssueCount(results.ordRetDeposit) > 0 ? 'ord-ret-deposit' : 'ord-withdrawal'
        }>
          <TabsList>
            {results.unmatchedKasaDeposits.length > 0 && (
              <TabsTrigger value="unmatched">
                Eşleşmeyen Yatırımlar
                <BadgeCount count={results.unmatchedKasaDeposits.length} />
              </TabsTrigger>
            )}
            <TabsTrigger value="order-satis">
              ORDER SATIS
              <BadgeCount count={getIssueCount(results.orderSatis)} />
            </TabsTrigger>
            <TabsTrigger value="ord-ret-deposit">
              ORD RET DEPOSIT
              <BadgeCount count={getIssueCount(results.ordRetDeposit)} />
            </TabsTrigger>
            <TabsTrigger value="ord-withdrawal">
              ORD WITHDRAWAL
              <BadgeCount count={getIssueCount(results.ordWithdrawal)} />
            </TabsTrigger>
          </TabsList>

          {results.unmatchedKasaDeposits.length > 0 && (
            <TabsContent value="unmatched">
              <DiscrepancyTable discrepancies={results.unmatchedKasaDeposits} />
            </TabsContent>
          )}
          <TabsContent value="order-satis">
            <DiscrepancyTable discrepancies={getAllDiscrepancies(results.orderSatis)} />
          </TabsContent>
          <TabsContent value="ord-ret-deposit">
            <DiscrepancyTable discrepancies={getAllDiscrepancies(results.ordRetDeposit)} />
          </TabsContent>
          <TabsContent value="ord-withdrawal">
            <DiscrepancyTable discrepancies={getAllDiscrepancies(results.ordWithdrawal)} />
          </TabsContent>
        </Tabs>
      )}

      <div className="flex justify-between">
        <Button variant="gray" onClick={onBack}>
          Geri
        </Button>
        <Button variant="filled" onClick={onNext}>
          Sistem Karşılaştırması
        </Button>
      </div>
    </div>
  )
}

function getIssueCount(result: CsvCompareResult): number {
  return result.missingInCsv.length + result.missingInKasa.length + result.amountMismatch.length
}

function getAllDiscrepancies(result: CsvCompareResult): CsvDiscrepancy[] {
  return [...result.missingInCsv, ...result.missingInKasa, ...result.amountMismatch]
}

function SummaryCard({ title, result }: { title: string; result: CsvCompareResult }) {
  const issues = getIssueCount(result)
  const hasIssues = issues > 0

  return (
    <div
      className={`rounded-xl border p-md ${hasIssues ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/10' : 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/10'}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {hasIssues ? (
          <Warning className="h-5 w-5 text-orange-500" weight="duotone" />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-500" weight="duotone" />
        )}
        <span className="text-sm font-semibold text-primary">{title}</span>
      </div>
      <div className="text-xs text-muted space-y-0.5">
        <p>Eşleşen: <span className="font-medium text-green-600">{result.matched}</span></p>
        {result.missingInKasa.length > 0 && (
          <p>CSV'de olup KASA'da yok: <span className="font-medium text-red-600">{result.missingInKasa.length}</span></p>
        )}
        {result.missingInCsv.length > 0 && (
          <p>KASA'da olup CSV'de yok: <span className="font-medium text-orange-600">{result.missingInCsv.length}</span></p>
        )}
        {result.amountMismatch.length > 0 && (
          <p>Tutar farkı: <span className="font-medium text-yellow-600">{result.amountMismatch.length}</span></p>
        )}
      </div>
    </div>
  )
}

function BadgeCount({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
      {count}
    </span>
  )
}

function DiscrepancyTable({ discrepancies }: { discrepancies: CsvDiscrepancy[] }) {
  if (discrepancies.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="Uyumsuzluk Yok"
        description="Bu CSV ile KASA arasında fark bulunamadı."
      />
    )
  }

  return (
    <div className="rounded-xl border bg-bg1 overflow-auto max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Durum</TableHead>
            <TableHead>META ID</TableHead>
            <TableHead>Ad Soyad</TableHead>
            <TableHead>Tarih</TableHead>
            <TableHead>Çalışan</TableHead>
            <TableHead>Yönetici</TableHead>
            <TableHead>Para Birimi</TableHead>
            <TableHead className="text-right">Tutar (KASA)</TableHead>
            <TableHead className="text-right">Tutar (CSV)</TableHead>
            <TableHead>Notlar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discrepancies.map((d, i) => (
            <DiscrepancyRow key={i} discrepancy={d} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DiscrepancyRow({ discrepancy: d }: { discrepancy: CsvDiscrepancy }) {
  const metaId = d.kasaRow?.metaId || (d.csvRow ? getSalesRowMeta(d.csvRow) : '-')
  const name = d.kasaRow?.fullName || (d.csvRow ? getSalesRowName(d.csvRow) : '-')
  const date = d.kasaRow
    ? parseTurkishDate(d.kasaRow.dateRaw) || d.kasaRow.dateRaw
    : d.csvRow
      ? getSalesRowDate(d.csvRow)
      : '-'
  const currency = d.kasaRow?.currency ?? '-'
  const kasaAmt = d.kasaAmount != null ? Math.abs(d.kasaAmount) : null
  const csvAmt = d.csvAmount != null ? Math.abs(d.csvAmount) : null

  return (
    <TableRow>
      <TableCell>
        {d.type === 'missing-in-csv' && <Tag variant="orange">Eksik CSV'de</Tag>}
        {d.type === 'missing-in-kasa' && <Tag variant="red">Eksik KASA'da</Tag>}
        {d.type === 'amount-mismatch' && <Tag variant="yellow">Tutar Farkı</Tag>}
        {d.type === 'date-mismatch' && <Tag variant="blue">Tarih Farkı</Tag>}
      </TableCell>
      <TableCell className="font-mono text-xs">{metaId}</TableCell>
      <TableCell className="text-sm">{name}</TableCell>
      <TableCell className="text-sm">{date}</TableCell>
      <TableCell className="text-sm">{d.employeeName || '-'}</TableCell>
      <TableCell className="text-sm">{d.managerName || '-'}</TableCell>
      <TableCell className="text-sm font-medium">{currency}</TableCell>
      <TableCell className="text-right font-mono text-sm">
        {kasaAmt != null ? kasaAmt.toLocaleString('tr-TR') : '-'}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {csvAmt != null ? csvAmt.toLocaleString('tr-TR') : '-'}
      </TableCell>
      <TableCell className="text-xs text-muted">
        {d.fieldNotes && d.fieldNotes.length > 0
          ? d.fieldNotes.map((n, i) => (
              <div key={i}>
                <span className="font-medium">{n.field}:</span>{' '}
                <span className="text-red-500">{n.kasaValue || '—'}</span>
                {' → '}
                <span className="text-green-600">{n.csvValue || '—'}</span>
              </div>
            ))
          : '-'}
      </TableCell>
    </TableRow>
  )
}
