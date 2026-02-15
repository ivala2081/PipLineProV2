import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

export type LedgerRowType = 'transfer' | 'settlement'

export interface PspLedgerRow {
  id: string
  type: LedgerRowType
  date: string
  deposit: number
  withdrawal: number
  commission: number
  net: number
  settlement: number
  balance: number
  currency: string
  fullName?: string
  notes?: string
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

      // Fetch transfers with category and type join
      const { data: rawTransfers, error: tErr } = await supabase
        .from('transfers')
        .select('id, transfer_date, amount, commission, net, currency, full_name, category:transfer_categories(is_deposit), type:transfer_types(name)')
        .eq('psp_id', pspId)
        .eq('organization_id', currentOrg.id)
        .order('transfer_date', { ascending: true })

      if (tErr) throw tErr

      // Exclude blocked transfers from ledger calculations
      const transfers = (rawTransfers ?? []).filter((t) => {
        const typeName = (t.type as unknown as { name: string } | null)?.name ?? ''
        return !typeName.toLowerCase().includes('blocked')
      })

      // Fetch settlements
      const { data: settlements, error: sErr } = await supabase
        .from('psp_settlements')
        .select('*')
        .eq('psp_id', pspId)
        .eq('organization_id', currentOrg.id)
        .order('settlement_date', { ascending: true })

      if (sErr) throw sErr

      // Map transfers to ledger rows
      const transferRows: Omit<PspLedgerRow, 'balance'>[] = (transfers ?? []).map((t) => {
        const cat = t.category as unknown as { is_deposit: boolean } | null
        const isDeposit = cat?.is_deposit ?? false
        const absAmount = Math.abs(Number(t.amount))

        return {
          id: t.id,
          type: 'transfer' as const,
          date: t.transfer_date,
          deposit: isDeposit ? absAmount : 0,
          withdrawal: !isDeposit ? absAmount : 0,
          commission: Number(t.commission),
          net: Number(t.net),
          settlement: 0,
          currency: t.currency,
          fullName: t.full_name,
        }
      })

      // Map settlements to ledger rows
      const settlementRows: Omit<PspLedgerRow, 'balance'>[] = (settlements ?? []).map((s) => ({
        id: s.id,
        type: 'settlement' as const,
        date: s.settlement_date,
        deposit: 0,
        withdrawal: 0,
        commission: 0,
        net: 0,
        settlement: Number(s.amount),
        currency: s.currency,
        notes: s.notes ?? undefined,
      }))

      // Merge and sort by date ascending (for running balance calculation)
      const merged = [...transferRows, ...settlementRows].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        // Transfers before settlements on same date
        if (a.type === 'transfer' && b.type === 'settlement') return -1
        if (a.type === 'settlement' && b.type === 'transfer') return 1
        return 0
      })

      // Calculate running balance
      let runningBalance = 0
      const withBalance: PspLedgerRow[] = merged.map((row) => {
        runningBalance += row.net - row.settlement
        return { ...row, balance: runningBalance }
      })

      return withBalance
    },
    enabled: !!currentOrg && !!pspId,
  })

  return {
    rows: data ?? [],
    isLoading,
    error: error?.message ?? null,
  }
}
