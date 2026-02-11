import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import type { Currency, Psp, TransferCategory } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TransferRow {
  id: string
  organization_id: string
  full_name: string
  payment_method_id: string
  transfer_date: string
  category_id: string
  amount: number
  commission: number
  net: number
  currency: Currency
  psp_id: string
  type_id: string
  crm_id: string | null
  meta_id: string | null
  exchange_rate: number
  amount_try: number
  amount_usd: number
  created_by: string | null
  created_at: string
  commission_rate_snapshot: number | null
  updated_at: string
  // joined
  psp: { name: string; commission_rate: number } | null
  category: { name: string; is_deposit: boolean } | null
  payment_method: { name: string } | null
  type: { name: string } | null
}

export interface TransferFormData {
  full_name: string
  payment_method_id: string
  transfer_date: string
  category_id: string
  raw_amount: number
  exchange_rate: number
  currency: Currency
  psp_id: string
  type_id: string
  crm_id?: string
  meta_id?: string
}

interface UseTransfersReturn {
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
  ) => Promise<{ error: string | null }>
  updateTransfer: (
    id: string,
    data: TransferFormData,
    category: TransferCategory,
    psp: Psp,
  ) => Promise<{ error: string | null }>
  deleteTransfer: (id: string) => Promise<{ error: string | null }>
  refresh: () => Promise<void>
}

const PAGE_SIZE = 25

const SELECT_QUERY =
  '*, psp:psps(name, commission_rate), category:transfer_categories(name, is_deposit), payment_method:payment_methods(name), type:transfer_types(name)'

/* ------------------------------------------------------------------ */
/*  Commission logic                                                   */
/* ------------------------------------------------------------------ */

export function computeTransfer(
  rawAmount: number,
  category: TransferCategory,
  commissionRate: number,
  exchangeRate: number,
  currency: Currency,
) {
  const amount = category.is_deposit ? rawAmount : -rawAmount
  const commission = category.is_deposit
    ? Math.round(rawAmount * commissionRate * 100) / 100
    : 0
  const net = Math.round((amount - commission) * 100) / 100

  let amountTry: number
  let amountUsd: number
  if (currency === 'TL') {
    amountTry = amount
    amountUsd =
      exchangeRate > 0
        ? Math.round((amount / exchangeRate) * 100) / 100
        : 0
  } else {
    amountUsd = amount
    amountTry = Math.round(amount * exchangeRate * 100) / 100
  }

  return { amount, commission, net, amountTry, amountUsd }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * @deprecated Use useTransfersQuery from '@/hooks/queries/useTransfersQuery' instead.
 * This hook will be removed in the next major version.
 *
 * Migration guide:
 * - Replace `import { useTransfers } from '@/hooks/useTransfers'`
 * - With `import { useTransfersQuery } from '@/hooks/queries/useTransfersQuery'`
 * - API is compatible, no other changes needed
 */
export function useTransfers(): UseTransfersReturn {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const [transfers, setTransfers] = useState<TransferRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchTransfers = useCallback(async () => {
    if (!currentOrg) {
      setTransfers([])
      setTotal(0)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error: fetchError, count } = await supabase
      .from('transfers')
      .select(SELECT_QUERY, { count: 'exact' })
      .eq('organization_id', currentOrg.id)
      .order('transfer_date', { ascending: false })
      .range(from, to)

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setTransfers((data as unknown as TransferRow[]) ?? [])
      setTotal(count ?? 0)
    }

    setIsLoading(false)
  }, [currentOrg, page])

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  const createTransfer = useCallback(
    async (
      data: TransferFormData,
      category: TransferCategory,
      psp: Psp,
    ): Promise<{ error: string | null }> => {
      if (!currentOrg || !user) return { error: 'No organization selected' }

      const { amount, commission, net, amountTry, amountUsd } = computeTransfer(
        data.raw_amount,
        category,
        psp.commission_rate,
        data.exchange_rate,
        data.currency,
      )

      const { error: insertError } = await supabase.from('transfers').insert({
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
      })

      if (!insertError) await fetchTransfers()
      return { error: insertError?.message ?? null }
    },
    [currentOrg, user, fetchTransfers],
  )

  const updateTransfer = useCallback(
    async (
      id: string,
      data: TransferFormData,
      category: TransferCategory,
      psp: Psp,
    ): Promise<{ error: string | null }> => {
      if (!currentOrg) return { error: 'No organization selected' }

      const { amount, commission, net, amountTry, amountUsd } = computeTransfer(
        data.raw_amount,
        category,
        psp.commission_rate,
        data.exchange_rate,
        data.currency,
      )

      const { error: updateError } = await supabase
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
        })
        .eq('id', id)

      if (!updateError) await fetchTransfers()
      return { error: updateError?.message ?? null }
    },
    [currentOrg, fetchTransfers],
  )

  const deleteTransfer = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      const { error: deleteError } = await supabase
        .from('transfers')
        .delete()
        .eq('id', id)

      if (!deleteError) await fetchTransfers()
      return { error: deleteError?.message ?? null }
    },
    [fetchTransfers],
  )

  return {
    transfers,
    isLoading,
    error,
    page,
    pageSize: PAGE_SIZE,
    total,
    setPage,
    createTransfer,
    updateTransfer,
    deleteTransfer,
    refresh: fetchTransfers,
  }
}
