import { useState, useRef } from 'react'
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

interface UseAccountingQueryReturn {
  entries: AccountingEntry[]
  isLoading: boolean
  error: string | null
  page: number
  pageSize: number
  total: number
  setPage: (page: number) => void
  summary: AccountingSummary[]
  isSummaryLoading: boolean
  createEntry: (data: EntryFormValues) => Promise<void>
  updateEntry: (id: string, data: EntryFormValues) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  fetchEntriesByDate: (dateKey: string) => Promise<AccountingEntry[]>
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
}

export function useAccountingQuery(): UseAccountingQueryReturn {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const prevOrgId = useRef(currentOrg?.id)

  if (currentOrg?.id !== prevOrgId.current) {
    prevOrgId.current = currentOrg?.id
    setPage(1)
  }

  // Paginated list query
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.accounting.list(currentOrg?.id ?? '', page),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error, count } = await supabase
        .from('accounting_entries')
        .select('*', { count: 'exact' })
        .eq('organization_id', currentOrg.id)
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

      const map = new Map<string, AccountingSummary>()
      for (const row of data ?? []) {
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

  /** Fetch ALL entries for a specific date (not paginated) */
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

  return {
    entries: data?.entries ?? [],
    total: data?.total ?? 0,
    page,
    pageSize: PAGE_SIZE,
    setPage,
    isLoading,
    error: error?.message ?? null,
    summary: summaryData ?? [],
    isSummaryLoading,
    createEntry: createMutation.mutateAsync,
    updateEntry: async (id, data) => updateMutation.mutateAsync({ id, data }),
    deleteEntry: deleteMutation.mutateAsync,
    fetchEntriesByDate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
