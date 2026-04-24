import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { NormalizedTransfer } from '@/lib/tatumServiceSecure'
import { isKnownToken } from '@/pages/accounting/WalletTransfersTable'

/* ── Types ──────────────────────────────────────────────── */

export interface DailyClosingRow {
  dateKey: string
  label: string
  inCount: number
  outCount: number
  totalCount: number
  inByToken: Record<string, number>
  outByToken: Record<string, number>
  netByToken: Record<string, number>
  balanceByToken: Record<string, number>
}

/* ── Helpers ─────────────────────────────────────────────── */

/** Format timestamp → DD.MM.YYYY */
function formatDateDMY(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

/** Format timestamp → DD.MM.YYYY HH:mm:ss */
function formatDateTimeDMY(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`
}

/** Get YYYY-MM-DD date key from timestamp */
function getDateKey(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Known tokens whitelist (filter out spam) */
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
  'BNB',
  'WBNB',
  'ETH',
  'WETH',
  'SOL',
  'BTC',
  'WBTC',
  'DAI',
  'BUSD',
])

function isLegitToken(symbol: string): boolean {
  if (!symbol) return false
  if (KNOWN_TOKENS.has(symbol)) return true
  if (/^0x/i.test(symbol)) return false
  if (/[\s.]|www|\.com|\.net|\.org|http/i.test(symbol)) return false
  if (/^fungible$/i.test(symbol)) return false
  if (symbol.length > 10) return false
  return true
}

/** Apply thin borders to a cell */
function borderAll(cell: ExcelJS.Cell) {
  const thin: ExcelJS.Border = { style: 'thin', color: { argb: 'FFD0D0D0' } }
  cell.border = { top: thin, left: thin, bottom: thin, right: thin }
}

/* ── Filter transfers by date range ──────────────────────── */

export function filterTransfersByDateRange(
  transfers: NormalizedTransfer[],
  dateFrom: string,
  dateTo: string,
): NormalizedTransfer[] {
  return transfers.filter((tx) => {
    if (!tx.timestamp) return false
    const key = getDateKey(tx.timestamp)
    return key >= dateFrom && key <= dateTo
  })
}

/* ── Compute daily closings from transfers ───────────────── */

export function computeDailyClosings(
  transfers: NormalizedTransfer[],
  currentBalances: Record<string, number>,
): DailyClosingRow[] {
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
    if (!isLegitToken(symbol) || !amount) continue

    const dateKey = getDateKey(tx.timestamp)
    if (!dateKey) continue

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

  const closings: DailyClosingRow[] = []
  for (const [dateKey, data] of map) {
    const allSymbols = new Set([...Object.keys(data.inByToken), ...Object.keys(data.outByToken)])
    const netByToken: Record<string, number> = {}
    for (const sym of allSymbols) {
      netByToken[sym] = (data.inByToken[sym] ?? 0) - (data.outByToken[sym] ?? 0)
    }

    const d = new Date(dateKey + 'T00:00:00')
    const label = d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'short',
    })

    closings.push({
      dateKey,
      label,
      inByToken: data.inByToken,
      outByToken: data.outByToken,
      netByToken,
      balanceByToken: {},
      inCount: data.inCount,
      outCount: data.outCount,
      totalCount: data.inCount + data.outCount,
    })
  }

  // Sort newest first
  closings.sort((a, b) => b.dateKey.localeCompare(a.dateKey))

  // Compute end-of-day balances going backwards from current balance
  const runningBalance: Record<string, number> = {}
  for (const [sym, val] of Object.entries(currentBalances)) {
    if (isLegitToken(sym) && isFinite(val)) runningBalance[sym] = val
  }
  for (const day of closings) {
    day.balanceByToken = { ...runningBalance }
    for (const [sym, net] of Object.entries(day.netByToken)) {
      runningBalance[sym] = (runningBalance[sym] ?? 0) - net
    }
  }

  return closings
}

/* ── Shared helpers ──────────────────────────────────────── */

function makeHeaderRow(ws: ExcelJS.Worksheet, headers: { header: string; width: number }[]) {
  ws.columns = headers.map((h) => ({ width: h.width }))
  const row = ws.getRow(1)
  headers.forEach((col, idx) => {
    const cell = row.getCell(idx + 1)
    cell.value = col.header
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    borderAll(cell)
  })
  row.height = 28
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }]
}

function saveWorkbook(wb: ExcelJS.Workbook, filename: string) {
  return wb.xlsx.writeBuffer().then((buf) => {
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    saveAs(blob, filename)
  })
}

function safeLabelName(label: string) {
  return label.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)
}

/* ── Export Transfers ────────────────────────────────────── */

export async function exportWalletTransfersXlsx(
  transfers: NormalizedTransfer[],
  walletLabel: string,
  chain: string,
  dateLabel: string,
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'PipLinePro'
  wb.created = new Date()

  const ws = wb.addWorksheet('Transferler')

  const COLUMNS = [
    { header: 'TARİH', width: 14 },
    { header: 'SAAT', width: 20 },
    { header: 'YÖN', width: 10 },
    { header: 'TUTAR', width: 18 },
    { header: 'TOKEN', width: 30 },
    { header: 'KİMDEN', width: 42 },
    { header: 'KİME', width: 42 },
    { header: 'TX HASH', width: 50 },
    { header: 'BLOK', width: 14 },
  ]

  makeHeaderRow(ws, COLUMNS)

  for (let i = 0; i < transfers.length; i++) {
    const tx = transfers[i]
    const row = ws.getRow(i + 2)
    const values = [
      formatDateDMY(tx.timestamp),
      formatDateTimeDMY(tx.timestamp),
      tx.direction === 'in' ? 'GİRİŞ' : 'ÇIKIŞ',
      parseFloat(tx.amount) || 0,
      isKnownToken(chain, tx.tokenAddress)
        ? tx.symbol || ''
        : `Bilinmeyen / Sahte Token (${tx.tokenAddress ? tx.tokenAddress.slice(0, 10) + '…' : ''})`,
      tx.fromAddress || tx.counterAddress || '',
      tx.toAddress || tx.counterAddress || '',
      tx.hash || '',
      tx.blockNumber ?? '',
    ]

    values.forEach((val, idx) => {
      const cell = row.getCell(idx + 1)
      cell.value = val
      cell.font = { size: 10 }
      cell.alignment = { vertical: 'middle' }
      borderAll(cell)
    })

    // Amount formatting
    const amountCell = row.getCell(4)
    amountCell.numFmt = '#,##0.00'
    amountCell.alignment = { vertical: 'middle', horizontal: 'right' }

    // Block number formatting
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' }

    // Direction + Amount cell colors (green for in, red for out)
    const isIn = tx.direction === 'in'
    const dirCell = row.getCell(3)
    dirCell.alignment = { vertical: 'middle', horizontal: 'center' }
    dirCell.font = { size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    dirCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isIn ? 'FF22C55E' : 'FFEF4444' },
    }
    amountCell.font = {
      size: 10,
      bold: true,
      color: { argb: isIn ? 'FF16A34A' : 'FFDC2626' },
    }

    row.height = 22
  }

  if (transfers.length > 0) {
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: transfers.length + 1, column: COLUMNS.length },
    }
  }

  const safeName = safeLabelName(walletLabel)
  await saveWorkbook(wb, `cuzdan-transferler-${safeName}-${chain}-${dateLabel}.xlsx`)
}

/* ── Export Daily Closings ───────────────────────────────── */

export async function exportWalletDailyClosingsXlsx(
  dailyClosings: DailyClosingRow[],
  walletLabel: string,
  chain: string,
  dateLabel: string,
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'PipLinePro'
  wb.created = new Date()

  // Collect all unique tokens
  const allTokens = new Set<string>()
  for (const day of dailyClosings) {
    for (const sym of Object.keys(day.inByToken)) allTokens.add(sym)
    for (const sym of Object.keys(day.outByToken)) allTokens.add(sym)
    for (const sym of Object.keys(day.balanceByToken)) {
      if (isLegitToken(sym)) allTokens.add(sym)
    }
  }
  // Exclude native chain tokens (TRX, ETH, BNB, SOL, BTC) — only show stablecoins/tokens
  const EXCLUDED_TOKENS = new Set([
    'TRX',
    'WTRX',
    'ETH',
    'WETH',
    'BNB',
    'WBNB',
    'SOL',
    'BTC',
    'WBTC',
  ])
  const tokens = [...allTokens].filter((t) => !EXCLUDED_TOKENS.has(t)).sort()

  const ws = wb.addWorksheet('Günlük Kapanış')

  // Build columns
  const headers: { header: string; width: number }[] = [
    { header: 'TARİH', width: 22 },
    { header: 'İŞLEM ADEDİ', width: 14 },
    { header: 'GİRİŞ ADEDİ', width: 14 },
    { header: 'ÇIKIŞ ADEDİ', width: 14 },
  ]
  for (const token of tokens) {
    headers.push(
      { header: `${token} GİRİŞ`, width: 16 },
      { header: `${token} ÇIKIŞ`, width: 16 },
      { header: `${token} NET`, width: 16 },
      { header: `${token} BAKİYE`, width: 18 },
    )
  }

  makeHeaderRow(ws, headers)
  ws.getRow(1).height = 30

  for (let i = 0; i < dailyClosings.length; i++) {
    const day = dailyClosings[i]
    const row = ws.getRow(i + 2)

    // Base columns
    const baseValues = [day.label, day.totalCount, day.inCount, day.outCount]
    baseValues.forEach((val, idx) => {
      const cell = row.getCell(idx + 1)
      cell.value = val
      cell.font = { size: 10 }
      cell.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'left' : 'center' }
      borderAll(cell)
    })
    // Color GİRİŞ ADEDİ (col 3) green, ÇIKIŞ ADEDİ (col 4) red
    if (day.inCount > 0) {
      row.getCell(3).font = { size: 10, bold: true, color: { argb: 'FF16A34A' } }
    }
    if (day.outCount > 0) {
      row.getCell(4).font = { size: 10, bold: true, color: { argb: 'FFDC2626' } }
    }

    // Per-token columns
    let colOffset = 5
    for (const token of tokens) {
      const inVal = day.inByToken[token] ?? 0
      const outVal = day.outByToken[token] ?? 0
      const netVal = day.netByToken[token] ?? 0
      const balVal = day.balanceByToken[token] ?? 0

      // idx: 0=GİRİŞ, 1=ÇIKIŞ, 2=NET, 3=BAKİYE
      const vals = [inVal, outVal, netVal, balVal]
      vals.forEach((val, idx) => {
        const cell = row.getCell(colOffset + idx)
        cell.value = val || ''
        cell.numFmt = '#,##0.00'
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
        borderAll(cell)

        if (idx === 0 && val > 0) {
          // GİRİŞ → green
          cell.font = { size: 10, bold: true, color: { argb: 'FF16A34A' } }
        } else if (idx === 1 && val > 0) {
          // ÇIKIŞ → red
          cell.font = { size: 10, bold: true, color: { argb: 'FFDC2626' } }
        } else if (idx === 2 && val !== 0) {
          // NET → green if positive, red if negative
          cell.font = { size: 10, bold: true, color: { argb: val > 0 ? 'FF16A34A' : 'FFDC2626' } }
        } else {
          cell.font = { size: 10 }
        }
      })
      colOffset += 4
    }

    row.height = 22
  }

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: dailyClosings.length + 1, column: headers.length },
  }

  const safeName = safeLabelName(walletLabel)
  await saveWorkbook(wb, `cuzdan-gunluk-kapanis-${safeName}-${chain}-${dateLabel}.xlsx`)
}
