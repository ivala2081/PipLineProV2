import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import { localYMD, localDayStart, localDayEnd } from '@/lib/date'
import { DEFAULT_MT_CONFIG, type MtTier } from '@/hooks/queries/useHrQuery'
import { computeTransfer } from '@/hooks/useTransfers'
import type { TransferRow, TransferFormData } from '@/hooks/useTransfers'
import type { TransferCategory } from '@/lib/database.types'
import { TRANSFER_CATEGORIES, PAYMENT_METHODS, TRANSFER_TYPES } from '@/lib/transferLookups'

/* ------------------------------------------------------------------ */
/*  Auto-bonus calculation helpers                                      */
/* ------------------------------------------------------------------ */

function getMtDepositBonus(amountUsd: number, tiers: MtTier[]): number {
  for (const tier of tiers) {
    if (amountUsd >= tier.min) return tier.bonus
  }
  return 0
}

const RE_BONUS_RATE = 0.0575

/** Returns the auto-bonus USDT amount for a transfer.
 *  Marketing: per-deposit tier bonus (deposit only, always positive).
 *  Retention: amount_usd × 5.75% — positive for deposit, negative for withdrawal.
 *  Returns 0 if no bonus applies. */
function calcAutoBonus(
  role: string,
  isDeposit: boolean,
  amountUsd: number,
  depositTiers: MtTier[],
): number {
  if (role === 'Marketing' && isDeposit) {
    return getMtDepositBonus(Math.abs(amountUsd), depositTiers)
  }
  if (role === 'Retention') {
    const sign = isDeposit ? 1 : -1
    return Math.round(Math.abs(amountUsd) * RE_BONUS_RATE * sign * 100) / 100
  }
  return 0
}

const DEFAULT_PAGE_SIZE = 25

const SELECT_QUERY =
  '*, category:transfer_categories!category_id(name, is_deposit), payment_method:payment_methods!payment_method_id(name), psp:psps!psp_id(name, commission_rate), type:transfer_types!type_id(name)'

export interface TransferFilters {
  search: string | null
  categoryType: string | null // 'deposit' | 'withdrawal'
  currency: string | null
  paymentMethodId: string | null
  typeId: string | null
  pspId: string | null
  employeeId: string | null
  dateFrom: string | null
  dateTo: string | null
  amountMin: string | null
  amountMax: string | null
}

const EMPTY_FILTERS: TransferFilters = {
  search: null,
  categoryType: null,
  currency: null,
  paymentMethodId: null,
  typeId: null,
  pspId: null,
  employeeId: null,
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
}

interface UseTransfersQueryReturn {
  transfers: TransferRow[]
  displayTransfers: TransferRow[]
  isLoading: boolean
  error: string | null
  page: number
  pageSize: number
  total: number
  filters: TransferFilters
  dateCounts: Record<string, number>
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setFilter: <K extends keyof TransferFilters>(key: K, value: TransferFilters[K]) => void
  clearFilters: () => void
  hasActiveFilters: boolean
  fetchTransfersByDate: (dateKey: string) => Promise<TransferRow[]>
  createTransfer: (data: TransferFormData, category: TransferCategory) => Promise<void>
  updateTransfer: (id: string, data: TransferFormData, category: TransferCategory) => Promise<void>
  deleteTransfer: (id: string) => Promise<void>
  bulkDeleteTransfers: (ids: string[]) => Promise<unknown>
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  isBulkDeleting: boolean
  loadMore: () => void
  hasMore: boolean
  isLoadMoreMode: boolean
  setIsLoadMoreMode: (v: boolean) => void
}

export function useTransfersQuery(): UseTransfersQueryReturn {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // Load-more mode state
  const [isLoadMoreMode, setIsLoadMoreMode] = useState(false)
  const [accumulated, setAccumulated] = useState<TransferRow[]>([])
  const prevPageRef = useRef(0)

  // Read initial filters from URL search params
  const initialFilters = useMemo<TransferFilters>(() => {
    const get = (key: string) => searchParams.get(key) || null
    return {
      search: get('search'),
      categoryType: get('categoryType'),
      currency: get('currency'),
      paymentMethodId: get('paymentMethodId'),
      typeId: get('typeId'),
      pspId: get('pspId'),
      employeeId: get('employeeId'),
      dateFrom: get('dateFrom'),
      dateTo: get('dateTo'),
      amountMin: get('amountMin'),
      amountMax: get('amountMax'),
    }
    // Only read on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [filters, setFilters] = useState<TransferFilters>(initialFilters)
  const prevOrgId = useRef(currentOrg?.id)

  // IMPORTANT: Reset pagination when org changes
  useEffect(() => {
    if (currentOrg?.id !== prevOrgId.current) {
      setPage(1)
      setFilters(EMPTY_FILTERS)
      prevOrgId.current = currentOrg?.id
    }
  }, [currentOrg?.id])

  // Reset load-more accumulated when filters or org change
  useEffect(() => {
    setAccumulated([])
    setIsLoadMoreMode(false)
    prevPageRef.current = 0
  }, [filters, currentOrg?.id])

  // Sync filter state → URL params after render (avoids setState-during-render warning)
  useEffect(() => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (v != null && v !== '') params.set(k, v)
    }
    setSearchParams(params, { replace: true })
  }, [filters, setSearchParams])

  const setFilter = useCallback(
    <K extends keyof TransferFilters>(key: K, value: TransferFilters[K]) => {
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

  // Query for transfers list
  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.transfers.list(currentOrg?.id ?? '', page), pageSize, filters],
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('transfers')
        .select(SELECT_QUERY, { count: 'exact' })
        .eq('organization_id', currentOrg.id)
        .is('deleted_at', null)

      // Apply filters
      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,crm_id.ilike.%${filters.search}%,meta_id.ilike.%${filters.search}%`,
        )
      }
      if (filters.currency) query = query.eq('currency', filters.currency)
      if (filters.paymentMethodId) query = query.eq('payment_method_id', filters.paymentMethodId)
      if (filters.typeId) query = query.eq('type_id', filters.typeId)
      if (filters.pspId) query = query.eq('psp_id', filters.pspId)
      if (filters.employeeId) query = query.eq('employee_id', filters.employeeId)
      if (filters.dateFrom) {
        query = query.gte('transfer_date', localDayStart(filters.dateFrom))
      }
      if (filters.dateTo) {
        query = query.lte('transfer_date', localDayEnd(filters.dateTo))
      }
      if (filters.amountMin) query = query.gte('amount', parseFloat(filters.amountMin))
      if (filters.amountMax) query = query.lte('amount', parseFloat(filters.amountMax))

      const { data, error, count } = await query
        .order('transfer_date', { ascending: false })
        .range(from, to)

      if (error) throw error

      // Client-side join fallback for lookup tables
      const rawTransfers = (data as unknown as TransferRow[]) ?? []
      let transfers = rawTransfers.map((t) => ({
        ...t,
        category: t.category ?? TRANSFER_CATEGORIES.find((c) => c.id === t.category_id) ?? null,
        payment_method:
          t.payment_method ?? PAYMENT_METHODS.find((pm) => pm.id === t.payment_method_id) ?? null,
        type: t.type ?? TRANSFER_TYPES.find((type) => type.id === t.type_id) ?? null,
      }))
      if (filters.categoryType) {
        transfers = transfers.filter((t) => {
          if (filters.categoryType === 'deposit') return t.category?.is_deposit === true
          if (filters.categoryType === 'withdrawal') return t.category?.is_deposit === false
          return true
        })
      }

      return {
        transfers,
        total: count ?? 0,
      }
    },
    enabled: !!currentOrg,
    staleTime: 30_000, // 30s – transfers are core operational data, change frequently
    gcTime: 5 * 60_000,
  })

  // Append new page data to accumulated when in load-more mode
  useEffect(() => {
    if (isLoadMoreMode && data?.transfers && page !== prevPageRef.current) {
      setAccumulated((prev) => [...prev, ...data.transfers])
      prevPageRef.current = page
    }
  }, [data?.transfers, isLoadMoreMode, page])

  const loadMore = useCallback(() => {
    if (!isLoadMoreMode) {
      // First load-more click: accumulate current page data then advance
      setAccumulated(data?.transfers ?? [])
      prevPageRef.current = page
    }
    setIsLoadMoreMode(true)
    setPage((p) => p + 1)
  }, [isLoadMoreMode, data?.transfers, page])

  // Query for date counts (not paginated)
  const { data: dateCountsData } = useQuery({
    queryKey: [...queryKeys.transfers.dateCounts(currentOrg?.id ?? ''), filters],
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')

      let query = supabase
        .from('transfers')
        .select(
          filters.categoryType
            ? 'transfer_date, category:transfer_categories!inner(is_deposit)'
            : 'transfer_date',
        )
        .eq('organization_id', currentOrg.id)
        .is('deleted_at', null)

      // Apply same filters as main query
      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,crm_id.ilike.%${filters.search}%,meta_id.ilike.%${filters.search}%`,
        )
      }
      if (filters.currency) query = query.eq('currency', filters.currency)
      if (filters.paymentMethodId) query = query.eq('payment_method_id', filters.paymentMethodId)
      if (filters.typeId) query = query.eq('type_id', filters.typeId)
      if (filters.pspId) query = query.eq('psp_id', filters.pspId)
      if (filters.employeeId) query = query.eq('employee_id', filters.employeeId)
      if (filters.dateFrom) query = query.gte('transfer_date', localDayStart(filters.dateFrom))
      if (filters.dateTo) query = query.lte('transfer_date', localDayEnd(filters.dateTo))
      if (filters.amountMin) query = query.gte('amount', parseFloat(filters.amountMin))
      if (filters.amountMax) query = query.lte('amount', parseFloat(filters.amountMax))

      const { data, error } = await query

      if (error) throw error

      // Filter by category type if needed
      let filteredData = data ?? []
      if (filters.categoryType) {
        filteredData = filteredData.filter((row: { category: { is_deposit: boolean } }) => {
          if (filters.categoryType === 'deposit') return row.category.is_deposit === true
          if (filters.categoryType === 'withdrawal') return row.category.is_deposit === false
          return true
        })
      }

      // Group by date and count
      const counts: Record<string, number> = {}
      for (const row of filteredData) {
        const dateKey = localYMD(new Date((row as { transfer_date: string }).transfer_date))
        counts[dateKey] = (counts[dateKey] || 0) + 1
      }

      return counts
    },
    enabled: !!currentOrg,
    staleTime: 30_000, // 30s – date counts follow transfer changes
    gcTime: 5 * 60_000,
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async ({
      data,
      category,
    }: {
      data: TransferFormData
      category: TransferCategory
    }) => {
      if (!currentOrg || !user) throw new Error('No organization selected')

      // Fetch PSP to get commission rate
      const { data: pspData } = await supabase
        .from('psps')
        .select('commission_rate')
        .eq('id', data.psp_id)
        .single()

      const isBlocked = data.type_id === 'blocked'
      const commissionRate = isBlocked ? 0 : (pspData?.commission_rate ?? 0)

      const { amount, amountTry, amountUsd, commission, net } = computeTransfer(
        data.raw_amount,
        category,
        data.exchange_rate,
        data.currency,
        commissionRate,
        data.type_id,
        currentOrg?.base_currency ?? 'TRY',
        data.usd_to_base_rate,
      )

      const { data: newTransfer, error } = await supabase
        .from('transfers')
        .insert({
          organization_id: currentOrg.id,
          full_name: data.full_name,
          payment_method_id: data.payment_method_id,
          psp_id: data.psp_id,
          transfer_date: data.transfer_date,
          category_id: data.category_id,
          amount,
          commission,
          net,
          currency: data.currency,
          type_id: data.type_id,
          crm_id: data.crm_id || null,
          meta_id: data.meta_id || null,
          employee_id: data.employee_id || null,
          is_first_deposit: data.is_first_deposit ?? false,
          notes: data.notes || null,
          created_by: user.id,
          exchange_rate: data.exchange_rate,
          amount_try: amountTry,
          amount_usd: amountUsd,
          commission_rate_snapshot: commissionRate,
        } as never)
        .select('id')
        .single()

      if (error) throw error

      // Auto-bonus: Marketing / Retention
      if (data.employee_id && newTransfer) {
        const { data: emp } = await supabase
          .from('hr_employees')
          .select('role')
          .eq('id', data.employee_id)
          .single()

        if (emp) {
          // Fetch org-specific MT config; fall back to defaults if not configured yet
          const { data: mtCfg } = await supabase
            .from('hr_mt_config')
            .select('deposit_tiers')
            .eq('organization_id', currentOrg.id)
            .maybeSingle()
          const depositTiers =
            (mtCfg?.deposit_tiers as MtTier[] | null) ?? DEFAULT_MT_CONFIG.deposit_tiers

          const bonusAmount = calcAutoBonus(emp.role, category.is_deposit, amountUsd, depositTiers)
          if (bonusAmount !== 0) {
            const period = String(data.transfer_date).slice(0, 7)
            await supabase.from('hr_bonus_payments').insert({
              agreement_id: null,
              employee_id: data.employee_id,
              organization_id: currentOrg.id,
              period,
              amount_usdt: bonusAmount,
              notes: `Otomatik: ${emp.role}`,
              transfer_id: (newTransfer as { id: string }).id,
              created_by: user.id,
            } as never)
          }
        }
      }
    },
    onSuccess: () => {
      // Invalidate both transfers list and date counts
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(currentOrg?.id ?? '') })
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
      category,
    }: {
      id: string
      data: TransferFormData
      category: TransferCategory
    }) => {
      if (!currentOrg) throw new Error('No organization selected')

      // Fetch PSP to get commission rate
      const { data: pspData } = await supabase
        .from('psps')
        .select('commission_rate')
        .eq('id', data.psp_id)
        .single()

      const isBlocked = data.type_id === 'blocked'
      const commissionRate = isBlocked ? 0 : (pspData?.commission_rate ?? 0)

      const { amount, amountTry, amountUsd, commission, net } = computeTransfer(
        data.raw_amount,
        category,
        data.exchange_rate,
        data.currency,
        commissionRate,
        data.type_id,
        currentOrg?.base_currency ?? 'TRY',
        data.usd_to_base_rate,
      )

      const { error } = await supabase
        .from('transfers')
        .update({
          full_name: data.full_name,
          payment_method_id: data.payment_method_id,
          psp_id: data.psp_id,
          transfer_date: data.transfer_date,
          category_id: data.category_id,
          amount,
          commission,
          net,
          currency: data.currency,
          type_id: data.type_id,
          crm_id: data.crm_id || null,
          meta_id: data.meta_id || null,
          employee_id: data.employee_id || null,
          is_first_deposit: data.is_first_deposit ?? false,
          notes: data.notes || null,
          exchange_rate: data.exchange_rate,
          amount_try: amountTry,
          amount_usd: amountUsd,
          commission_rate_snapshot: commissionRate,
        } as never)
        .eq('id', id)

      if (error) throw error

      // Re-calculate auto-bonus: delete existing auto-payment then recreate
      await supabase
        .from('hr_bonus_payments')
        .delete()
        .eq('transfer_id', id)
        .eq('organization_id', currentOrg.id)

      if (data.employee_id) {
        const { data: emp } = await supabase
          .from('hr_employees')
          .select('role')
          .eq('id', data.employee_id)
          .single()

        if (emp) {
          const { data: mtCfg } = await supabase
            .from('hr_mt_config')
            .select('deposit_tiers')
            .eq('organization_id', currentOrg.id)
            .maybeSingle()
          const depositTiers =
            (mtCfg?.deposit_tiers as MtTier[] | null) ?? DEFAULT_MT_CONFIG.deposit_tiers

          const bonusAmount = calcAutoBonus(emp.role, category.is_deposit, amountUsd, depositTiers)
          if (bonusAmount !== 0) {
            const period = String(data.transfer_date).slice(0, 7)
            await supabase.from('hr_bonus_payments').insert({
              agreement_id: null,
              employee_id: data.employee_id,
              organization_id: currentOrg.id,
              period,
              amount_usdt: bonusAmount,
              notes: `Otomatik: ${emp.role}`,
              transfer_id: id,
              created_by: user?.id ?? null,
            } as never)
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(currentOrg?.id ?? '') })
    },
  })

  // Delete mutation — soft delete (sets deleted_at/deleted_by)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transfers')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null } as never)
        .eq('id', id)

      if (error) throw error
    },
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.transfers.lists() })
      // Snapshot current cache
      const snapshot = queryClient.getQueriesData({ queryKey: queryKeys.transfers.lists() })
      // Optimistically remove the item from all cached transfer lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.transfers.lists() },
        (old: { transfers: TransferRow[]; total: number } | undefined) => {
          if (!old?.transfers) return old
          return {
            ...old,
            transfers: old.transfers.filter((t: TransferRow) => t.id !== id),
            total: Math.max(0, old.total - 1),
          }
        },
      )
      return { snapshot }
    },
    onError: (_err, _id, context) => {
      // Restore snapshot on failure
      if (context?.snapshot) {
        for (const [key, data] of context.snapshot) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(currentOrg?.id ?? '') })
    },
  })

  // Bulk delete mutation — soft delete; pass ['__all__'] to soft-delete all org transfers
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const now = new Date().toISOString()
      const deletedBy = user?.id ?? null

      if (ids.length === 1 && ids[0] === '__all__') {
        if (!currentOrg) throw new Error('No organization selected')
        const { error } = await supabase
          .from('transfers')
          .update({ deleted_at: now, deleted_by: deletedBy } as never)
          .eq('organization_id', currentOrg.id)
          .is('deleted_at', null)
        if (error) throw error
        return
      }

      // Soft delete in batches of 50
      for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50)
        const { error } = await supabase
          .from('transfers')
          .update({ deleted_at: now, deleted_by: deletedBy } as never)
          .in('id', batch)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(currentOrg?.id ?? '') })
    },
  })

  // Function to fetch all transfers for a specific date
  const fetchTransfersByDate = async (dateKey: string): Promise<TransferRow[]> => {
    if (!currentOrg) throw new Error('No organization selected')

    const startOfDay = localDayStart(dateKey)
    const endOfDay = localDayEnd(dateKey)

    const { data, error } = await supabase
      .from('transfers')
      .select(SELECT_QUERY)
      .eq('organization_id', currentOrg.id)
      .is('deleted_at', null)
      .gte('transfer_date', startOfDay)
      .lte('transfer_date', endOfDay)
      .order('transfer_date', { ascending: false })

    if (error) throw error

    // TEMPORARY FIX: Manual client-side join
    const rawTransfers = (data as unknown as TransferRow[]) ?? []
    return rawTransfers.map((t) => ({
      ...t,
      category: t.category ?? TRANSFER_CATEGORIES.find((c) => c.id === t.category_id) ?? null,
      payment_method:
        t.payment_method ?? PAYMENT_METHODS.find((pm) => pm.id === t.payment_method_id) ?? null,
      type: t.type ?? TRANSFER_TYPES.find((type) => type.id === t.type_id) ?? null,
    }))
  }

  const currentTransfers = data?.transfers ?? []
  const total = data?.total ?? 0
  const hasMore = page < Math.ceil(total / pageSize)
  const displayTransfers = isLoadMoreMode ? accumulated : currentTransfers

  return {
    transfers: currentTransfers,
    displayTransfers,
    total,
    page,
    pageSize,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    dateCounts: dateCountsData ?? {},
    setPage,
    setPageSize,
    fetchTransfersByDate,
    isLoading,
    error: error?.message ?? null,
    createTransfer: async (data, category) => createMutation.mutateAsync({ data, category }),
    updateTransfer: async (id, data, category) =>
      updateMutation.mutateAsync({ id, data, category }),
    deleteTransfer: deleteMutation.mutateAsync,
    bulkDeleteTransfers: bulkDeleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    loadMore,
    hasMore,
    isLoadMoreMode,
    setIsLoadMoreMode,
  }
}
