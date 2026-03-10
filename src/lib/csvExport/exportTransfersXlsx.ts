import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { supabase } from '@/lib/supabase'
import { localDayStart, localDayEnd } from '@/lib/date'
import type { TransferRow } from '@/hooks/useTransfers'

/* ── Constants ────────────────────────────────────────── */

const SELECT_QUERY =
  '*, category:transfer_categories!category_id(name, is_deposit), payment_method:payment_methods!payment_method_id(name), psp:psps!psp_id(name, commission_rate), type:transfer_types!type_id(name)'

const BATCH_SIZE = 1000

const HEADERS = [
  'CRM ID',
  'META ID',
  'AD SOYAD',
  'ÖDEME ŞEKLİ',
  'ŞİRKET',
  'TARİH',
  'KATEGORİ',
  'TUTAR',
  'PARA BİRİMİ',
  'KASA',
  'TÜR',
  'İŞLEM TARİH/SAAT',
  'PERSONEL',
]

/* ── Turkish label maps ───────────────────────────────── */

const PAYMENT_METHOD_TR: Record<string, string> = {
  Bank: 'BANKA',
  'Credit Card': 'KREDİ KARTI',
  Tether: 'Tether',
}

const TYPE_TR: Record<string, string> = {
  Client: 'MÜŞTERİ',
  Payment: 'ÖDEME',
  Blocked: 'BLOKE',
}

/** Normalize currency codes: TL → TRY */
function normalizeCurrency(raw: string): string {
  if (raw === 'TL') return 'TRY'
  return raw
}

/* ── Color constants ──────────────────────────────────── */

const HEADER_BG = 'FF2F2F2F'
const HEADER_FG = 'FFFFFFFF'
const PERSONEL_COLOR = 'F4CCCC'
const KASA_COLOR = 'D9D2E9'

/* ── Helpers ──────────────────────────────────────────── */

function formatDateDMY(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

function formatDateTimeDMY(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${mins}`
}

function fillCell(cell: ExcelJS.Cell, color: string | undefined) {
  if (!color) return
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${color}` },
  }
}

function borderAll(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  }
}

/** Helper: exceljs column letter from 1-based index */
function colLetter(idx: number): string {
  let s = ''
  let n = idx
  while (n > 0) {
    n--
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26)
  }
  return s
}

/* ── Conditional formatting builder ───────────────────── */

interface CfRule {
  value: string
  color: string // 6-hex without FF prefix
}

function addConditionalFormatting(
  ws: ExcelJS.Worksheet,
  colIdx: number,
  startRow: number,
  endRow: number,
  rules: CfRule[],
) {
  const letter = colLetter(colIdx)
  const ref = `${letter}${startRow}:${letter}${endRow}`

  for (const rule of rules) {
    ws.addConditionalFormatting({
      ref,
      rules: [
        {
          type: 'containsText',
          operator: 'containsText',
          text: rule.value,
          style: {
            fill: {
              type: 'pattern',
              pattern: 'solid',
              bgColor: { argb: `FF${rule.color}` },
            },
          },
          priority: 1,
        },
      ],
    })
  }
}

/* ── Data fetching ────────────────────────────────────── */

export async function fetchAllTransfersForPeriod(
  orgId: string,
  dateFrom: string,
  dateTo: string,
  onProgress?: (count: number) => void,
): Promise<TransferRow[]> {
  const all: TransferRow[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('transfers')
      .select(SELECT_QUERY)
      .eq('organization_id', orgId)
      .gte('transfer_date', localDayStart(dateFrom))
      .lte('transfer_date', localDayEnd(dateTo))
      .order('transfer_date', { ascending: true })
      .order('created_at', { ascending: true })
      .range(from, from + BATCH_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    all.push(...(data as unknown as TransferRow[]))
    onProgress?.(all.length)

    if (data.length < BATCH_SIZE) break
    from += BATCH_SIZE
  }

  return all
}

export async function resolveProfileNames(
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (userIds.length === 0) return map

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .in('id', userIds)

  if (data) {
    for (const p of data) {
      map.set(p.id, p.display_name ?? p.email ?? p.id.slice(0, 8))
    }
  }

  return map
}

/* ── Excel generation ─────────────────────────────────── */

export async function exportTransfersXlsx(
  transfers: TransferRow[],
  profileMap: Map<string, string>,
  orgName: string,
  dateLabel: string,
  pspNames?: string[],
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Transferler')

  // Column indices (1-based in exceljs)
  const COL = {
    CRM_ID: 1,
    META_ID: 2,
    AD_SOYAD: 3,
    ODEME_SEKLI: 4,
    SIRKET: 5,
    TARIH: 6,
    KATEGORI: 7,
    TUTAR: 8,
    PARA_BIRIMI: 9,
    KASA: 10,
    TUR: 11,
    ISLEM_TARIH: 12,
    PERSONEL: 13,
  }

  // -- Add header row --
  const headerRow = ws.addRow(HEADERS)
  headerRow.height = 22
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FG }, size: 10, name: 'Calibri' }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_BG },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    }
  })

  // Collect unique values from data for dynamic dropdowns
  const kasaSet = new Set<string>()
  const odemeSekliSet = new Set<string>()
  const turSet = new Set<string>()
  const paraBirimiSet = new Set<string>(['TRY', 'USD', 'USDT'])
  const sirketSet = new Set<string>()
  sirketSet.add(orgName)

  // Pre-compute mapped values for each transfer
  const mappedRows = transfers.map((t) => {
    const paymentMethodTr = PAYMENT_METHOD_TR[t.payment_method?.name ?? ''] ?? t.payment_method?.name ?? ''
    const kategori = t.category?.is_deposit ? 'YATIRIM' : 'ÇEKİM'
    const typeTr = TYPE_TR[t.type?.name ?? ''] ?? t.type?.name ?? ''
    const personelId = t.updated_by ?? t.created_by ?? ''
    const personel = profileMap.get(personelId) ?? ''
    const kasaName = t.psp?.name ?? ''
    const currency = normalizeCurrency(t.currency)

    if (kasaName) kasaSet.add(kasaName)
    if (paymentMethodTr) odemeSekliSet.add(paymentMethodTr)
    if (typeTr) turSet.add(typeTr)
    if (currency) paraBirimiSet.add(currency)

    return { t, paymentMethodTr, kategori, typeTr, personel, kasaName, currency }
  })

  // -- Add data rows --
  for (const { t, paymentMethodTr, kategori, typeTr, personel, kasaName, currency } of mappedRows) {
    const row = ws.addRow([
      t.crm_id ?? '',
      t.meta_id ?? '',
      t.full_name,
      paymentMethodTr,
      orgName,
      formatDateDMY(t.transfer_date),
      kategori,
      Math.abs(t.amount),
      currency,
      kasaName,
      typeTr,
      formatDateTimeDMY(t.created_at),
      personel,
    ])

    row.height = 18
    row.font = { size: 10, name: 'Calibri' }

    // Borders on all cells
    row.eachCell({ includeEmpty: true }, (cell) => {
      borderAll(cell)
    })

    // Static colors for KASA and PERSONEL (no dropdown change needed)
    fillCell(row.getCell(COL.KASA), KASA_COLOR)
    fillCell(row.getCell(COL.PERSONEL), PERSONEL_COLOR)

    // Number format for TUTAR
    row.getCell(COL.TUTAR).numFmt = '#,##0.00'
    row.getCell(COL.TUTAR).alignment = { horizontal: 'right' }

    // Center align specific columns
    row.getCell(COL.CRM_ID).alignment = { horizontal: 'center' }
    row.getCell(COL.META_ID).alignment = { horizontal: 'center' }
    row.getCell(COL.TARIH).alignment = { horizontal: 'center' }
    row.getCell(COL.PARA_BIRIMI).alignment = { horizontal: 'center' }
    row.getCell(COL.ISLEM_TARIH).alignment = { horizontal: 'center' }
  }

  // -- Data validation (dropdowns) & conditional formatting --
  const dataRowCount = transfers.length
  if (dataRowCount > 0) {
    const startRow = 2
    const endRow = startRow + dataRowCount - 1

    // Build dynamic dropdown lists from actual data
    const kasaList = pspNames?.length ? pspNames : [...kasaSet]
    const odemeSekliList = [...odemeSekliSet]
    const turList = [...turSet]
    const paraBirimiList = [...paraBirimiSet]
    const sirketList = [...sirketSet]

    const mkFormula = (items: string[]) => items.length > 0 ? `"${items.join(',')}"` : undefined

    const odemeSekliFormula = mkFormula(odemeSekliList)
    const sirketFormula = mkFormula(sirketList)
    const paraBirimiFormula = mkFormula(paraBirimiList)
    const kasaFormula = mkFormula(kasaList)
    const turFormula = mkFormula(turList)

    for (let r = startRow; r <= endRow; r++) {
      if (odemeSekliFormula) {
        ws.getCell(r, COL.ODEME_SEKLI).dataValidation = {
          type: 'list',
          allowBlank: true,
          showDropDown: true,
          formulae: [odemeSekliFormula],
        }
      }

      if (sirketFormula) {
        ws.getCell(r, COL.SIRKET).dataValidation = {
          type: 'list',
          allowBlank: true,
          showDropDown: true,
          formulae: [sirketFormula],
        }
      }

      ws.getCell(r, COL.KATEGORI).dataValidation = {
        type: 'list',
        allowBlank: true,
        showDropDown: true,
        formulae: ['"YATIRIM,ÇEKİM"'],
      }

      if (paraBirimiFormula) {
        ws.getCell(r, COL.PARA_BIRIMI).dataValidation = {
          type: 'list',
          allowBlank: true,
          showDropDown: true,
          formulae: [paraBirimiFormula],
        }
      }

      if (kasaFormula) {
        ws.getCell(r, COL.KASA).dataValidation = {
          type: 'list',
          allowBlank: true,
          showDropDown: true,
          formulae: [kasaFormula],
        }
      }

      if (turFormula) {
        ws.getCell(r, COL.TUR).dataValidation = {
          type: 'list',
          allowBlank: true,
          showDropDown: true,
          formulae: [turFormula],
        }
      }
    }

    // -- Conditional formatting: colors update when dropdown value changes --

    // ÖDEME ŞEKLİ
    addConditionalFormatting(ws, COL.ODEME_SEKLI, startRow, endRow, [
      { value: 'BANKA', color: 'BDD7EE' },
      { value: 'Tether', color: 'C6EFCE' },
      { value: 'KREDİ KARTI', color: 'FCE4D6' },
    ])

    // KATEGORİ
    addConditionalFormatting(ws, COL.KATEGORI, startRow, endRow, [
      { value: 'YATIRIM', color: 'C6EFCE' },
      { value: 'ÇEKİM', color: 'FFC7CE' },
    ])

    // PARA BİRİMİ
    addConditionalFormatting(ws, COL.PARA_BIRIMI, startRow, endRow, [
      { value: 'TRY', color: 'B6D7A8' },
      { value: 'USD', color: 'BDD7EE' },
      { value: 'USDT', color: 'D9D2E9' },
    ])

    // TÜR
    addConditionalFormatting(ws, COL.TUR, startRow, endRow, [
      { value: 'MÜŞTERİ', color: 'FCE4D6' },
      { value: 'ÖDEME', color: 'BDD7EE' },
      { value: 'BLOKE', color: 'FFC7CE' },
    ])
  }

  // -- Column widths --
  ws.getColumn(COL.CRM_ID).width = 12
  ws.getColumn(COL.META_ID).width = 12
  ws.getColumn(COL.AD_SOYAD).width = 24
  ws.getColumn(COL.ODEME_SEKLI).width = 16
  ws.getColumn(COL.SIRKET).width = 14
  ws.getColumn(COL.TARIH).width = 14
  ws.getColumn(COL.KATEGORI).width = 14
  ws.getColumn(COL.TUTAR).width = 16
  ws.getColumn(COL.PARA_BIRIMI).width = 14
  ws.getColumn(COL.KASA).width = 18
  ws.getColumn(COL.TUR).width = 14
  ws.getColumn(COL.ISLEM_TARIH).width = 22
  ws.getColumn(COL.PERSONEL).width = 16

  // -- Freeze header row --
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0, activeCell: 'A2', topLeftCell: 'A2' }]

  // -- Auto-filter on all columns --
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1 + dataRowCount, column: 13 },
  }

  // -- Generate and download --
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const safeName = orgName.replace(/\s+/g, '_')
  saveAs(blob, `transferler-${safeName}-${dateLabel}.xlsx`)
}
