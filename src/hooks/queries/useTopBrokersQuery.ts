import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import { getDateRange, type DashboardPeriod } from './useDashboardQuery'

/* ── Types ─────────────────────────────────────────── */

export interface BrokerPerformance {
  partnerId: string
  name: string
  totalCommissions: number
  totalPayments: number
  netProfit: number
  referralCount: number
  currency: string
}

/* ── Raw row types ────────────────────────────────── */

interface RawCommission {
  ib_partner_id: string
  final_amount: number
  currency: string
  period_start: string
}

interface RawPayment {
  ib_partner_id: string
  amount: number
  payment_date: string
}

interface RawPartner {
  id: string
  name: string
}

interface RawReferral {
  ib_partner_id: string
}

/* ── Compute ─────────────────────────────────────── */

function computeTopBrokers(
  partners: RawPartner[],
  commissions: RawCommission[],
  payments: RawPayment[],
  referrals: RawReferral[],
): BrokerPerformance[] {
  const partnerMap = new Map<string, { name: string }>()
  for (const p of partners) {
    partnerMap.set(p.id, { name: p.name })
  }

  const commMap = new Map<string, { total: number; currency: string }>()
  for (const c of commissions) {
    const prev = commMap.get(c.ib_partner_id)
    commMap.set(c.ib_partner_id, {
      total: (prev?.total ?? 0) + (Number(c.final_amount) || 0),
      currency: c.currency ?? prev?.currency ?? 'USD',
    })
  }

  const payMap = new Map<string, number>()
  for (const p of payments) {
    payMap.set(p.ib_partner_id, (payMap.get(p.ib_partner_id) ?? 0) + (Number(p.amount) || 0))
  }

  const refMap = new Map<string, number>()
  for (const r of referrals) {
    refMap.set(r.ib_partner_id, (refMap.get(r.ib_partner_id) ?? 0) + 1)
  }

  const result: BrokerPerformance[] = []
  for (const [id, partner] of partnerMap) {
    const comm = commMap.get(id)
    const totalCommissions = comm?.total ?? 0
    const totalPayments = payMap.get(id) ?? 0
    const referralCount = refMap.get(id) ?? 0

    result.push({
      partnerId: id,
      name: partner.name,
      totalCommissions,
      totalPayments,
      netProfit: totalCommissions - totalPayments,
      referralCount,
      currency: comm?.currency ?? 'USD',
    })
  }

  return result.sort((a, b) => b.netProfit - a.netProfit)
}

/* ── Hook ─────────────────────────────────────────── */

export function useTopBrokersQuery(
  period: DashboardPeriod,
  customFrom?: string,
  customTo?: string,
) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const { from, to } = useMemo(
    () => getDateRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  )

  const query = useQuery({
    queryKey: queryKeys.dashboard.topBrokers(orgId, from, to),
    queryFn: async ({ signal }) => {
      const [partnersRes, commissionsRes, paymentsRes, referralsRes] = await Promise.all([
        supabase
          .from('ib_partners')
          .select('id, name')
          .eq('organization_id', orgId)
          .eq('status', 'active')
          .abortSignal(signal!),
        supabase
          .from('ib_commissions')
          .select('ib_partner_id, final_amount, currency, period_start')
          .eq('organization_id', orgId)
          .gte('period_start', from)
          .lte('period_start', to)
          .abortSignal(signal!),
        supabase
          .from('ib_payments')
          .select('ib_partner_id, amount, payment_date')
          .eq('organization_id', orgId)
          .gte('payment_date', from)
          .lte('payment_date', to)
          .abortSignal(signal!),
        supabase
          .from('ib_referrals')
          .select('ib_partner_id')
          .eq('organization_id', orgId)
          .abortSignal(signal!),
      ])

      if (partnersRes.error) throw partnersRes.error
      if (commissionsRes.error) throw commissionsRes.error
      if (paymentsRes.error) throw paymentsRes.error
      if (referralsRes.error) throw referralsRes.error

      return computeTopBrokers(
        (partnersRes.data ?? []) as RawPartner[],
        (commissionsRes.data ?? []) as RawCommission[],
        (paymentsRes.data ?? []) as RawPayment[],
        (referralsRes.data ?? []) as RawReferral[],
      )
    },
    enabled: !!currentOrg,
    staleTime: 3 * 60_000,
    gcTime: 10 * 60_000,
  })

  return {
    topBrokers: query.data ?? [],
    isTopBrokersLoading: query.isLoading,
  }
}
