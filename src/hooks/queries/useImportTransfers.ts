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

      // Fetch PSP commission rates for all PSPs referenced by rows
      const pspIds = [...new Set(rows.map((r) => r.pspId).filter(Boolean))] as string[]
      const rateMap = new Map<string, number>()
      if (pspIds.length > 0) {
        const { data: pspData } = await supabase
          .from('psps')
          .select('id, commission_rate')
          .in('id', pspIds)
        for (const p of pspData ?? []) {
          rateMap.set(p.id, Number(p.commission_rate))
        }
      }

      const batches = chunkArray(rows, BATCH_SIZE)
      const errors: ImportProgress['errors'] = []
      let insertedCount = 0

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const insertPayload = batch.map((row) => {
          const commissionRate = row.pspId ? (rateMap.get(row.pspId) ?? 0) : 0
          const commission = Math.round(Math.abs(row.amount) * commissionRate * 100) / 100
          const net = row.amount - (row.isDeposit ? commission : -commission)

          return {
            organization_id: currentOrg.id,
            full_name: row.fullName,
            crm_id: row.crmId,
            meta_id: row.metaId,
            payment_method_id: row.paymentMethodId!,
            psp_id: row.pspId!,
            transfer_date: row.transferDate,
            category_id: row.categoryId!,
            amount: row.amount,
            commission,
            net,
            currency: row.currency,
            type_id: row.typeId!,
            exchange_rate: row.exchangeRate,
            amount_try: row.amountTry,
            amount_usd: row.amountUsd,
            commission_rate_snapshot: commissionRate,
            created_by: user.id,
          }
        })

        const { error } = await supabase.from('transfers').insert(insertPayload as never)

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
      queryClient.invalidateQueries({ queryKey: queryKeys.pspDashboard.all })
    },
  })

  /** Fetch existing transfers for duplicate detection */
  async function fetchExistingTransfers(dateRange: {
    from: string
    to: string
  }): Promise<ExistingTransfer[]> {
    if (!currentOrg) return []
    const { data } = await supabase
      .from('transfers')
      .select('transfer_date, full_name, amount')
      .eq('organization_id', currentOrg.id)
      .gte('transfer_date', `${dateRange.from}T00:00:00`)
      .lte('transfer_date', `${dateRange.to}T23:59:59`)

    return (data ?? []) as ExistingTransfer[]
  }

  /**
   * Lookup tables are now fixed and cannot be modified by the application.
   * All CSV values must match the predefined aliases in the database.
   * This function now throws an error if any lookups are missing.
   */
  async function createMissingLookups(missing: MissingLookups): Promise<void> {
    const errors: string[] = []

    if (missing.paymentMethods.length > 0) {
      errors.push(
        `Payment methods not found: ${missing.paymentMethods.join(', ')}. ` +
          `Valid values: Bank, Credit Card, Tether`,
      )
    }

    if (missing.categories.length > 0) {
      errors.push(
        `Categories not found: ${missing.categories.map((c) => c.name).join(', ')}. ` +
          `Valid values: DEP (deposit), WD (withdrawal)`,
      )
    }

    if (missing.types.length > 0) {
      errors.push(
        `Transfer types not found: ${missing.types.join(', ')}. ` +
          `Valid values: Client, Payment, Blocked`,
      )
    }

    if (missing.psps.length > 0) {
      errors.push(
        `PSPs not found: ${missing.psps.join(', ')}. ` +
          `Please create these PSPs in your organization before importing.`,
      )
    }

    if (errors.length > 0) {
      throw new Error(
        'CSV contains invalid lookup values. Please fix your CSV file:\n\n' + errors.join('\n\n'),
      )
    }
  }

  return {
    importTransfers: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    fetchExistingTransfers,
    createMissingLookups,
  }
}
