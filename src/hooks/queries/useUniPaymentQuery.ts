import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { supabase } from '@/lib/supabase'
import { callUniPaymentApi } from '@/lib/uniPaymentApi'
import { queryKeys } from '@/lib/queryKeys'
import type {
  UniPaymentApiResponse,
  UniPaymentPaginatedResponse,
  UniPaymentBalance,
  UniPaymentAccount,
  UniPaymentTransaction,
  UniPaymentInvoice,
  UniPaymentPayment,
  UniPaymentDepositAddress,
  CreateInvoiceParams,
  CreatePaymentParams,
  SyncResult,
} from '@/lib/uniPaymentTypes'

/* ── Wallet Balances ───────────────────────────────────────────────── */

export function useUniPaymentBalances(pspId: string | undefined) {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: queryKeys.uniPayment.balances(pspId ?? ''),
    queryFn: async () => {
      const res = await callUniPaymentApi<UniPaymentApiResponse<UniPaymentBalance[]>>(
        'getBalances',
        { org_id: currentOrg!.id },
      )
      return res.data ?? []
    },
    enabled: !!currentOrg && !!pspId,
    staleTime: 30_000, // 30s - balances change frequently
  })
}

/* ── Wallet Accounts ───────────────────────────────────────────────── */

export function useUniPaymentAccounts(pspId: string | undefined) {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: queryKeys.uniPayment.accounts(pspId ?? ''),
    queryFn: async () => {
      const res = await callUniPaymentApi<UniPaymentApiResponse<UniPaymentAccount[]>>(
        'getAccounts',
        { org_id: currentOrg!.id },
      )
      return res.data ?? []
    },
    enabled: !!currentOrg && !!pspId,
    staleTime: 60_000,
  })
}

/* ── Account Transactions ──────────────────────────────────────────── */

export function useUniPaymentTransactions(
  pspId: string | undefined,
  accountId: string | undefined,
  page = 1,
) {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: queryKeys.uniPayment.transactions(pspId ?? '', accountId ?? '', page),
    queryFn: async () => {
      const res = await callUniPaymentApi<UniPaymentPaginatedResponse<UniPaymentTransaction>>(
        'getTransactions',
        { org_id: currentOrg!.id, account_id: accountId, page_no: page, page_size: 20 },
      )
      return res.data ?? { models: [], page_no: 1, page_size: 20, total: 0, page_count: 0 }
    },
    enabled: !!currentOrg && !!pspId && !!accountId,
    staleTime: 30_000,
  })
}

/* ── Deposit Address ───────────────────────────────────────────────── */

export function useUniPaymentDepositAddress(
  pspId: string | undefined,
  accountId: string | undefined,
) {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: [...queryKeys.uniPayment.accounts(pspId ?? ''), 'deposit', accountId ?? ''],
    queryFn: async () => {
      const res = await callUniPaymentApi<UniPaymentApiResponse<UniPaymentDepositAddress>>(
        'getDepositAddress',
        { org_id: currentOrg!.id, account_id: accountId },
      )
      return res.data ?? null
    },
    enabled: !!currentOrg && !!pspId && !!accountId,
    staleTime: 5 * 60_000, // deposit addresses are stable
  })
}

/* ── Invoices ──────────────────────────────────────────────────────── */

export function useUniPaymentInvoices(pspId: string | undefined, page = 1) {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: queryKeys.uniPayment.invoices(pspId ?? '', page),
    queryFn: async () => {
      const res = await callUniPaymentApi<UniPaymentPaginatedResponse<UniPaymentInvoice>>(
        'queryInvoices',
        { org_id: currentOrg!.id, page_no: page, page_size: 20 },
      )
      return res.data ?? { models: [], page_no: 1, page_size: 20, total: 0, page_count: 0 }
    },
    enabled: !!currentOrg && !!pspId,
    staleTime: 30_000,
  })
}

export function useCreateInvoiceMutation(pspId: string | undefined) {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateInvoiceParams) => {
      const res = await callUniPaymentApi<UniPaymentApiResponse<UniPaymentInvoice>>(
        'createInvoice',
        { org_id: currentOrg!.id, ...params },
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uniPayment.invoices(pspId ?? '', 1) })
    },
  })
}

/* ── Payments (Payouts) ────────────────────────────────────────────── */

export function useUniPaymentPayments(pspId: string | undefined, page = 1) {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: queryKeys.uniPayment.payments(pspId ?? '', page),
    queryFn: async () => {
      const res = await callUniPaymentApi<UniPaymentPaginatedResponse<UniPaymentPayment>>(
        'queryPayments',
        { org_id: currentOrg!.id, page_no: page, page_size: 20 },
      )
      return res.data ?? { models: [], page_no: 1, page_size: 20, total: 0, page_count: 0 }
    },
    enabled: !!currentOrg && !!pspId,
    staleTime: 30_000,
  })
}

export function useCreatePaymentMutation(pspId: string | undefined) {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreatePaymentParams) => {
      const res = await callUniPaymentApi<UniPaymentApiResponse<UniPaymentPayment>>(
        'createPayment',
        { org_id: currentOrg!.id, ...params },
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uniPayment.payments(pspId ?? '', 1) })
      queryClient.invalidateQueries({ queryKey: queryKeys.uniPayment.balances(pspId ?? '') })
    },
  })
}

export function useCancelPaymentMutation(pspId: string | undefined) {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await callUniPaymentApi<UniPaymentApiResponse<UniPaymentPayment>>(
        'cancelPayment',
        { org_id: currentOrg!.id, payment_id: paymentId },
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.uniPayment.payments(pspId ?? '', 1) })
      queryClient.invalidateQueries({ queryKey: queryKeys.uniPayment.balances(pspId ?? '') })
    },
  })
}

/* ── Transaction Sync ──────────────────────────────────────────────── */

export function useSyncTransactionsMutation(pspId: string | undefined) {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await callUniPaymentApi<SyncResult>('syncTransactions', {
        org_id: currentOrg!.id,
        psp_id: pspId,
      })
      return res
    },
    onSuccess: () => {
      // Invalidate transfers + PSP dashboard + sync status
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.pspDashboard.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.uniPayment.syncStatus(pspId ?? ''),
      })
    },
  })
}

/* ── Sync Status (from local DB) ───────────────────────────────────── */

export function useUniPaymentSyncStatus(pspId: string | undefined) {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: queryKeys.uniPayment.syncStatus(pspId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unipayment_sync_log')
        .select('*')
        .eq('psp_id', pspId!)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      return data
    },
    enabled: !!currentOrg && !!pspId,
    staleTime: 10_000,
  })
}
