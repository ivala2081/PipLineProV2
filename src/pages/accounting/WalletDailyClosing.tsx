import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Minus } from '@phosphor-icons/react'
import type { NormalizedTransfer } from '@/lib/tatumServiceSecure'
import { Skeleton, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@ds'

/* ── Types ────────────────────────────────────────────── */

export interface DailyClosing {
  /** Date key: 'YYYY-MM-DD' */
  dateKey: string
  /** Human-readable label */
  label: string
  /** Total incoming per token */
  inByToken: Record<string, number>
  /** Total outgoing per token */
  outByToken: Record<string, number>
  /** Net per token (in - out) */
  netByToken: Record<string, number>
  /** End-of-day balance per token (computed from current balance going backwards) */
  balanceByToken: Record<string, number>
  /** Number of incoming transfers */
  inCount: number
  /** Number of outgoing transfers */
  outCount: number
  /** Total transfer count */
  totalCount: number
}

/* ── Token whitelist (filter out spam/scam tokens) ────── */

const KNOWN_TOKENS = new Set([
  'TRX',
  'USDT',
  'USDD',
  'USDC',
  'TUSD',
  'USDJ',
  'BTT',
  'JST',
  'SUN',
  'WIN',
  'NFT',
  'APENFT',
  'WTRX',
  'stUSDT',
])

/** Returns true if the symbol looks like a real token (not spam) */
function isLegitToken(symbol: string): boolean {
  if (!symbol) return false
  // Exact match in whitelist
  if (KNOWN_TOKENS.has(symbol)) return true
  // Reject anything containing spaces, dots, "www", "com", "net", "org", URLs
  if (/[\s.]|www|\.com|\.net|\.org|http/i.test(symbol)) return false
  // Reject "fungible" or other generic junk
  if (/^fungible$/i.test(symbol)) return false
  // Reject very long symbols (>10 chars) – likely spam
  if (symbol.length > 10) return false
  return true
}

/* ── Computation ──────────────────────────────────────── */

function computeDailyClosings(
  transfers: NormalizedTransfer[],
  lang: string,
  currentBalances: Record<string, number>,
): DailyClosing[] {
  const map = new Map<
    string,
    {
      inByToken: Record<string, number>
      outByToken: Record<string, number>
      inCount: number
      outCount: number
    }
  >()

  for (const tx of transfers) {
    const symbol = tx.symbol || 'UNKNOWN'
    const amount = parseFloat(tx.amount) || 0

    // Skip spam/scam tokens BEFORE creating the day entry
    if (!isLegitToken(symbol)) continue
    if (!amount || isNaN(amount)) continue

    // Derive date key from timestamp (UTC)
    let dateKey: string
    if (tx.timestamp > 0) {
      const d = new Date(tx.timestamp)
      dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    } else {
      dateKey = 'unknown'
    }

    if (!map.has(dateKey)) {
      map.set(dateKey, { inByToken: {}, outByToken: {}, inCount: 0, outCount: 0 })
    }
    const day = map.get(dateKey)!

    if (tx.direction === 'in') {
      day.inByToken[symbol] = (day.inByToken[symbol] ?? 0) + amount
      day.inCount++
    } else {
      day.outByToken[symbol] = (day.outByToken[symbol] ?? 0) + amount
      day.outCount++
    }
  }

  const locale = lang === 'tr' ? 'tr-TR' : 'en-US'

  const closings: DailyClosing[] = []
  for (const [dateKey, data] of map) {
    // Compute net per token
    const allSymbols = new Set([...Object.keys(data.inByToken), ...Object.keys(data.outByToken)])
    const netByToken: Record<string, number> = {}
    for (const sym of allSymbols) {
      netByToken[sym] = (data.inByToken[sym] ?? 0) - (data.outByToken[sym] ?? 0)
    }

    const label =
      dateKey === 'unknown'
        ? '—'
        : new Date(dateKey + 'T00:00:00Z').toLocaleDateString(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            weekday: 'short',
            timeZone: 'UTC',
          })

    closings.push({
      dateKey,
      label,
      inByToken: data.inByToken,
      outByToken: data.outByToken,
      netByToken,
      balanceByToken: {}, // will be filled below
      inCount: data.inCount,
      outCount: data.outCount,
      totalCount: data.inCount + data.outCount,
    })
  }

  // Sort newest first
  closings.sort((a, b) => b.dateKey.localeCompare(a.dateKey))

  // Compute end-of-day balance for each day going backwards from current balance
  // Day 0 (newest) closing balance = current balance
  // Day 1 closing balance = current balance - Day 0 net
  // Day 2 closing balance = current balance - Day 0 net - Day 1 net
  // etc.
  // Only keep known tokens in the running balance, guard against NaN
  const runningBalance: Record<string, number> = {}
  for (const [sym, val] of Object.entries(currentBalances)) {
    if (isLegitToken(sym) && isFinite(val)) runningBalance[sym] = val
  }
  for (const day of closings) {
    day.balanceByToken = { ...runningBalance }
    // Subtract this day's net to get the previous day's closing balance
    for (const [sym, net] of Object.entries(day.netByToken)) {
      runningBalance[sym] = (runningBalance[sym] ?? 0) - net
    }
  }

  return closings
}

/* ── Helpers ──────────────────────────────────────────── */

function fmtNum(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const MAX_VISIBLE_TOKENS = 3

function TokenAmountList({
  byToken,
  color,
  prefix,
  perTokenSign,
}: {
  byToken: Record<string, number>
  color: string
  prefix: string
  /** If true, each token gets its own +/- sign and green/red color */
  perTokenSign?: boolean
}) {
  const entries = Object.entries(byToken).sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
  if (entries.length === 0) {
    return <span className="text-black/20">—</span>
  }

  const visible = entries.slice(0, MAX_VISIBLE_TOKENS)
  const hiddenCount = entries.length - visible.length

  return (
    <div className="space-y-0.5">
      {visible.map(([sym, amount]) => {
        const tokenColor = perTokenSign ? (amount >= 0 ? 'text-green' : 'text-red') : color
        const tokenPrefix = perTokenSign ? (amount >= 0 ? '+' : '-') : prefix
        const displayAmount = Math.abs(amount)

        return (
          <div key={sym} className="flex items-baseline justify-end gap-1 whitespace-nowrap">
            <span className={`font-mono text-xs font-semibold tabular-nums ${tokenColor}`}>
              {tokenPrefix}
              {fmtNum(displayAmount)}
            </span>
            <span className="text-[10px] text-black/35">{sym}</span>
          </div>
        )
      })}
      {hiddenCount > 0 && (
        <span className="text-[10px] text-black/25">+{hiddenCount} more</span>
      )}
    </div>
  )
}

function BalanceList({ balanceByToken }: { balanceByToken: Record<string, number> }) {
  // Only show USDT balance
  const usdtBalance = balanceByToken['USDT']
  if (usdtBalance == null || !isFinite(usdtBalance)) {
    return <span className="text-black/20">—</span>
  }
  return (
    <div className="flex items-baseline justify-end gap-1">
      <span className="font-mono text-xs font-bold tabular-nums text-black/80">
        {fmtNum(usdtBalance)}
      </span>
      <span className="text-[10px] font-medium text-black/35">USDT</span>
    </div>
  )
}

/* ── Props ────────────────────────────────────────────── */

interface WalletDailyClosingProps {
  transfers: NormalizedTransfer[]
  isLoading: boolean
  /** Current token balances: { USDT: 208705.75, TRX: 109.85 } */
  currentBalances: Record<string, number>
}

const TH = 'h-9 px-3 text-xs font-semibold uppercase tracking-wider text-black/40 whitespace-nowrap'

/* ── Component ────────────────────────────────────────── */

export function WalletDailyClosing({
  transfers,
  isLoading,
  currentBalances,
}: WalletDailyClosingProps) {
  const { t, i18n } = useTranslation('pages')

  const closings = useMemo(
    () => computeDailyClosings(transfers, i18n.language, currentBalances),
    [transfers, i18n.language, currentBalances],
  )

  if (isLoading && transfers.length === 0) {
    return (
      <div className="space-y-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (closings.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-black/40">
        {t('accounting.dailyClosing.noData')}
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-black/10 overflow-hidden">
      <div className="max-h-[75vh] overflow-y-auto">
        <Table className="table-fixed" cardOnMobile>
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[10%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
          </colgroup>
          <TableHeader className="sticky top-0 z-10 bg-bg1">
            <TableRow className="bg-black/[0.02]">
              <TableHead className={TH}>{t('accounting.dailyClosing.date')}</TableHead>
              <TableHead className={TH}>{t('accounting.dailyClosing.tx')}</TableHead>
              <TableHead className={`${TH} text-right`}>
                <span className="inline-flex items-center gap-1">
                  <ArrowDown size={11} weight="bold" className="text-green" />
                  {t('accounting.dailyClosing.in')}
                </span>
              </TableHead>
              <TableHead className={`${TH} text-right`}>
                <span className="inline-flex items-center gap-1">
                  <ArrowUp size={11} weight="bold" className="text-red" />
                  {t('accounting.dailyClosing.out')}
                </span>
              </TableHead>
              <TableHead className={`${TH} text-right`}>
                <span className="inline-flex items-center gap-1">
                  <Minus size={11} weight="bold" className="text-black/40" />
                  {t('accounting.dailyClosing.net')}
                </span>
              </TableHead>
              <TableHead className={`${TH} text-right`}>
                {t('accounting.dailyClosing.balance')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closings.map((day) => (
              <TableRow key={day.dateKey} className="hover:bg-black/[0.01]">
                {/* Date */}
                <TableCell className="px-3 py-3" data-label={t('accounting.dailyClosing.date')}>
                  <div className="truncate">
                    <span className="text-sm font-medium text-black/80">{day.label}</span>
                    <span className="ml-1 text-[10px] text-black/25">
                      {day.dateKey !== 'unknown' ? day.dateKey : ''}
                    </span>
                  </div>
                </TableCell>

                {/* Transfer count */}
                <TableCell className="px-3 py-3" data-label={t('accounting.dailyClosing.tx')}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs tabular-nums text-black/50">{day.totalCount}</span>
                    <span className="text-[10px] text-black/25 whitespace-nowrap">
                      ({day.inCount}↓ {day.outCount}↑)
                    </span>
                  </div>
                </TableCell>

                {/* IN */}
                <TableCell
                  className="px-3 py-3 text-right"
                  data-label={t('accounting.dailyClosing.in')}
                >
                  <TokenAmountList byToken={day.inByToken} color="text-green" prefix="+" />
                </TableCell>

                {/* OUT */}
                <TableCell
                  className="px-3 py-3 text-right"
                  data-label={t('accounting.dailyClosing.out')}
                >
                  <TokenAmountList byToken={day.outByToken} color="text-red" prefix="-" />
                </TableCell>

                {/* NET */}
                <TableCell
                  className="px-3 py-3 text-right"
                  data-label={t('accounting.dailyClosing.net')}
                >
                  <TokenAmountList byToken={day.netByToken} color="" prefix="" perTokenSign />
                </TableCell>

                {/* BALANCE */}
                <TableCell
                  className="px-3 py-3 text-right"
                  data-label={t('accounting.dailyClosing.balance')}
                >
                  <BalanceList balanceByToken={day.balanceByToken} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
