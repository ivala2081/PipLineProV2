import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import { computeTransfer } from '@/hooks/useTransfers'
import type {
  TransferRow,
  TransferFormData,
} from '@/hooks/useTransfers'
import type { Psp, TransferCategory } from '@/lib/database.types'

const PAGE_SIZE = 25

const SELECT_QUERY =
  '*, psp:psps(name, commission_rate), category:transfer_categories(name, is_deposit), payment_method:payment_methods(name), type:transfer_types(name)'

interface UseTransfersQueryReturn {
  transfers: TransferRow[]
  isLoading: boolean
  error: string | null
  page: number
  pageSize: number
  total: number
  setPage: (page: number) => void
  createTransfer: (
    data: TransferFormData,
    category: TransferCategory,
    psp: Psp,
    commissionRate: number,
  ) => Promise<void>
  updateTransfer: (
    id: string,
    data: TransferFormData,
    category: TransferCategory,
    psp: Psp,
    commissionRate: number,
  ) => Promise<void>
  deleteTransfer: (id: string) => Promise<void>
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
}

export function useTransfersQuery(): UseTransfersQueryReturn {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const prevOrgId = useRef(currentOrg?.id)

  // IMPORTANT: Reset pagination when org changes (Bug Fix!)
  useEffect(() => {
    if (currentOrg?.id !== prevOrgId.current) {
      setPage(1)
      prevOrgId.current = currentOrg?.id
    }
  }, [currentOrg?.id])

  // Query for transfers list
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.transfers.list(currentOrg?.id ?? '', page),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No organization selected')

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error, count } = await supabase
        .from('transfers')
        .select(SELECT_QUERY, { count: 'exact' })
        .eq('organization_id', currentOrg.id)
        .order('transfer_date', { ascending: false })
        .range(from, to)

      if (error) throw error

      return {
        transfers: (data as unknown as TransferRow[]) ?? [],
        total: count ?? 0,
      }
    },
    enabled: !!currentOrg,
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async ({
      data,
      category,
      commissionRate,
    }: {
      data: TransferFormData
      category: TransferCategory
      psp: Psp
      commissionRate: number
    }) => {
      if (!currentOrg || !user) throw new Error('No organization selected')

      const { amount, commission, net, amountTry, amountUsd } = computeTransfer(
        data.raw_amount,
        category,
        commissionRate,
        data.exchange_rate,
        data.currency,
      )

      const { error } = await supabase.from('transfers').insert({
        organization_id: currentOrg.id,
        full_name: data.full_name,
        payment_method_id: data.payment_method_id,
        transfer_date: data.transfer_date,
        category_id: data.category_id,
        amount,
        commission,
        net,
        currency: data.currency,
        psp_id: data.psp_id,
        type_id: data.type_id,
        crm_id: data.crm_id || null,
        meta_id: data.meta_id || null,
        created_by: user.id,
        exchange_rate: data.exchange_rate,
        amount_try: amountTry,
        amount_usd: amountUsd,
        commission_rate_snapshot: commissionRate,
      } as never)

      if (error) throw error
    },
    onSuccess: () => {
      // Automatic invalidation - no manual fetch needed!
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
      category,
      commissionRate,
    }: {
      id: string
      data: TransferFormData
      category: TransferCategory
      psp: Psp
      commissionRate: number
    }) => {
      if (!currentOrg) throw new Error('No organization selected')

      const { amount, commission, net, amountTry, amountUsd } = computeTransfer(
        data.raw_amount,
        category,
        commissionRate,
        data.exchange_rate,
        data.currency,
      )

      const { error } = await supabase
        .from('transfers')
        .update({
          full_name: data.full_name,
          payment_method_id: data.payment_method_id,
          transfer_date: data.transfer_date,
          category_id: data.category_id,
          amount,
          commission,
          net,
          currency: data.currency,
          psp_id: data.psp_id,
          type_id: data.type_id,
          crm_id: data.crm_id || null,
          meta_id: data.meta_id || null,
          exchange_rate: data.exchange_rate,
          amount_try: amountTry,
          amount_usd: amountUsd,
          commission_rate_snapshot: commissionRate,
        } as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transfers').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })
    },
  })

  return {
    transfers: data?.transfers ?? [],
    total: data?.total ?? 0,
    page,
    pageSize: PAGE_SIZE,
    setPage,
    isLoading,
    error: error?.message ?? null,
    createTransfer: async (data, category, psp, commissionRate) =>
      createMutation.mutateAsync({ data, category, psp, commissionRate }),
    updateTransfer: async (id, data, category, psp, commissionRate) =>
      updateMutation.mutateAsync({ id, data, category, psp, commissionRate }),
    deleteTransfer: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
