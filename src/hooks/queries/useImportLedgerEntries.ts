import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { LedgerParsedRow, LedgerImportProgress } from '@/lib/csvImport/ledgerTypes'

const BATCH_SIZE = 50

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export function useImportLedgerEntries() {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  const importMutation = useMutation({
    mutationFn: async ({
      rows,
      onProgress,
    }: {
      rows: LedgerParsedRow[]
      onProgress: (progress: LedgerImportProgress) => void
    }) => {
      if (!currentOrg || !user) throw new Error('No organization or user')

      const batches = chunkArray(rows, BATCH_SIZE)
      const errors: LedgerImportProgress['errors'] = []
      let insertedCount = 0

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const insertPayload = batch.map((row) => ({
          organization_id: currentOrg.id,
          description: row.description,
          entry_type: row.entryType,
          direction: row.direction,
          amount: row.amount,
          currency: row.currency,
          cost_period: row.costPeriod || null,
          entry_date: row.entryDate,
          payment_period: row.paymentPeriod || null,
          register: row.register,
          created_by: user.id,
        }))

        const { error } = await supabase.from('accounting_entries').insert(insertPayload as never)

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
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })

  return {
    importLedgerEntries: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
  }
}
