import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import type { Currency, Psp, TransferCategory } from '@/lib/database.types'

/** Category shape needed for transfer computation (supports both DB and lookup types) */
type CategoryForTransfer = Pick<TransferCategory, 'id' | 'is_deposit'>

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TransferRow {
  id: string
  organization_id: string
  full_name: string
  payment_method_id: string
  psp_id: string
  transfer_date: string
  category_id: string
  amount: number
  currency: Currency
  type_id: string
  crm_id: string | null
  meta_id: string | null
  exchange_rate: number
  amount_try: number
  amount_usd: number
  is_first_deposit: boolean
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  // joined from foreign keys
  category: { name: string; is_deposit: boolean } | null
  payment_method: { name: string } | null
  psp: { name: string; commission_rate: number } | null
  type: { name: string } | null
}

export interface TransferFormData {
  full_name: string
  payment_method_id: string
  psp_id: string
  transfer_date: string
  category_id: string
  raw_amount: number
  exchange_rate: number
  /** For custom (non-slot) currencies: the USD→base rate used to compute amount_usd. */
  usd_to_base_rate?: number
  currency: Currency
  type_id: string
  crm_id?: string
  meta_id?: string
  employee_id?: string
  is_first_deposit?: boolean
  notes?: string
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
    category: CategoryForTransfer,
    psp: Psp,
  ) => Promise<{ error: string | null }>
  updateTransfer: (
    id: string,
    data: TransferFormData,
    category: CategoryForTransfer,
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
  category: CategoryForTransfer,
  exchangeRate: number,
  currency: Currency | string,
  commissionRate = 0,
  typeId?: string,
  baseCurrency = 'TRY',
  usdToBaseRate?: number,
) {
  const amount = category.is_deposit ? rawAmount : -rawAmount

  let amountTry: number
  let amountUsd: number
  if (currency === baseCurrency) {
    // Base currency (e.g. TRY): exchange_rate = USD→base
    amountTry = amount
    amountUsd = exchangeRate > 0 ? Math.round((amount / exchangeRate) * 100) / 100 : 0
  } else if (currency === 'USD' || currency === 'USDT') {
    // Standard USD-equivalent: exchange_rate = USD→base
    amountUsd = amount
    amountTry = exchangeRate > 0 ? Math.round(amount * exchangeRate * 100) / 100 : 0
  } else {
    // Custom currency (e.g. EUR): exchange_rate = custom→base
    amountTry = exchangeRate > 0 ? Math.round(amount * exchangeRate * 100) / 100 : 0
    // Derive USD amount from TRY ÷ USD→base (usdToBaseRate), else fall back to raw
    amountUsd =
      usdToBaseRate && usdToBaseRate > 0
        ? Math.round((amountTry / usdToBaseRate) * 100) / 100
        : Math.round(amount * 100) / 100
  }

  // Blocked transfers always carry zero commission regardless of PSP rate
  const effectiveRate = typeId === 'blocked' ? 0 : commissionRate
  const commission = Math.round(Math.abs(amount) * effectiveRate * 100) / 100
  const net = amount - (category.is_deposit ? commission : -commission)

  return { amount, amountTry, amountUsd, commission, net }
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

    const {
      data,
      error: fetchError,
      count,
    } = await supabase
      .from('transfers')
      .select(SELECT_QUERY, { count: 'exact' })
      .eq('organization_id', currentOrg.id)
      .is('deleted_at', null)
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
    fetchTransfers() // eslint-disable-line react-hooks/set-state-in-effect -- deprecated hook, data fetch on mount
  }, [fetchTransfers])

  const createTransfer = useCallback(
    async (
      data: TransferFormData,
      category: CategoryForTransfer,
      psp: Psp,
    ): Promise<{ error: string | null }> => {
      if (!currentOrg || !user) return { error: 'No organization selected' }

      const { amount, commission, net, amountTry, amountUsd } = computeTransfer(
        data.raw_amount,
        category,
        data.exchange_rate,
        data.currency,
        psp.commission_rate,
        data.type_id,
        currentOrg.base_currency ?? 'TRY',
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

      if (!insertError) await fetchTransfers().catch(() => {})
      return { error: insertError?.message ?? null }
    },
    [currentOrg, user, fetchTransfers],
  )

  const updateTransfer = useCallback(
    async (
      id: string,
      data: TransferFormData,
      category: CategoryForTransfer,
      psp: Psp,
    ): Promise<{ error: string | null }> => {
      if (!currentOrg) return { error: 'No organization selected' }

      const { amount, commission, net, amountTry, amountUsd } = computeTransfer(
        data.raw_amount,
        category,
        data.exchange_rate,
        data.currency,
        psp.commission_rate,
        data.type_id,
        currentOrg.base_currency ?? 'TRY',
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

      if (!updateError) await fetchTransfers().catch(() => {})
      return { error: updateError?.message ?? null }
    },
    [currentOrg, fetchTransfers],
  )

  const deleteTransfer = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      const { error: deleteError } = await supabase
        .from('transfers')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null } as never)
        .eq('id', id)

      if (!deleteError) await fetchTransfers().catch(() => {})
      return { error: deleteError?.message ?? null }
    },
    [fetchTransfers, user],
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
