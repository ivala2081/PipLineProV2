import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { localDayStart, localDayEnd } from '@/lib/date'
import { queryKeys } from '@/lib/queryKeys'
import type { HrEmployee } from './useHrQuery'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type TvDepartment = 'marketing' | 'retention'

export type LeaderboardEntry = {
  employeeId: string
  employeeName: string
  totalUsd: number
  transferCount: number
  ftdCount: number
  todayUsd: number
  todayCount: number
  todayFtdCount: number
}

export type TransferAlert = {
  id: string
  employeeName: string
  amountUsd: number
  customerName: string
  isFirstDeposit: boolean
}

export type TvLeaderboardData = {
  entries: LeaderboardEntry[]
  hourlyToday: number[] // 24 slots, index = hour
  biggestToday: { amount: number; employeeName: string; customerName: string } | null
  recentTransfers: { employeeName: string; amount: number; time: string }[]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const MARKETING_ROLES = ['Marketing', 'Marketing Manager']
const RETENTION_ROLES = ['Retention', 'Retention Manager']

export function getRolesForDepartment(dept: TvDepartment) {
  return dept === 'marketing' ? MARKETING_ROLES : RETENTION_ROLES
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/*  Employees Query                                                     */
/* ------------------------------------------------------------------ */

export function useTvEmployeesQuery(department: TvDepartment) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''
  const roles = getRolesForDepartment(department)

  return useQuery({
    queryKey: queryKeys.tv.employees(orgId, department),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, full_name, role')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .in('role', roles)
        .order('full_name', { ascending: true })

      if (error) throw error
      return (data ?? []) as Pick<HrEmployee, 'id' | 'full_name' | 'role'>[]
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  })
}

/* ------------------------------------------------------------------ */
/*  Leaderboard Query                                                   */
/* ------------------------------------------------------------------ */

export function useTvLeaderboardQuery(
  department: TvDepartment,
  employees: Pick<HrEmployee, 'id' | 'full_name'>[] | undefined,
) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const employeeIds = employees?.map((e) => e.id) ?? []
  const employeeMap = new Map(employees?.map((e) => [e.id, e.full_name]) ?? [])

  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const lastDay = new Date(year, month, 0).getDate()
  const dateFrom = localDayStart(`${monthStr}-01`)
  const dateTo = localDayEnd(`${monthStr}-${String(lastDay).padStart(2, '0')}`)

  return useQuery({
    queryKey: queryKeys.tv.monthly(orgId, year, month, department),
    queryFn: async (): Promise<TvLeaderboardData> => {
      if (employeeIds.length === 0)
        return { entries: [], hourlyToday: Array(24).fill(0), biggestToday: null, recentTransfers: [] }

      const { data, error } = await supabase
        .from('transfers')
        .select(
          'employee_id, amount_usd, is_first_deposit, transfer_date, full_name, category:transfer_categories!category_id(is_deposit)',
        )
        .eq('organization_id', orgId)
        .not('employee_id', 'is', null)
        .in('employee_id', employeeIds)
        .gte('transfer_date', dateFrom)
        .lte('transfer_date', dateTo)
        .is('deleted_at', null)
        .order('transfer_date', { ascending: true })

      if (error) throw error

      const today = todayKey()
      const entryMap = new Map<string, LeaderboardEntry>()
      const hourlyToday: number[] = Array(24).fill(0)
      let biggestToday: TvLeaderboardData['biggestToday'] = null
      const recentTransfers: TvLeaderboardData['recentTransfers'] = []

      for (const emp of employees ?? []) {
        entryMap.set(emp.id, {
          employeeId: emp.id,
          employeeName: emp.full_name,
          totalUsd: 0,
          transferCount: 0,
          ftdCount: 0,
          todayUsd: 0,
          todayCount: 0,
          todayFtdCount: 0,
        })
      }

      for (const row of data ?? []) {
        const cat = row.category as { is_deposit: boolean } | null
        if (!cat?.is_deposit) continue

        const entry = entryMap.get(row.employee_id!)
        if (!entry) continue

        const amt = row.amount_usd ?? 0
        entry.totalUsd += amt
        entry.transferCount += 1
        if (row.is_first_deposit) entry.ftdCount += 1

        const transferDay = (row.transfer_date as string).slice(0, 10)
        if (transferDay === today) {
          entry.todayUsd += amt
          entry.todayCount += 1
          if (row.is_first_deposit) entry.todayFtdCount += 1

          // Hourly bucket
          const hour = new Date(row.transfer_date as string).getHours()
          hourlyToday[hour] += amt

          // Track biggest today
          if (!biggestToday || amt > biggestToday.amount) {
            biggestToday = {
              amount: amt,
              employeeName: entry.employeeName,
              customerName: row.full_name as string,
            }
          }
        }
      }

      // Recent transfers (last 20 deposits of the month, reversed for chronological display)
      const deposits = (data ?? []).filter((r) => {
        const cat = r.category as { is_deposit: boolean } | null
        return cat?.is_deposit && r.employee_id && employeeMap.has(r.employee_id)
      })
      const last20 = deposits.slice(-20)
      for (const r of last20) {
        recentTransfers.push({
          employeeName: employeeMap.get(r.employee_id!) ?? '',
          amount: r.amount_usd ?? 0,
          time: new Date(r.transfer_date as string).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })
      }

      const entries = Array.from(entryMap.values()).sort((a, b) => b.totalUsd - a.totalUsd)

      return { entries, hourlyToday, biggestToday, recentTransfers }
    },
    enabled: !!orgId && employeeIds.length > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

/* ------------------------------------------------------------------ */
/*  Realtime Subscription                                               */
/* ------------------------------------------------------------------ */

export function useTvRealtimeTransfer(
  department: TvDepartment,
  employeeMap: Map<string, string>,
  onNewTransfer: (alert: TransferAlert) => void,
) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''
  const queryClient = useQueryClient()

  const callbackRef = useRef(onNewTransfer)
  callbackRef.current = onNewTransfer

  const mapRef = useRef(employeeMap)
  mapRef.current = employeeMap

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  useEffect(() => {
    if (!orgId) return

    const channel = supabase
      .channel(`tv-transfers-${orgId}-${department}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transfers',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            employee_id: string | null
            amount_usd: number
            full_name: string
            is_first_deposit: boolean
            category_id: string
          }

          if (!row.employee_id) return
          const empName = mapRef.current.get(row.employee_id)
          if (!empName) return

          void queryClient.invalidateQueries({
            queryKey: queryKeys.tv.monthly(orgId, year, month, department),
          })

          callbackRef.current({
            id: row.id,
            employeeName: empName,
            amountUsd: row.amount_usd,
            customerName: row.full_name,
            isFirstDeposit: row.is_first_deposit,
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId, department, queryClient, year, month])
}
