import { useState } from 'react'
import { CheckCircle, Warning, Check, EyeSlash, Eye } from '@phosphor-icons/react'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@ds'
import { parseTurkishDate } from '@/lib/csvImport/parseCsv'
import type { AllCsvCompareResults, CsvCompareResult } from './comparisons'
import type { CsvDiscrepancy, ParsedCsvData } from './types'
import { getSalesRowMeta, getSalesRowDate, getSalesRowName } from './parsers'

interface StepCsvCompareProps {
  results: AllCsvCompareResults
  data: ParsedCsvData
  resolved: Set<string>
  onToggleResolved: (key: string) => void
  onNext: () => void
  onBack: () => void
}

export function StepCsvCompare({
  results,
  data,
  resolved,
  onToggleResolved,
  onNext,
  onBack,
}: StepCsvCompareProps) {
  const [hideResolved, setHideResolved] = useState(false)

  const totalIssues =
    results.orderSatis.missingInKasa.length +
    results.orderSatis.amountMismatch.length +
    results.ordRetDeposit.missingInKasa.length +
    results.ordRetDeposit.amountMismatch.length +
    results.ordWithdrawal.missingInCsv.length +
    results.ordWithdrawal.missingInKasa.length +
    results.ordWithdrawal.amountMismatch.length +
    results.unmatchedKasaDeposits.length

  const resolvedCount = resolved.size

  return (
    <div className="space-y-lg">
      {/* KASA breakdown */}
      <div className="rounded-xl border bg-bg1 p-md">
        <p className="text-sm font-semibold text-primary mb-2">KASA Dağılımı</p>
        <div className="flex gap-4 text-xs text-muted">
          <span>
            Toplam: <b className="text-primary">{data.kasa.length}</b>
          </span>
          <span>
            Müşteri Yatırım: <b className="text-green-600">{results.kasaClientDeposits}</b>
          </span>
          <span>
            Müşteri Çekim: <b className="text-red-600">{results.kasaClientWithdrawals}</b>
          </span>
          <span>
            Ödeme/Bloke: <b className="text-muted">{results.kasaNonClient}</b> (karşılaştırma dışı)
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-md">
        <SummaryCard title="ORDER SATIS (İlk Yatırım)" result={results.orderSatis} />
        <SummaryCard title="ORD RET DEPOSIT (Tekrar)" result={results.ordRetDeposit} />
        <SummaryCard title="ORD WITHDRAWAL (Çekim)" result={results.ordWithdrawal} />
      </div>

      {/* Resolved summary + hide toggle */}
      {totalIssues > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {resolvedCount > 0 && (
              <Tag variant="green">
                {resolvedCount} / {totalIssues} düzeltildi
              </Tag>
            )}
            {resolvedCount > 0 && resolvedCount === totalIssues && (
              <span className="text-xs text-green-600 font-medium">
                Tüm hatalar düzeltildi olarak işaretlendi
              </span>
            )}
          </div>
          {resolvedCount > 0 && (
            <Button variant="ghost" onClick={() => setHideResolved((h) => !h)}>
              {hideResolved ? (
                <>
                  <Eye className="h-4 w-4" /> Düzeltilenleri Göster
                </>
              ) : (
                <>
                  <EyeSlash className="h-4 w-4" /> Düzeltilenleri Gizle
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Unmatched KASA deposits warning */}
      {results.unmatchedKasaDeposits.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/10 p-md">
          <div className="flex items-center gap-2 mb-2">
            <Warning className="h-5 w-5 text-red-500" weight="duotone" />
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">
              KASA'da olup hiçbir satış CSV'sinde eşleşmeyen yatırımlar:{' '}
              {results.unmatchedKasaDeposits.length}
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
        <Tabs
          defaultValue={
            results.unmatchedKasaDeposits.length > 0
              ? 'unmatched'
              : getIssueCount(results.orderSatis) > 0
                ? 'order-satis'
                : getIssueCount(results.ordRetDeposit) > 0
                  ? 'ord-ret-deposit'
                  : 'ord-withdrawal'
          }
        >
          <TabsList>
            {results.unmatchedKasaDeposits.length > 0 && (
              <TabsTrigger value="unmatched">
                Eşleşmeyen Yatırımlar
                <BadgeCount
                  count={results.unmatchedKasaDeposits.length}
                  resolvedCount={countResolvedInList(
                    resolved,
                    'unmatched',
                    results.unmatchedKasaDeposits.length,
                  )}
                />
              </TabsTrigger>
            )}
            <TabsTrigger value="order-satis">
              ORDER SATIS
              <BadgeCount
                count={getIssueCount(results.orderSatis)}
                resolvedCount={countResolvedInList(
                  resolved,
                  'order-satis',
                  getIssueCount(results.orderSatis),
                )}
              />
            </TabsTrigger>
            <TabsTrigger value="ord-ret-deposit">
              ORD RET DEPOSIT
              <BadgeCount
                count={getIssueCount(results.ordRetDeposit)}
                resolvedCount={countResolvedInList(
                  resolved,
                  'ord-ret-deposit',
                  getIssueCount(results.ordRetDeposit),
                )}
              />
            </TabsTrigger>
            <TabsTrigger value="ord-withdrawal">
              ORD WITHDRAWAL
              <BadgeCount
                count={getIssueCount(results.ordWithdrawal)}
                resolvedCount={countResolvedInList(
                  resolved,
                  'ord-withdrawal',
                  getIssueCount(results.ordWithdrawal),
                )}
              />
            </TabsTrigger>
          </TabsList>

          {results.unmatchedKasaDeposits.length > 0 && (
            <TabsContent value="unmatched">
              <DiscrepancyTable
                tabKey="unmatched"
                discrepancies={results.unmatchedKasaDeposits}
                resolved={resolved}
                hideResolved={hideResolved}
                onToggleResolved={onToggleResolved}
              />
            </TabsContent>
          )}
          <TabsContent value="order-satis">
            <DiscrepancyTable
              tabKey="order-satis"
              discrepancies={getAllDiscrepancies(results.orderSatis)}
              resolved={resolved}
              hideResolved={hideResolved}
              onToggleResolved={onToggleResolved}
            />
          </TabsContent>
          <TabsContent value="ord-ret-deposit">
            <DiscrepancyTable
              tabKey="ord-ret-deposit"
              discrepancies={getAllDiscrepancies(results.ordRetDeposit)}
              resolved={resolved}
              hideResolved={hideResolved}
              onToggleResolved={onToggleResolved}
            />
          </TabsContent>
          <TabsContent value="ord-withdrawal">
            <DiscrepancyTable
              tabKey="ord-withdrawal"
              discrepancies={getAllDiscrepancies(results.ordWithdrawal)}
              resolved={resolved}
              hideResolved={hideResolved}
              onToggleResolved={onToggleResolved}
            />
          </TabsContent>
        </Tabs>
      )}

      <div className="flex justify-between">
        {resolvedCount > 0 ? (
          <BackConfirmButton resolvedCount={resolvedCount} onConfirm={onBack} />
        ) : (
          <Button variant="gray" onClick={onBack}>
            Geri
          </Button>
        )}
        <Button variant="filled" onClick={onNext}>
          Sistem Karşılaştırması
        </Button>
      </div>
    </div>
  )
}

/** Count how many resolved keys exist for a given tab */
function countResolvedInList(resolved: Set<string>, tabKey: string, total: number): number {
  let count = 0
  for (let i = 0; i < total; i++) {
    if (resolved.has(`${tabKey}-${i}`)) count++
  }
  return count
}

function BackConfirmButton({
  resolvedCount,
  onConfirm,
}: {
  resolvedCount: number
  onConfirm: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="gray" onClick={() => setOpen(true)}>
        Geri
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Geri dönmek istediğinize emin misiniz?</DialogTitle>
            <DialogDescription>
              <b>{resolvedCount}</b> adet düzeltildi olarak işaretlediğiniz kayıt var. Geri
              dönerseniz yeni CSV yüklediğinizde bu işaretler sıfırlanacaktır.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="gray" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button
              variant="filled"
              onClick={() => {
                setOpen(false)
                onConfirm()
              }}
            >
              Geri Dön
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
        <p>
          Eşleşen: <span className="font-medium text-green-600">{result.matched}</span>
        </p>
        {result.missingInKasa.length > 0 && (
          <p>
            CSV'de olup KASA'da yok:{' '}
            <span className="font-medium text-red-600">{result.missingInKasa.length}</span>
          </p>
        )}
        {result.missingInCsv.length > 0 && (
          <p>
            KASA'da olup CSV'de yok:{' '}
            <span className="font-medium text-orange-600">{result.missingInCsv.length}</span>
          </p>
        )}
        {result.amountMismatch.length > 0 && (
          <p>
            Tutar farkı:{' '}
            <span className="font-medium text-yellow-600">{result.amountMismatch.length}</span>
          </p>
        )}
      </div>
    </div>
  )
}

function BadgeCount({ count, resolvedCount = 0 }: { count: number; resolvedCount?: number }) {
  if (count === 0) return null
  const allResolved = resolvedCount > 0 && resolvedCount >= count
  return (
    <span
      className={`ml-1 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
        allResolved
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      {resolvedCount > 0 ? `${count - resolvedCount}/${count}` : count}
    </span>
  )
}

function DiscrepancyTable({
  tabKey,
  discrepancies,
  resolved,
  hideResolved,
  onToggleResolved,
}: {
  tabKey: string
  discrepancies: CsvDiscrepancy[]
  resolved: Set<string>
  hideResolved: boolean
  onToggleResolved: (key: string) => void
}) {
  if (discrepancies.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="Uyumsuzluk Yok"
        description="Bu CSV ile KASA arasında fark bulunamadı."
      />
    )
  }

  const visibleDiscrepancies = discrepancies
    .map((d, i) => ({ discrepancy: d, index: i, key: `${tabKey}-${i}` }))
    .filter(({ key }) => !hideResolved || !resolved.has(key))

  if (visibleDiscrepancies.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="Tümü Düzeltildi"
        description="Bu sekmedeki tüm hatalar düzeltildi olarak işaretlendi."
      />
    )
  }

  return (
    <div className="rounded-xl border bg-bg1 overflow-auto max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Düzeltildi</TableHead>
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
          {visibleDiscrepancies.map(({ discrepancy, key }) => (
            <DiscrepancyRow
              key={key}
              discrepancy={discrepancy}
              isResolved={resolved.has(key)}
              onToggleResolved={() => onToggleResolved(key)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DiscrepancyRow({
  discrepancy: d,
  isResolved,
  onToggleResolved,
}: {
  discrepancy: CsvDiscrepancy
  isResolved: boolean
  onToggleResolved: () => void
}) {
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
    <TableRow className={isResolved ? 'opacity-50 bg-green-50/50 dark:bg-green-900/5' : ''}>
      <TableCell>
        <button
          type="button"
          onClick={onToggleResolved}
          className={`inline-flex items-center justify-center rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
            isResolved
              ? 'border-green-300 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'border-gray-300 bg-bg1 text-muted hover:border-green-300 hover:text-green-600 dark:border-gray-600'
          }`}
        >
          <Check className="h-3.5 w-3.5 mr-1" weight={isResolved ? 'bold' : 'regular'} />
          {isResolved ? 'Düzeltildi' : 'Düzelt'}
        </button>
      </TableCell>
      <TableCell>
        {d.type === 'missing-in-csv' && (
          <Tag variant={isResolved ? 'green' : 'orange'}>Eksik CSV'de</Tag>
        )}
        {d.type === 'missing-in-kasa' && (
          <Tag variant={isResolved ? 'green' : 'red'}>Eksik KASA'da</Tag>
        )}
        {d.type === 'amount-mismatch' && (
          <Tag variant={isResolved ? 'green' : 'yellow'}>Tutar Farkı</Tag>
        )}
        {d.type === 'date-mismatch' && (
          <Tag variant={isResolved ? 'green' : 'blue'}>Tarih Farkı</Tag>
        )}
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
