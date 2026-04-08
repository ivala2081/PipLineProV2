import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import { getDateRange, type DashboardPeriod } from './useDashboardQuery'

/* ── Types ─────────────────────────────────────────── */

export interface EmployeePerformance {
  employeeId: string
  fullName: string
  role: string
  totalVolumeUsd: number
  transferCount: number
  firstDepositCount: number
  netContributionUsd: number
}

export interface BestEmployeesData {
  marketing: EmployeePerformance[]
  retention: EmployeePerformance[]
}

/* ── Raw row type ─────────────────────────────────── */

interface RawRow {
  employee_id: string
  amount_usd: number
  category_id: string
  is_first_deposit: boolean | null
  employee: { full_name: string; role: string; is_active: boolean } | null
  transfer_types: { name: string } | null
}

/* ── Compute ─────────────────────────────────────── */

function computeBestEmployees(rows: RawRow[]): BestEmployeesData {
  const filtered = rows.filter((row) => {
    const typeName = (row.transfer_types?.name ?? '').toLowerCase()
    return !typeName.includes('bloke') && !typeName.includes('blocked')
  })

  const empMap = new Map<
    string,
    {
      fullName: string
      role: string
      depositsUsd: number
      withdrawalsUsd: number
      transferCount: number
      firstDepositCount: number
    }
  >()

  for (const row of filtered) {
    if (!row.employee) continue
    const id = row.employee_id
    const usdAmt = Math.abs(Number(row.amount_usd) || 0)
    const isDeposit = row.category_id === 'dep'

    if (!empMap.has(id)) {
      empMap.set(id, {
        fullName: row.employee.full_name,
        role: row.employee.role,
        depositsUsd: 0,
        withdrawalsUsd: 0,
        transferCount: 0,
        firstDepositCount: 0,
      })
    }

    const entry = empMap.get(id)!
    entry.transferCount++

    if (isDeposit) {
      entry.depositsUsd += usdAmt
      if (row.is_first_deposit) entry.firstDepositCount++
    } else {
      entry.withdrawalsUsd += usdAmt
    }
  }

  const all: EmployeePerformance[] = [...empMap.entries()].map(([employeeId, e]) => ({
    employeeId,
    fullName: e.fullName,
    role: e.role,
    totalVolumeUsd: e.depositsUsd,
    transferCount: e.transferCount,
    firstDepositCount: e.firstDepositCount,
    netContributionUsd: e.depositsUsd - e.withdrawalsUsd,
  }))

  const MARKETING_ROLES = ['Marketing', 'Marketing Manager', 'Sales', 'Sales Development']
  const marketing = all
    .filter((e) => MARKETING_ROLES.includes(e.role))
    .sort((a, b) => b.transferCount - a.transferCount)

  const retention = all
    .filter((e) => e.role === 'Retention' || e.role === 'Retention Manager')
    .sort((a, b) => b.netContributionUsd - a.netContributionUsd)

  return { marketing, retention }
}

/* ── Hook ─────────────────────────────────────────── */

const COLUMNS =
  'employee_id, amount_usd, category_id, is_first_deposit, employee:hr_employees!employee_id(full_name, role, is_active), transfer_types(name)'

export function useBestEmployeesQuery(
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
    queryKey: queryKeys.dashboard.bestEmployees(orgId, from, to),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('transfers')
        .select(COLUMNS)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .not('employee_id', 'is', null)
        .gte('transfer_date', from)
        .lte('transfer_date', to)
        .abortSignal(signal!)
      if (error) throw error
      return computeBestEmployees((data ?? []) as RawRow[])
    },
    enabled: !!currentOrg,
    staleTime: 3 * 60_000,
    gcTime: 10 * 60_000,
  })

  return {
    bestEmployees: query.data ?? null,
    isBestEmployeesLoading: query.isLoading,
  }
}
