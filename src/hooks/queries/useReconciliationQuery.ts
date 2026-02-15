import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { AccountingEntry } from '@/lib/database.types'
import type {
  AccountingMonthlyConfig,
  ReconciliationData,
  RegisterReconciliation,
  TeyitEntry,
} from '@/pages/accounting/reconciliationTypes'

/* ── Helpers ─────────────────────────────────────────── */

const REGISTERS = ['USDT', 'NAKIT_TL', 'NAKIT_USD'] as const

const REGISTER_CURRENCY: Record<string, string> = {
  USDT: 'USDT',
  NAKIT_TL: 'TL',
  NAKIT_USD: 'USD',
}

/** Get first and last day of a month as YYYY-MM-DD strings */
function monthRange(year: number, month: number) {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const last = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { first, last }
}

/** Get previous month's year/month */
function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

/**
 * Auto-derive KUR from USDT↔TL transfer entries in the month.
 * Looks for TRANSFER entries where USDT amount goes out and TL comes in
 * on the same date, computes weighted average rate.
 */
function deriveKurFromEntries(entries: AccountingEntry[]): number | null {
  const transfers = entries.filter((e) => e.entry_type === 'TRANSFER')

  // Group by date
  const byDate = new Map<string, AccountingEntry[]>()
  for (const t of transfers) {
    const key = t.entry_date.slice(0, 10)
    const arr = byDate.get(key) ?? []
    arr.push(t)
    byDate.set(key, arr)
  }

  let totalTl = 0
  let totalUsdt = 0

  for (const dayEntries of byDate.values()) {
    // Find USDT outgoing and TL incoming on the same date
    const usdtOut = dayEntries.filter(
      (e) => e.direction === 'out' && e.currency === 'USDT' && e.register === 'USDT',
    )
    const tlIn = dayEntries.filter(
      (e) => e.direction === 'in' && e.currency === 'TL' && e.register === 'NAKIT_TL',
    )

    if (usdtOut.length > 0 && tlIn.length > 0) {
      const usdtSum = usdtOut.reduce((s, e) => s + Number(e.amount), 0)
      const tlSum = tlIn.reduce((s, e) => s + Number(e.amount), 0)
      if (usdtSum > 0) {
        totalTl += tlSum
        totalUsdt += usdtSum
      }
    }
  }

  if (totalUsdt > 0) {
    return totalTl / totalUsdt
  }
  return null
}

/**
 * Compute per-register GİREN/ÇIKAN from entries.
 */
function computeRegisterTotals(entries: AccountingEntry[]) {
  const map = new Map<string, { giren: number; cikan: number }>()
  for (const reg of REGISTERS) {
    map.set(reg, { giren: 0, cikan: 0 })
  }

  for (const e of entries) {
    const totals = map.get(e.register)
    if (!totals) continue
    const amount = Number(e.amount)
    if (e.direction === 'in') {
      totals.giren += amount
    } else {
      totals.cikan += amount
    }
  }

  return map
}

/* ── Main hook ───────────────────────────────────────── */

export function useReconciliationQuery(year: number, month: number) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const { first, last } = monthRange(year, month)
  const prev = prevMonth(year, month)
  const prevRange = monthRange(prev.year, prev.month)

  // Fetch current month entries
  const entriesQuery = useQuery({
    queryKey: queryKeys.accounting.reconciliation(orgId, year, month),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_entries')
        .select('*')
        .eq('organization_id', orgId)
        .gte('entry_date', first)
        .lte('entry_date', last)
        .order('entry_date', { ascending: true })

      if (error) throw error
      return (data as AccountingEntry[]) ?? []
    },
    enabled: !!currentOrg,
  })

  // Fetch current month config
  const configQuery = useQuery({
    queryKey: queryKeys.accounting.config(orgId, year, month),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_monthly_config')
        .select('*')
        .eq('organization_id', orgId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle()

      if (error) throw error
      return (data as AccountingMonthlyConfig | null) ?? null
    },
    enabled: !!currentOrg,
  })

  // Fetch previous month data (entries + config) for auto DEVİR
  const prevQuery = useQuery({
    queryKey: [
      ...queryKeys.accounting.reconciliation(orgId, prev.year, prev.month),
      'prev',
    ] as const,
    queryFn: async () => {
      const [entriesRes, configRes] = await Promise.all([
        supabase
          .from('accounting_entries')
          .select('*')
          .eq('organization_id', orgId)
          .gte('entry_date', prevRange.first)
          .lte('entry_date', prevRange.last),
        supabase
          .from('accounting_monthly_config')
          .select('*')
          .eq('organization_id', orgId)
          .eq('year', prev.year)
          .eq('month', prev.month)
          .maybeSingle(),
      ])

      if (entriesRes.error) throw entriesRes.error
      return {
        entries: (entriesRes.data as AccountingEntry[]) ?? [],
        config: (configRes.data as AccountingMonthlyConfig | null) ?? null,
      }
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60 * 1000,
  })

  // Compute reconciliation data
  const isLoading = entriesQuery.isLoading || configQuery.isLoading || prevQuery.isLoading
  const error = entriesQuery.error ?? configQuery.error ?? prevQuery.error

  let data: ReconciliationData | null = null

  if (entriesQuery.data && !isLoading) {
    const entries = entriesQuery.data
    const config = configQuery.data ?? null
    const prevData = prevQuery.data ?? null

    // Compute current month register totals
    const currentTotals = computeRegisterTotals(entries)

    // Compute previous month register totals for auto DEVİR
    const prevTotals = prevData ? computeRegisterTotals(prevData.entries) : null
    const prevConfig = prevData?.config ?? null

    // Determine KUR
    const autoKur = deriveKurFromEntries(entries)
    const kur = config?.kur != null ? Number(config.kur) : (autoKur ?? 1)
    const kurIsOverride = config?.kur != null

    // Build register summaries
    const registers: RegisterReconciliation[] = REGISTERS.map((reg) => {
      const totals = currentTotals.get(reg)!
      const giren = totals.giren
      const cikan = totals.cikan
      const net = giren - cikan

      // DEVİR: config override → auto (prev devir + prev net) → 0
      const devirOverrideMap: Record<string, number | null | undefined> = {
        USDT: config?.devir_usdt,
        NAKIT_TL: config?.devir_nakit_tl,
        NAKIT_USD: config?.devir_nakit_usd,
      }
      const override = devirOverrideMap[reg]
      let devir = 0
      let devirIsOverride = false

      if (override != null) {
        devir = Number(override)
        devirIsOverride = true
      } else if (prevTotals) {
        const prevT = prevTotals.get(reg)
        const prevNet = prevT ? prevT.giren - prevT.cikan : 0
        // Previous month's DEVİR
        const prevDevirMap: Record<string, number | null | undefined> = {
          USDT: prevConfig?.devir_usdt,
          NAKIT_TL: prevConfig?.devir_nakit_tl,
          NAKIT_USD: prevConfig?.devir_nakit_usd,
        }
        const prevDevir = prevDevirMap[reg] != null ? Number(prevDevirMap[reg]) : 0
        devir = prevDevir + prevNet
      }

      // USD ÇEVRİM
      let usdCevrim: number
      if (reg === 'NAKIT_TL') {
        usdCevrim = kur > 0 ? net / kur : 0
      } else {
        usdCevrim = net // USDT and USD are 1:1
      }

      return {
        register: reg,
        devir,
        devirIsOverride,
        giren,
        cikan,
        net,
        usdCevrim,
        currency: REGISTER_CURRENCY[reg],
      }
    })

    // KASA TOPLAM
    const kasaToplam = registers.reduce((sum, r) => sum + r.usdCevrim, 0)

    // BEKL. TAHS
    const beklTahs = config?.bekl_tahs != null ? Number(config.bekl_tahs) : 0

    // TEYİT
    const teyitEntries: TeyitEntry[] = (config?.teyit_entries as TeyitEntry[]) ?? []
    const teyitNet = teyitEntries.reduce((sum, entry) => {
      if (entry.currency === 'TL') {
        return sum + (kur > 0 ? entry.amount / kur : 0)
      }
      return sum + entry.amount
    }, 0)

    const fark = teyitNet - kasaToplam

    data = {
      year,
      month,
      registers,
      kur,
      kurIsOverride,
      kasaToplam,
      beklTahs,
      teyitEntries,
      teyitNet,
      fark,
    }
  }

  return {
    data,
    isLoading,
    error: error instanceof Error ? error.message : null,
    /** Expose auto-derived KUR so the UI can show it as placeholder */
    autoKur: entriesQuery.data ? deriveKurFromEntries(entriesQuery.data) : null,
    /** Expose raw config for initializing the settings form */
    config: configQuery.data ?? null,
  }
}
