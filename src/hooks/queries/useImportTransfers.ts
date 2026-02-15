import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { ResolvedTransferRow, ImportProgress } from '@/lib/csvImport/types'
import type { ExistingTransfer, MissingLookups } from '@/lib/csvImport/validateRows'

const BATCH_SIZE = 50

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export function useImportTransfers() {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  const importMutation = useMutation({
    mutationFn: async ({
      rows,
      onProgress,
    }: {
      rows: ResolvedTransferRow[]
      onProgress: (progress: ImportProgress) => void
    }) => {
      if (!currentOrg || !user) throw new Error('No organization or user')

      const batches = chunkArray(rows, BATCH_SIZE)
      const errors: ImportProgress['errors'] = []
      let insertedCount = 0

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const insertPayload = batch.map((row) => ({
          organization_id: currentOrg.id,
          full_name: row.fullName,
          crm_id: row.crmId,
          meta_id: row.metaId,
          payment_method_id: row.paymentMethodId!,
          transfer_date: row.transferDate,
          category_id: row.categoryId!,
          amount: row.amount,
          commission: row.commission,
          net: row.net,
          currency: row.currency,
          psp_id: row.pspId!,
          type_id: row.typeId!,
          exchange_rate: row.exchangeRate,
          amount_try: row.amountTry,
          amount_usd: row.amountUsd,
          commission_rate_snapshot: row.commissionRateSnapshot,
          created_by: user.id,
        }))

        const { error } = await supabase
          .from('transfers')
          .insert(insertPayload as never)

        if (error) {
          batch.forEach((row) => {
            errors.push({ rowIndex: row.rowIndex, message: error.message })
          })
        } else {
          insertedCount += batch.length
        }

        onProgress({
          phase: 'inserting',
          totalRows: rows.length,
          insertedRows: insertedCount,
          failedRows: errors.length,
          currentBatch: i + 1,
          totalBatches: batches.length,
          errors,
        })
      }

      return { insertedCount, errors }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })
    },
  })

  /** Fetch existing transfers for duplicate detection */
  async function fetchExistingTransfers(
    dateRange: { from: string; to: string },
  ): Promise<ExistingTransfer[]> {
    if (!currentOrg) return []
    const { data } = await supabase
      .from('transfers')
      .select('transfer_date, full_name, amount')
      .eq('organization_id', currentOrg.id)
      .gte('transfer_date', `${dateRange.from}T00:00:00`)
      .lte('transfer_date', `${dateRange.to}T23:59:59`)

    return (data ?? []) as ExistingTransfer[]
  }

  /** Create missing lookup entries so the CSV names can be resolved */
  async function createMissingLookups(missing: MissingLookups): Promise<void> {
    if (!currentOrg) throw new Error('No organization')

    // Create payment methods
    if (missing.paymentMethods.length > 0) {
      const { error } = await supabase.from('payment_methods').insert(
        missing.paymentMethods.map((name) => ({
          organization_id: currentOrg.id,
          name,
          is_active: true,
        })),
      )
      if (error) throw new Error(`Payment methods: ${error.message}`)
    }

    // Create categories
    if (missing.categories.length > 0) {
      const { error } = await supabase.from('transfer_categories').insert(
        missing.categories.map((c) => ({
          organization_id: currentOrg.id,
          name: c.name,
          is_deposit: c.isDeposit,
          is_active: true,
        })),
      )
      if (error) throw new Error(`Categories: ${error.message}`)
    }

    // Create PSPs (default 0% commission — user can adjust later)
    if (missing.psps.length > 0) {
      const { error } = await supabase.from('psps').insert(
        missing.psps.map((name) => ({
          organization_id: currentOrg.id,
          name,
          commission_rate: 0,
          is_active: true,
        })),
      )
      if (error) throw new Error(`PSPs: ${error.message}`)
    }

    // Create transfer types
    if (missing.types.length > 0) {
      const { error } = await supabase.from('transfer_types').insert(
        missing.types.map((name) => ({
          organization_id: currentOrg.id,
          name,
          is_active: true,
        })),
      )
      if (error) throw new Error(`Transfer types: ${error.message}`)
    }

    // Refetch lookup queries so the fresh data is available immediately
    await queryClient.refetchQueries({ queryKey: queryKeys.lookups.all })
  }

  return {
    importTransfers: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    fetchExistingTransfers,
    createMissingLookups,
  }
}
