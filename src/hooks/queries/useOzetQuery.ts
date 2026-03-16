import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface OzetDayRaw {
  day: string
  deposits: number
  withdrawals: number
  commission: number
  net: number
  settlement: number
  transfer_count: number
}

export interface OzetDay extends OzetDayRaw {
  total: number
  devir: number
  kasaTop: number
  finansPct: number // commission / deposits × 100 (0 when no deposits)
}

export interface OzetPspTotals {
  deposits: number
  withdrawals: number
  commission: number
  net: number
  settlement: number
  transfers: number
  finansPct: number
}

export interface OzetPsp {
  pspId: string
  pspName: string
  commissionRate: number
  initialBalance: number
  preMonthBalance: number
  days: OzetDay[]
  totals: OzetPspTotals
}

export interface OzetGrandDay {
  day: string
  deposits: number
  withdrawals: number
  commission: number
  net: number
  settlement: number
  transfer_count: number
  finansPct: number
}

export interface OzetData {
  psps: OzetPsp[]
  days: string[]
  grandTotals: OzetGrandDay[]
  monthTotals: OzetPspTotals
}

/* ------------------------------------------------------------------ */
/*  Helpers — compute DEVİR / KASA TOP / finans %                      */
/* ------------------------------------------------------------------ */

function buildPspRows(rawDays: OzetDayRaw[], preMonthBalance: number): OzetDay[] {
  let carryOver = preMonthBalance
  return rawDays.map((d) => {
    const deposits = Number(d.deposits)
    const withdrawals = Number(d.withdrawals)
    const commission = Number(d.commission)
    const net = Number(d.net)
    const settlement = Number(d.settlement)
    const total = deposits - withdrawals
    const devir = carryOver
    const kasaTop = devir + net
    const finansPct = deposits > 0 ? (commission / deposits) * 100 : 0

    carryOver = kasaTop - settlement

    return {
      day: d.day,
      deposits,
      withdrawals,
      commission,
      net,
      settlement,
      transfer_count: Number(d.transfer_count),
      total,
      devir,
      kasaTop,
      finansPct,
    }
  })
}

function computeTotals(days: OzetDay[]): OzetPspTotals {
  const totals = days.reduce(
    (acc, d) => ({
      deposits: acc.deposits + d.deposits,
      withdrawals: acc.withdrawals + d.withdrawals,
      commission: acc.commission + d.commission,
      net: acc.net + d.net,
      settlement: acc.settlement + d.settlement,
      transfers: acc.transfers + d.transfer_count,
    }),
    { deposits: 0, withdrawals: 0, commission: 0, net: 0, settlement: 0, transfers: 0 },
  )
  return {
    ...totals,
    finansPct: totals.deposits > 0 ? (totals.commission / totals.deposits) * 100 : 0,
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useOzetQuery(year: number, month: number) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.ozet.summary(orgId, year, month),
    queryFn: async (): Promise<OzetData> => {
      if (!orgId) throw new Error('No org')

      const { data: raw, error: rpcErr } = await supabase.rpc('get_ozet_summary', {
        _org_id: orgId,
        _year: year,
        _month: month,
      })

      if (rpcErr) throw rpcErr
      if (!raw) throw new Error('Empty response')

      const json = raw as {
        psps: Array<{
          psp_id: string
          psp_name: string
          commission_rate: number
          initial_balance: number
          pre_month_balance: number
          days: OzetDayRaw[]
          totals: {
            deposits: number
            withdrawals: number
            commission: number
            net: number
            settlement: number
            transfers: number
          }
        }>
        days: string[]
        grand_totals: OzetDayRaw[]
        month_totals: {
          deposits: number
          withdrawals: number
          commission: number
          net: number
          settlement: number
          transfers: number
        }
      }

      // Build enriched PSP rows with DEVİR/KASA TOP/finans%
      const psps: OzetPsp[] = (json.psps ?? []).map((p) => {
        const preMonthBalance = Number(p.pre_month_balance ?? 0)
        const days = buildPspRows(p.days ?? [], preMonthBalance)
        const totals = computeTotals(days)

        return {
          pspId: p.psp_id,
          pspName: p.psp_name,
          commissionRate: Number(p.commission_rate),
          initialBalance: Number(p.initial_balance),
          preMonthBalance,
          days,
          totals,
        }
      })

      // Grand totals per day (across all PSPs)
      const grandTotals: OzetGrandDay[] = (json.grand_totals ?? []).map((g) => {
        const deposits = Number(g.deposits)
        const commission = Number(g.commission)
        return {
          day: g.day,
          deposits,
          withdrawals: Number(g.withdrawals),
          commission,
          net: Number(g.net),
          settlement: Number(g.settlement),
          transfer_count: Number(g.transfer_count),
          finansPct: deposits > 0 ? (commission / deposits) * 100 : 0,
        }
      })

      const mt = json.month_totals
      const mtDeposits = Number(mt?.deposits ?? 0)
      const mtCommission = Number(mt?.commission ?? 0)
      const monthTotals: OzetPspTotals = {
        deposits: mtDeposits,
        withdrawals: Number(mt?.withdrawals ?? 0),
        commission: mtCommission,
        net: Number(mt?.net ?? 0),
        settlement: Number(mt?.settlement ?? 0),
        transfers: Number(mt?.transfers ?? 0),
        finansPct: mtDeposits > 0 ? (mtCommission / mtDeposits) * 100 : 0,
      }

      return { psps, days: json.days ?? [], grandTotals, monthTotals }
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  })

  return {
    data: data ?? null,
    isLoading,
    error: error?.message ?? null,
  }
}
