import { useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CaretLeft,
  CaretRight,
  DownloadSimple,
  Table as TableIcon,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react'
import { Button, Card, Skeleton, EmptyState, Tag } from '@ds'
import { useOzetQuery, type OzetPsp } from '@/hooks/queries/useOzetQuery'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number, lang: string, decimals = 2): string {
  return n.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtPct(n: number, lang: string): string {
  return (
    n.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + '%'
  )
}

function fmtDayFull(dateStr: string, lang: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

const MONTH_NAMES_TR = [
  '',
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

const MONTH_NAMES_EN = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/* ------------------------------------------------------------------ */
/*  Cell color helpers                                                 */
/* ------------------------------------------------------------------ */

function amountColor(n: number): string {
  if (n > 0) return 'text-green-700 dark:text-green-400'
  if (n < 0) return 'text-red-600 dark:text-red-400'
  return 'text-black/30'
}

function kasaColor(n: number): string {
  if (n > 0) return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
  if (n < 0) return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
  return 'text-black/30'
}

/* ------------------------------------------------------------------ */
/*  PSP column group                                                   */
/* ------------------------------------------------------------------ */

type OzetColumn =
  | 'deposits'
  | 'withdrawals'
  | 'commission'
  | 'net'
  | 'settlement'
  | 'kasaTop'
  | 'devir'
  | 'finansPct'

const ALL_COLUMNS: OzetColumn[] = [
  'deposits',
  'withdrawals',
  'commission',
  'net',
  'settlement',
  'kasaTop',
  'devir',
  'finansPct',
]

const COLUMN_LABELS: Record<string, Record<OzetColumn, string>> = {
  tr: {
    deposits: 'Yatırım',
    withdrawals: 'Çekme',
    commission: 'Komisyon',
    net: 'Net',
    settlement: 'Tahs.',
    kasaTop: 'Kasa Top.',
    devir: 'Devir',
    finansPct: 'Fin %',
  },
  en: {
    deposits: 'Deposit',
    withdrawals: 'Withdraw',
    commission: 'Comm.',
    net: 'Net',
    settlement: 'Settl.',
    kasaTop: 'Balance',
    devir: 'Carry',
    finansPct: 'Fin %',
  },
}

/* ------------------------------------------------------------------ */
/*  CSV Export                                                         */
/* ------------------------------------------------------------------ */

function exportCsv(psps: OzetPsp[], days: string[], lang: string) {
  const labels = COLUMN_LABELS[lang] ?? COLUMN_LABELS.en
  const cols = ALL_COLUMNS

  const headers = ['Date']
  for (const psp of psps) {
    for (const col of cols) {
      headers.push(`${psp.pspName} — ${labels[col]}`)
    }
  }

  const rows: string[][] = []
  for (let i = 0; i < days.length; i++) {
    const row = [days[i]]
    for (const psp of psps) {
      const d = psp.days[i]
      if (!d) {
        row.push(...cols.map(() => '0'))
        continue
      }
      for (const col of cols) {
        if (col === 'finansPct') row.push(d.finansPct.toFixed(1))
        else row.push(String(d[col] ?? 0))
      }
    }
    rows.push(row)
  }

  const totalRow = ['TOTAL']
  for (const psp of psps) {
    const t = psp.totals
    totalRow.push(
      String(t.deposits),
      String(t.withdrawals),
      String(t.commission),
      String(t.net),
      String(t.settlement),
      '',
      '',
      t.finansPct.toFixed(1),
    )
  }
  rows.push(totalRow)

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `OZET_${days[0]?.slice(0, 7) ?? 'export'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/*  Summary Tab (embedded in PSPs page)                                */
/* ------------------------------------------------------------------ */

export function SummaryTab() {
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language?.slice(0, 2) ?? 'en'

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [hideEmpty, setHideEmpty] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  const { data, isLoading, error } = useOzetQuery(year, month)

  const goToPrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else setMonth((m) => m - 1)
  }
  const goToNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else setMonth((m) => m + 1)
  }

  const visiblePsps = useMemo(() => {
    if (!data) return []
    if (!hideEmpty) return data.psps
    return data.psps.filter(
      (p) => p.totals.deposits > 0 || p.totals.withdrawals > 0 || p.totals.settlement > 0,
    )
  }, [data, hideEmpty])

  const labels = COLUMN_LABELS[lang] ?? COLUMN_LABELS.en
  const monthLabel =
    lang === 'tr' ? `${MONTH_NAMES_TR[month]} ${year}` : `${MONTH_NAMES_EN[month]} ${year}`

  const cols: OzetColumn[] = ALL_COLUMNS

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-sm">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    )
  }

  /* ── Error ───────────────────────────────────────────────────────── */
  if (error) {
    return (
      <Card className="p-lg">
        <p className="text-sm text-red-500">{error}</p>
      </Card>
    )
  }

  /* ── Empty ───────────────────────────────────────────────────────── */
  if (!data || visiblePsps.length === 0) {
    return (
      <div className="space-y-lg">
        <div className="flex items-center gap-sm">
          <Button variant="ghost" size="sm" onClick={goToPrevMonth} className="size-8 p-0">
            <CaretLeft size={16} weight="bold" />
          </Button>
          <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-black/70">
            {monthLabel}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="size-8 p-0"
          >
            <CaretRight size={16} weight="bold" />
          </Button>
        </div>
        <EmptyState
          icon={TableIcon}
          title={t('psps.summary.empty')}
          description={t('psps.summary.emptyDescription')}
        />
      </div>
    )
  }

  /* ── Render ──────────────────────────────────────────────────────── */
  const days = data.days
  const grandTotals = data.grandTotals
  const monthTotals = data.monthTotals

  return (
    <div className="space-y-lg">
      {/* Month nav + actions */}
      <div className="flex flex-wrap items-center gap-sm">
        <Button variant="ghost" size="sm" onClick={goToPrevMonth} className="size-8 p-0">
          <CaretLeft size={16} weight="bold" />
        </Button>
        <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-black/70">
          {monthLabel}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className="size-8 p-0"
        >
          <CaretRight size={16} weight="bold" />
        </Button>

        <span className="ml-auto text-xs text-black/40">
          {visiblePsps.length} PSP · {days.length} {t('psps.summary.days')}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHideEmpty((h) => !h)}
          className="gap-1 text-xs"
        >
          {hideEmpty ? <Eye size={14} /> : <EyeSlash size={14} />}
          {hideEmpty ? t('psps.summary.showAll') : t('psps.summary.hideEmpty')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCsv(visiblePsps, days, lang)}
          className="gap-1"
        >
          <DownloadSimple size={14} />
          CSV
        </Button>
      </div>

      {/* PSP summary tags */}
      <div className="flex flex-wrap gap-xs">
        {visiblePsps.map((p) => (
          <Tag key={p.pspId} variant="outline" className="gap-1 text-xs">
            <span className="font-semibold">{p.pspName}</span>
            <span className="text-black/40">{fmtPct(p.commissionRate * 100, lang)}</span>
          </Tag>
        ))}
      </div>

      {/* Grid */}
      <Card className="overflow-hidden p-0">
        <div ref={scrollRef} className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            {/* ── HEADER ──────────────────────────────────── */}
            <thead>
              {/* PSP name row */}
              <tr className="border-b border-black/5 bg-black/[0.02]">
                <th
                  className="sticky left-0 z-20 border-r border-black/10 bg-white px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-black/50"
                  rowSpan={2}
                >
                  {t('psps.summary.date')}
                </th>
                {visiblePsps.map((p) => (
                  <th
                    key={p.pspId}
                    colSpan={cols.length}
                    className="border-x border-black/5 px-1 py-1.5 text-center text-[11px] font-bold text-black/80"
                  >
                    {p.pspName}
                    <span className="ml-1 font-normal text-black/30">
                      ({fmtPct(p.commissionRate * 100, lang)})
                    </span>
                  </th>
                ))}
                <th
                  colSpan={5}
                  className="border-l-2 border-black/20 px-1 py-1.5 text-center text-[11px] font-bold text-black/80"
                >
                  {t('psps.summary.grandTotal')}
                </th>
              </tr>

              {/* Sub-column headers */}
              <tr className="border-b border-black/10 bg-black/[0.02]">
                {visiblePsps.map((p) =>
                  cols.map((col, ci) => (
                    <th
                      key={`${p.pspId}-${col}`}
                      className={`whitespace-nowrap px-1.5 py-1 text-right text-[10px] font-medium uppercase tracking-wider text-black/40 ${ci === 0 ? 'border-l border-black/5' : ''}`}
                    >
                      {labels[col]}
                    </th>
                  )),
                )}
                {(['deposits', 'withdrawals', 'commission', 'net', 'finansPct'] as const).map(
                  (col, ci) => (
                    <th
                      key={`grand-${col}`}
                      className={`whitespace-nowrap px-1.5 py-1 text-right text-[10px] font-medium uppercase tracking-wider text-black/40 ${ci === 0 ? 'border-l-2 border-black/20' : ''}`}
                    >
                      {labels[col as OzetColumn] ?? col}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            {/* ── BODY ────────────────────────────────────── */}
            <tbody>
              {days.map((day, di) => {
                const grand = grandTotals[di]
                const hasData = visiblePsps.some((p) => {
                  const d = p.days[di]
                  return d && (d.deposits > 0 || d.withdrawals > 0 || d.settlement > 0)
                })

                return (
                  <tr
                    key={day}
                    className={`border-b border-black/[0.04] transition-colors hover:bg-black/[0.02] ${!hasData ? 'opacity-40' : ''}`}
                  >
                    <td className="sticky left-0 z-10 border-r border-black/10 bg-white px-2 py-1 text-left font-mono text-[11px] font-medium text-black/60">
                      {fmtDayFull(day, lang)}
                    </td>

                    {visiblePsps.map((p) => {
                      const d = p.days[di]
                      if (!d) {
                        return cols.map((col) => (
                          <td
                            key={`${p.pspId}-${col}-${di}`}
                            className="px-1.5 py-1 text-right text-black/20"
                          >
                            —
                          </td>
                        ))
                      }

                      return cols.map((col, ci) => {
                        let val: string
                        let colorClass = ''

                        if (col === 'finansPct') {
                          val = d.finansPct > 0 ? fmtPct(d.finansPct, lang) : '—'
                          colorClass = d.finansPct > 0 ? 'text-purple-600' : 'text-black/20'
                        } else if (col === 'kasaTop') {
                          val = fmt(d.kasaTop, lang, 0)
                          colorClass = kasaColor(d.kasaTop)
                        } else if (col === 'devir') {
                          val = fmt(d.devir, lang, 0)
                          colorClass = d.devir !== 0 ? 'text-blue-600/70' : 'text-black/20'
                        } else {
                          const num = d[col]
                          val = num !== 0 ? fmt(num, lang, 0) : '—'
                          if (col === 'deposits')
                            colorClass = num > 0 ? 'text-green-700' : 'text-black/20'
                          else if (col === 'withdrawals')
                            colorClass = num > 0 ? 'text-red-600' : 'text-black/20'
                          else if (col === 'commission')
                            colorClass = num > 0 ? 'text-orange-600' : 'text-black/20'
                          else if (col === 'net') colorClass = amountColor(num)
                          else if (col === 'settlement')
                            colorClass = num > 0 ? 'text-sky-600' : 'text-black/20'
                          else colorClass = 'text-black/60'
                        }

                        return (
                          <td
                            key={`${p.pspId}-${col}-${di}`}
                            className={`whitespace-nowrap px-1.5 py-1 text-right font-mono text-[11px] ${colorClass} ${ci === 0 ? 'border-l border-black/5' : ''}`}
                          >
                            {val}
                          </td>
                        )
                      })
                    })}

                    {grand && (
                      <>
                        <td className="whitespace-nowrap border-l-2 border-black/20 px-1.5 py-1 text-right font-mono text-[11px] font-semibold text-green-700">
                          {grand.deposits > 0 ? fmt(grand.deposits, lang, 0) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-1.5 py-1 text-right font-mono text-[11px] font-semibold text-red-600">
                          {grand.withdrawals > 0 ? fmt(grand.withdrawals, lang, 0) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-1.5 py-1 text-right font-mono text-[11px] font-semibold text-orange-600">
                          {grand.commission > 0 ? fmt(grand.commission, lang, 0) : '—'}
                        </td>
                        <td
                          className={`whitespace-nowrap px-1.5 py-1 text-right font-mono text-[11px] font-bold ${amountColor(grand.net)}`}
                        >
                          {fmt(grand.net, lang, 0)}
                        </td>
                        <td className="whitespace-nowrap px-1.5 py-1 text-right font-mono text-[11px] text-purple-600">
                          {grand.finansPct > 0 ? fmtPct(grand.finansPct, lang) : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>

            {/* ── FOOTER (Totals) ─────────────────────────── */}
            <tfoot>
              <tr className="border-t-2 border-black/20 bg-black/[0.03]">
                <td className="sticky left-0 z-10 border-r border-black/10 bg-white px-2 py-2 text-left text-[11px] font-bold uppercase text-black/70">
                  {t('psps.summary.total')}
                </td>

                {visiblePsps.map((p) =>
                  cols.map((col, ci) => {
                    const totals = p.totals
                    let val: string
                    let colorClass = 'font-bold'

                    if (col === 'finansPct') {
                      val = totals.finansPct > 0 ? fmtPct(totals.finansPct, lang) : '—'
                      colorClass += ' text-purple-700'
                    } else if (col === 'kasaTop' || col === 'devir') {
                      val = '—'
                      colorClass += ' text-black/20'
                    } else {
                      const num = totals[col as keyof typeof totals] as number
                      val = num !== 0 ? fmt(num, lang, 0) : '—'
                      if (col === 'deposits') colorClass += ' text-green-700'
                      else if (col === 'withdrawals') colorClass += ' text-red-600'
                      else if (col === 'commission') colorClass += ' text-orange-600'
                      else if (col === 'net')
                        colorClass += num >= 0 ? ' text-green-700' : ' text-red-600'
                      else if (col === 'settlement') colorClass += ' text-sky-600'
                    }

                    return (
                      <td
                        key={`total-${p.pspId}-${col}`}
                        className={`whitespace-nowrap px-1.5 py-2 text-right font-mono text-[11px] ${colorClass} ${ci === 0 ? 'border-l border-black/5' : ''}`}
                      >
                        {val}
                      </td>
                    )
                  }),
                )}

                <td className="whitespace-nowrap border-l-2 border-black/20 px-1.5 py-2 text-right font-mono text-[11px] font-bold text-green-700">
                  {fmt(monthTotals.deposits, lang, 0)}
                </td>
                <td className="whitespace-nowrap px-1.5 py-2 text-right font-mono text-[11px] font-bold text-red-600">
                  {fmt(monthTotals.withdrawals, lang, 0)}
                </td>
                <td className="whitespace-nowrap px-1.5 py-2 text-right font-mono text-[11px] font-bold text-orange-600">
                  {fmt(monthTotals.commission, lang, 0)}
                </td>
                <td
                  className={`whitespace-nowrap px-1.5 py-2 text-right font-mono text-[11px] font-bold ${amountColor(monthTotals.net)}`}
                >
                  {fmt(monthTotals.net, lang, 0)}
                </td>
                <td className="whitespace-nowrap px-1.5 py-2 text-right font-mono text-[11px] font-bold text-purple-700">
                  {monthTotals.finansPct > 0 ? fmtPct(monthTotals.finansPct, lang) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
