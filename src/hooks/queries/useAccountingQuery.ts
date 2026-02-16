import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { AccountingEntry } from '@/lib/database.types'
import type { EntryFormValues } from '@/schemas/accountingSchema'

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

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounting_entries').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.summary(currentOrg?.id ?? ''),
      })
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
