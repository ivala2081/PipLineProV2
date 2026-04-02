import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { AccountingEntry } from '@/lib/database.types'
import type { EntryFormValues } from '@/schemas/accountingSchema'

/* ── Types for RPC responses ───────────────────────────── */

export interface RegisterSummary {
  id: string
  name: string
  label: string
  currency: string
  opening: number
  incoming: number
  outgoing: number
  net: number
  closing: number
}

export interface AccountingOverviewSummary {
  registers: RegisterSummary[]
  totals: {
    portfolio_usd: number
    net_pl: number
    pl_percent: number
  }
}

export interface CategoryBreakdownItem {
  category_name: string
  category_label: string
  category_icon: string
  total_amount: number
  entry_count: number
}

const PAGE_SIZE = 25

export interface AccountingSummary {
  register: string
  currency: string
  totalIn: number
  totalOut: number
  net: number
}

export interface LedgerFilters {
  register: string | null
  direction: string | null
  entryType: string | null
  currency: string | null
  search: string | null
  dateFrom: string | null
  dateTo: string | null
  amountMin: string | null
  amountMax: string | null
  costPeriod: string | null
  paymentPeriod: string | null
}

const EMPTY_FILTERS: LedgerFilters = {
  register: null,
  direction: null,
  entryType: null,
  currency: null,
  search: null,
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
  costPeriod: null,
  paymentPeriod: null,
}

interface UseAccountingQueryReturn {
  entries: AccountingEntry[]
  isLoading: boolean
  error: string | null
  page: number
  pageSize: number
  total: number
  setPage: (page: number) => void
  filters: LedgerFilters
  setFilter: <K extends keyof LedgerFilters>(key: K, value: LedgerFilters[K]) => void
  clearFilters: () => void
  hasActiveFilters: boolean
  summary: AccountingSummary[]
  isSummaryLoading: boolean
  createEntry: (data: EntryFormValues) => Promise<void>
  updateEntry: (id: string, data: EntryFormValues) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  fetchEntriesByDate: (dateKey: string) => Promise<AccountingEntry[]>
  fetchAllEntries: () => Promise<AccountingEntry[]>
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
}

export function useAccountingQuery(): UseAccountingQueryReturn {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_FILTERS)
  const prevOrgId = useRef(currentOrg?.id)

  if (currentOrg?.id !== prevOrgId.current) {
    prevOrgId.current = currentOrg?.id
    setPage(1)
    setFilters(EMPTY_FILTERS)
  }

  const setFilter = useCallback(
    <K extends keyof LedgerFilters>(key: K, value: LedgerFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
      setPage(1)
    },
    [],
  )

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }, [])

  const hasActiveFilters = Object.values(filters).some((v) => v != null && v !== '')

  // Paginated list query
  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.accounting.list(currentOrg?.id ?? '', page), filters],
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('accounting_entries')
        .select('*', { count: 'exact' })
        .eq('organization_id', currentOrg.id)

      // Apply filters
      if (filters.register) query = query.eq('register', filters.register)
      if (filters.direction) query = query.eq('direction', filters.direction)
      if (filters.entryType) query = query.eq('entry_type', filters.entryType)
      if (filters.currency) query = query.eq('currency', filters.currency)
      if (filters.dateFrom) query = query.gte('entry_date', filters.dateFrom)
      if (filters.dateTo) query = query.lte('entry_date', filters.dateTo)
      if (filters.search) query = query.ilike('description', `%${filters.search}%`)
      if (filters.amountMin) query = query.gte('amount', parseFloat(filters.amountMin))
      if (filters.amountMax) query = query.lte('amount', parseFloat(filters.amountMax))
      if (filters.costPeriod) query = query.eq('cost_period', filters.costPeriod)
      if (filters.paymentPeriod) query = query.eq('payment_period', filters.paymentPeriod)

      const { data, error, count } = await query
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      return { entries: (data as AccountingEntry[]) ?? [], total: count ?? 0 }
    },
    enabled: !!currentOrg,
    staleTime: 3 * 60_000, // 3 min – accounting entries change moderately
    gcTime: 10 * 60_000,
  })

  // Summary query
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: queryKeys.accounting.summary(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')

      const { data, error } = await supabase
        .from('accounting_entries')
        .select('direction, amount, currency, register')
        .eq('organization_id', currentOrg.id)

      if (error) throw error

      type SummaryRow = {
        direction: string
        amount: number
        currency: string
        register: string
      }

      const map = new Map<string, AccountingSummary>()
      for (const row of (data as SummaryRow[]) ?? []) {
        const key = row.register
        const existing = map.get(key) ?? {
          register: row.register,
          currency: row.currency,
          totalIn: 0,
          totalOut: 0,
          net: 0,
        }
        if (row.direction === 'in') {
          existing.totalIn += Number(row.amount)
        } else {
          existing.totalOut += Number(row.amount)
        }
        existing.net = existing.totalIn - existing.totalOut
        map.set(key, existing)
      }
      return Array.from(map.values())
    },
    enabled: !!currentOrg,
    staleTime: 3 * 60_000, // 3 min – summary changes moderately
    gcTime: 10 * 60_000,
  })

  // Create
  const createMutation = useMutation({
    mutationFn: async (data: EntryFormValues) => {
      if (!currentOrg || !user) throw new Error('No organization selected')
      const { error } = await supabase.from('accounting_entries').insert({
        organization_id: currentOrg.id,
        description: data.description,
        entry_type: data.entry_type,
        direction: data.direction,
        amount: data.amount,
        currency: data.currency,
        cost_period: data.cost_period || null,
        entry_date: data.entry_date,
        payment_period: data.payment_period || null,
        register: data.register,
        register_id: data.register_id ?? null,
        category_id: data.category_id ?? null,
        payee: data.payee ?? null,
        exchange_rate_used: data.exchange_rate_used ?? null,
        exchange_rate_override: data.exchange_rate_override ?? false,
        hr_employee_id: data.hr_employee_id ?? null,
        advance_type: data.advance_type ?? null,
        created_by: user.id,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.summary(currentOrg?.id ?? ''),
      })
    },
  })

  // Update
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EntryFormValues }) => {
      if (!currentOrg) throw new Error('No organization selected')
      const { error } = await supabase
        .from('accounting_entries')
        .update({
          description: data.description,
          entry_type: data.entry_type,
          direction: data.direction,
          amount: data.amount,
          currency: data.currency,
          cost_period: data.cost_period || null,
          entry_date: data.entry_date,
          payment_period: data.payment_period || null,
          register: data.register,
          register_id: data.register_id ?? null,
          category_id: data.category_id ?? null,
          payee: data.payee ?? null,
          exchange_rate_used: data.exchange_rate_used ?? null,
          exchange_rate_override: data.exchange_rate_override ?? false,
          hr_employee_id: data.hr_employee_id ?? null,
          advance_type: data.advance_type ?? null,
        } as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.summary(currentOrg?.id ?? ''),
      })
    },
  })

  // Delete (with cascade to linked HR payments) — optimistic
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Fetch the entry first to check for linked HR payment or bulk payment
      const { data: entryRaw, error: fetchError } = await supabase
        .from('accounting_entries')
        .select('hr_payment_id, hr_payment_type, hr_bulk_payment_id')
        .eq('id', id)
        .single()
      if (fetchError) throw fetchError
      const entry = entryRaw as {
        hr_payment_id: string | null
        hr_payment_type: 'bonus' | 'salary' | null
        hr_bulk_payment_id: string | null
      } | null

      // ── Bulk payment cascade ──
      if (entry?.hr_bulk_payment_id) {
        // Fetch all items to cascade-delete linked HR payments
        const { data: items } = await supabase
          .from('hr_bulk_payment_items')
          .select('salary_payment_id, bonus_payment_id')
          .eq('bulk_payment_id', entry.hr_bulk_payment_id)

        const salaryIds = (items ?? []).map((i) => i.salary_payment_id).filter(Boolean) as string[]
        const bonusIds = (items ?? []).map((i) => i.bonus_payment_id).filter(Boolean) as string[]

        if (salaryIds.length > 0) {
          await supabase.from('hr_salary_payments').delete().in('id', salaryIds)
        }
        if (bonusIds.length > 0) {
          await supabase.from('hr_bonus_payments').delete().in('id', bonusIds)
        }

        // Delete all accounting entries linked to this bulk payment
        await supabase
          .from('accounting_entries')
          .delete()
          .eq('hr_bulk_payment_id', entry.hr_bulk_payment_id)

        // Delete the bulk payment (CASCADE deletes items)
        await supabase.from('hr_bulk_payments').delete().eq('id', entry.hr_bulk_payment_id)
        return
      }

      // ── Single entry delete ──
      const { error } = await supabase.from('accounting_entries').delete().eq('id', id)
      if (error) throw error

      // Cascade delete the linked HR payment if present
      if (entry?.hr_payment_id && entry?.hr_payment_type) {
        const table: 'hr_bonus_payments' | 'hr_salary_payments' =
          entry.hr_payment_type === 'bonus' ? 'hr_bonus_payments' : 'hr_salary_payments'
        const { error: hrError } = await supabase.from(table).delete().eq('id', entry.hr_payment_id)
        if (hrError) {
          console.warn('Could not cascade delete HR payment:', hrError.message)
        }
      }
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.accounting.lists() })
      const snapshot = queryClient.getQueriesData({ queryKey: queryKeys.accounting.lists() })
      queryClient.setQueriesData(
        { queryKey: queryKeys.accounting.lists() },
        (old: { entries: AccountingEntry[]; total: number } | undefined) => {
          if (!old) return old
          return {
            ...old,
            entries: old.entries.filter((e) => e.id !== id),
            total: Math.max(0, old.total - 1),
          }
        },
      )
      return { snapshot }
    },
    onError: (_err, _id, context) => {
      if (context?.snapshot) {
        for (const [key, data] of context.snapshot) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.summary(currentOrg?.id ?? ''),
      })
      // Also invalidate HR payment queries so UI reflects deletion
      const orgId = currentOrg?.id ?? ''
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.salaryPaymentsPrefix(orgId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.allSalaryPayments(orgId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(orgId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.bulkPayments(orgId) })
    },
  })

  /** Fetch ALL entries for a specific date (not paginated, ignores filters to show complete daily picture) */
  async function fetchEntriesByDate(dateKey: string): Promise<AccountingEntry[]> {
    if (!currentOrg) return []

    const { data, error } = await supabase
      .from('accounting_entries')
      .select('*')
      .eq('organization_id', currentOrg.id)
      .eq('entry_date', dateKey)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as AccountingEntry[]) ?? []
  }

  /** Fetch ALL entries with current filters applied (for export) */
  async function fetchAllEntries(): Promise<AccountingEntry[]> {
    if (!currentOrg) return []

    let query = supabase.from('accounting_entries').select('*').eq('organization_id', currentOrg.id)

    // Apply same filters as paginated query
    if (filters.register) query = query.eq('register', filters.register)
    if (filters.direction) query = query.eq('direction', filters.direction)
    if (filters.entryType) query = query.eq('entry_type', filters.entryType)
    if (filters.currency) query = query.eq('currency', filters.currency)
    if (filters.dateFrom) query = query.gte('entry_date', filters.dateFrom)
    if (filters.dateTo) query = query.lte('entry_date', filters.dateTo)
    if (filters.search) query = query.ilike('description', `%${filters.search}%`)
    if (filters.amountMin) query = query.gte('amount', parseFloat(filters.amountMin))
    if (filters.amountMax) query = query.lte('amount', parseFloat(filters.amountMax))
    if (filters.costPeriod) query = query.eq('cost_period', filters.costPeriod)
    if (filters.paymentPeriod) query = query.eq('payment_period', filters.paymentPeriod)

    const { data, error } = await query
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as AccountingEntry[]) ?? []
  }

  return {
    entries: data?.entries ?? [],
    total: data?.total ?? 0,
    page,
    pageSize: PAGE_SIZE,
    setPage,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    isLoading,
    error: error?.message ?? null,
    summary: summaryData ?? [],
    isSummaryLoading,
    createEntry: createMutation.mutateAsync,
    updateEntry: async (id, data) => updateMutation.mutateAsync({ id, data }),
    deleteEntry: deleteMutation.mutateAsync,
    fetchEntriesByDate,
    fetchAllEntries,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

/* ── Overview Summary (RPC) ────────────────────────────── */

export function useAccountingOverviewSummary(period: string) {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: queryKeys.accounting.overviewSummary(currentOrg?.id ?? '', period),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')
      const { data, error } = await supabase.rpc('get_accounting_summary', {
        p_org_id: currentOrg.id,
        p_period: period,
      })
      if (error) throw error
      return data as unknown as AccountingOverviewSummary
    },
    enabled: !!currentOrg && !!period,
    staleTime: 2 * 60_000,
  })
}

/* ── Opening Balance Upsert ─────────────────────────────── */

export function useOpeningBalanceMutation() {
  const { currentOrg } = useOrganization()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      register,
      period,
      openingBalance,
    }: {
      register: string
      period: string
      openingBalance: number
    }) => {
      if (!currentOrg || !user) throw new Error('No organization selected')
      const { error } = await supabase.from('register_opening_balances').upsert(
        {
          organization_id: currentOrg.id,
          register,
          period,
          opening_balance: openingBalance,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: 'organization_id,register,period' },
      )
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.overviewSummary(currentOrg?.id ?? '', variables.period),
      })
    },
  })
}

/* ── Category Breakdown (RPC) ──────────────────────────── */

export function useCategoryBreakdown(period: string) {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: queryKeys.accounting.categoryBreakdown(currentOrg?.id ?? '', period),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')
      const { data, error } = await supabase.rpc('get_category_breakdown', {
        p_org_id: currentOrg.id,
        p_period: period,
      })
      if (error) throw error
      return (data as unknown as CategoryBreakdownItem[]) ?? []
    },
    enabled: !!currentOrg && !!period,
    staleTime: 2 * 60_000,
  })
}

/* ── Recent Payees (autocomplete) ──────────────────────── */

export function useRecentPayees() {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: queryKeys.accounting.recentPayees(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')
      const { data, error } = await supabase
        .from('accounting_entries')
        .select('payee')
        .eq('organization_id', currentOrg.id)
        .not('payee', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      const unique = [...new Set((data ?? []).map((d) => d.payee).filter(Boolean))]
      return unique as string[]
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60_000,
  })
}

/* ── Create Conversion (two linked entries) ────────────── */

export interface ConversionInput {
  sourceRegisterId: string
  sourceRegisterName: string
  targetRegisterId: string
  targetRegisterName: string
  sourceAmount: number
  targetAmount: number
  sourceCurrency: string
  targetCurrency: string
  exchangeRate: number
  exchangeRateOverride: boolean
  entryDate: string
  costPeriod: string
  notes: string
}

export function useCreateConversion() {
  const { currentOrg } = useOrganization()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ConversionInput) => {
      if (!currentOrg || !user) throw new Error('No organization selected')

      // Find conversion category
      const { data: cats } = await supabase
        .from('accounting_categories')
        .select('id')
        .eq('name', 'conversion')
        .or(`organization_id.is.null,organization_id.eq.${currentOrg.id}`)
        .limit(1)
      const conversionCategoryId = cats?.[0]?.id ?? null

      // 1. Create OUTGOING entry on source register
      const { data: sourceEntry, error: err1 } = await supabase
        .from('accounting_entries')
        .insert({
          organization_id: currentOrg.id,
          description: `Conversion: ${input.sourceRegisterName} → ${input.targetRegisterName}`,
          entry_type: 'TRANSFER',
          direction: 'out',
          amount: input.sourceAmount,
          currency: input.sourceCurrency,
          register: input.sourceRegisterName,
          register_id: input.sourceRegisterId,
          category_id: conversionCategoryId,
          cost_period: input.costPeriod || null,
          entry_date: input.entryDate,
          exchange_rate_used: input.exchangeRate,
          exchange_rate_override: input.exchangeRateOverride,
          created_by: user.id,
        } as never)
        .select('id')
        .single()
      if (err1) throw err1

      // 2. Create INCOMING entry on target register
      const { data: targetEntry, error: err2 } = await supabase
        .from('accounting_entries')
        .insert({
          organization_id: currentOrg.id,
          description: `Conversion: ${input.sourceRegisterName} → ${input.targetRegisterName}`,
          entry_type: 'TRANSFER',
          direction: 'in',
          amount: input.targetAmount,
          currency: input.targetCurrency,
          register: input.targetRegisterName,
          register_id: input.targetRegisterId,
          category_id: conversionCategoryId,
          cost_period: input.costPeriod || null,
          entry_date: input.entryDate,
          exchange_rate_used: input.exchangeRate,
          exchange_rate_override: input.exchangeRateOverride,
          linked_entry_id: sourceEntry.id,
          created_by: user.id,
        } as never)
        .select('id')
        .single()
      if (err2) throw err2

      // 3. Link source → target
      const { error: err3 } = await supabase
        .from('accounting_entries')
        .update({ linked_entry_id: targetEntry.id } as never)
        .eq('id', sourceEntry.id)
      if (err3) throw err3
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.summary(currentOrg?.id ?? ''),
      })
    },
  })
}
