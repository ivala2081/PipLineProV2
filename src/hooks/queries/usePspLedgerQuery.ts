import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

export interface PspLedgerRow {
  date: string
  deposit: number // YATIRIM – absolute deposit total
  withdrawal: number // ÇEKME   – absolute withdrawal total (display as negative)
  total: number // TOPLAM  = deposit - withdrawal
  commission: number // KOMİSYON
  net: number // NET     = total - commission
  settlement: number // TAHS TUTARI
  kasaTop: number // KASA TOP = devir + net
  devir: number // DEVİR   = prev kasaTop - prev settlement (carry-over)
  transferCount: number
}

interface UsePspLedgerReturn {
  rows: PspLedgerRow[]
  isLoading: boolean
  error: string | null
}

export function usePspLedgerQuery(pspId: string | undefined): UsePspLedgerReturn {
  const { currentOrg } = useOrganization()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.pspDashboard.ledger(pspId ?? ''),
    queryFn: async () => {
      if (!currentOrg || !pspId) throw new Error('Missing context')

      // Fetch initial_balance and ledger data in parallel
      const [pspRes, ledgerRes] = await Promise.all([
        supabase.from('psps').select('initial_balance').eq('id', pspId).single(),
        supabase.rpc('get_psp_ledger', {
          _psp_id: pspId,
          _org_id: currentOrg.id,
        }),
      ])

      if (ledgerRes.error) throw ledgerRes.error

      const initialBalance = Number(pspRes.data?.initial_balance ?? 0)

      const rawRows = (ledgerRes.data ?? []) as Array<{
        day: string
        total_deposits: number
        total_withdrawals: number
        total_commission: number
        total_net: number
        total_settlement: number
        transfer_count: number
      }>

      // ── Build rows with running balance ──────────────────
      // Formula matches the Excel ledger:
      //   DEVİR    = carry-over from previous day (prev kasaTop - prev settlement)
      //   KASA TOP = devir + net
      //   next devir = kasaTop - settlement
      let carryOver = initialBalance
      return rawRows.map((r): PspLedgerRow => {
        const deposit = Number(r.total_deposits)
        const withdrawal = Number(r.total_withdrawals)
        const commission = Number(r.total_commission)
        const net = Number(r.total_net)
        const settlement = Number(r.total_settlement)
        const total = deposit - withdrawal
        const devir = carryOver
        const kasaTop = devir + net
        carryOver = kasaTop - settlement

        return {
          date: r.day.slice(0, 10),
          deposit,
          withdrawal,
          total,
          commission,
          net,
          settlement,
          kasaTop,
          devir,
          transferCount: Number(r.transfer_count),
        }
      })
    },
    enabled: !!currentOrg && !!pspId,
    staleTime: 3 * 60_000, // 3 min – PSP ledger changes moderately
    gcTime: 10 * 60_000,
  })

  return {
    rows: data ?? [],
    isLoading,
    error: error?.message ?? null,
  }
}
