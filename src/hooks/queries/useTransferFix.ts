import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import { localDayStart, localDayEnd } from '@/lib/date'
import { parseTurkishDecimal, parseTurkishDate } from '@/lib/csvImport/parseCsv'
import { findCategoryByAlias, findPaymentMethodByAlias, findTypeByAlias } from '@/lib/transferLookups'
import type { KasaRow, SystemTransfer, SystemDiscrepancy, FixProgress, EmployeeAssignment } from '@/pages/transfer-fix/types'

const BATCH_SIZE = 50

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export function useTransferFix() {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  /** Fetch all system transfers in a date range */
  const fetchSystemTransfers = useCallback(
    async (dateFrom: string, dateTo: string): Promise<SystemTransfer[]> => {
      if (!currentOrg) return []

      const { data, error } = await supabase
        .from('transfers')
        .select(
          'id, crm_id, meta_id, full_name, transfer_date, amount, amount_try, amount_usd, commission, net, currency, exchange_rate, category_id, type_id, payment_method_id, psp_id, employee_id, is_first_deposit, notes',
        )
        .eq('organization_id', currentOrg.id)
        .gte('transfer_date', localDayStart(dateFrom))
        .lte('transfer_date', localDayEnd(dateTo))
        .is('deleted_at', null)
        .order('transfer_date', { ascending: true })

      if (error) throw error
      return (data ?? []) as SystemTransfer[]
    },
    [currentOrg],
  )

  /** Build insert payload from a KASA row */
  function buildInsertPayload(kasaRow: KasaRow, pspRateMap: Map<string, number>) {
    if (!currentOrg || !user) throw new Error('No organization or user')

    const isoDate = parseTurkishDate(kasaRow.dateRaw)
    const amount = parseTurkishDecimal(kasaRow.amountRaw)
    const currency = kasaRow.currency.toUpperCase().trim()
    const commission = parseTurkishDecimal(kasaRow.commissionRaw)
    const net = parseTurkishDecimal(kasaRow.netRaw)

    const cat = findCategoryByAlias(kasaRow.categoryName)
    const pm = findPaymentMethodByAlias(kasaRow.paymentMethodName)
    const type = findTypeByAlias(kasaRow.typeName)

    // PSP: match by pspName (case-insensitive)
    const pspName = kasaRow.pspName.toLowerCase().trim()

    // Exchange rate from CSV daily summary section
    let exchangeRate = 1
    let amountTry = amount
    let amountUsd = 0

    if (currency === 'TL') {
      amountTry = amount
    } else if (currency === 'USD' || currency === 'USDT') {
      amountUsd = amount
    }

    return {
      organization_id: currentOrg.id,
      full_name: kasaRow.fullName,
      crm_id: kasaRow.crmId || null,
      meta_id: kasaRow.metaId || null,
      payment_method_id: pm?.id ?? 'bank',
      psp_id: null as string | null, // Will be resolved later
      transfer_date: isoDate ? `${isoDate}T00:00:00` : '',
      category_id: cat?.id ?? 'dep',
      amount,
      commission,
      net,
      currency,
      type_id: type?.id ?? 'client',
      exchange_rate: exchangeRate,
      amount_try: amountTry,
      amount_usd: amountUsd,
      commission_rate_snapshot: 0,
      created_by: user.id,
    }
  }

  /** Apply fix actions: insert, update, delete */
  const applyFixes = useCallback(
    async (
      discrepancies: SystemDiscrepancy[],
      kasaExchangeRates: Map<string, number>,
      onProgress: (progress: FixProgress) => void,
    ) => {
      if (!currentOrg || !user) throw new Error('No organization or user')

      const toInsert = discrepancies.filter((d) => d.action === 'insert' && d.kasaRow)
      const toUpdate = discrepancies.filter(
        (d) => d.action === 'update' && d.kasaRow && d.systemRow,
      )
      const toDelete = discrepancies.filter((d) => d.action === 'delete' && d.systemRow)

      const total = toInsert.length + toUpdate.length + toDelete.length
      const progress: FixProgress = {
        phase: 'running',
        total,
        inserted: 0,
        updated: 0,
        deleted: 0,
        failed: 0,
        errors: [],
      }
      onProgress({ ...progress })

      // Fetch PSP rates
      const pspRateMap = new Map<string, number>()

      // Resolve PSP names to IDs
      const { data: psps } = await supabase
        .from('psps')
        .select('id, name, commission_rate')
        .eq('organization_id', currentOrg.id)
      const pspNameMap = new Map<string, string>()
      for (const psp of psps ?? []) {
        pspNameMap.set(psp.name.toLowerCase(), psp.id)
        pspRateMap.set(psp.id, Number(psp.commission_rate))
      }

      // Insert
      if (toInsert.length > 0) {
        const batches = chunkArray(toInsert, BATCH_SIZE)
        for (const batch of batches) {
          const payload = batch.map((d) => {
            const row = buildInsertPayload(d.kasaRow!, pspRateMap)
            // Resolve PSP
            const pspKey = d.kasaRow!.pspName.toLowerCase().trim()
            row.psp_id = pspNameMap.get(pspKey) ?? null

            // Exchange rate from KASA summary
            const dateKey = row.transfer_date.slice(0, 10)
            const rate = kasaExchangeRates.get(dateKey)
            if (rate) {
              row.exchange_rate = rate
              if (row.currency === 'TL') {
                row.amount_usd =
                  rate > 1 ? Math.round((row.amount / rate) * 100) / 100 : 0
              } else {
                row.amount_try = Math.round(row.amount * rate * 100) / 100
              }
            }

            return row
          })

          const { error } = await supabase.from('transfers').insert(payload as never)
          if (error) {
            progress.failed += batch.length
            progress.errors.push({ index: 0, message: error.message })
          } else {
            progress.inserted += batch.length
          }
          onProgress({ ...progress })
        }
      }

      // Update
      for (const d of toUpdate) {
        const kasaRow = d.kasaRow!
        const sysRow = d.systemRow!

        const amount = parseTurkishDecimal(kasaRow.amountRaw)
        const commission = parseTurkishDecimal(kasaRow.commissionRaw)
        const net = parseTurkishDecimal(kasaRow.netRaw)
        const currency = kasaRow.currency.toUpperCase().trim()
        const cat = findCategoryByAlias(kasaRow.categoryName)
        const pm = findPaymentMethodByAlias(kasaRow.paymentMethodName)
        const type = findTypeByAlias(kasaRow.typeName)
        const pspKey = kasaRow.pspName.toLowerCase().trim()
        const pspId = pspNameMap.get(pspKey) ?? sysRow.psp_id

        const isoDate = parseTurkishDate(kasaRow.dateRaw)
        const rate = isoDate ? kasaExchangeRates.get(isoDate) : undefined

        let amountTry = currency === 'TL' ? amount : rate ? Math.round(amount * rate * 100) / 100 : sysRow.amount_try
        let amountUsd =
          currency === 'USD' || currency === 'USDT'
            ? amount
            : rate && rate > 1
              ? Math.round((amount / rate) * 100) / 100
              : sysRow.amount_usd

        const { error } = await supabase
          .from('transfers')
          .update({
            full_name: kasaRow.fullName,
            crm_id: kasaRow.crmId || null,
            meta_id: kasaRow.metaId || null,
            amount,
            commission,
            net,
            currency,
            category_id: cat?.id ?? sysRow.category_id,
            payment_method_id: pm?.id ?? sysRow.payment_method_id,
            type_id: type?.id ?? sysRow.type_id,
            psp_id: pspId,
            exchange_rate: rate ?? sysRow.exchange_rate,
            amount_try: amountTry,
            amount_usd: amountUsd,
            updated_by: user.id,
          } as never)
          .eq('id', sysRow.id)

        if (error) {
          progress.failed++
          progress.errors.push({ index: 0, message: error.message })
        } else {
          progress.updated++
        }
        onProgress({ ...progress })
      }

      // Delete (soft delete)
      if (toDelete.length > 0) {
        const ids = toDelete.map((d) => d.systemRow!.id)
        const batches = chunkArray(ids, BATCH_SIZE)
        for (const batch of batches) {
          const { error } = await supabase
            .from('transfers')
            .update({ deleted_at: new Date().toISOString(), deleted_by: user.id } as never)
            .in('id', batch)

          if (error) {
            progress.failed += batch.length
            progress.errors.push({ index: 0, message: error.message })
          } else {
            progress.deleted += batch.length
          }
          onProgress({ ...progress })
        }
      }

      progress.phase = progress.failed > 0 ? 'error' : 'done'
      onProgress({ ...progress })

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })
    },
    [currentOrg, user, queryClient],
  )

  /** Fetch all active HR employees */
  const fetchHrEmployees = useCallback(async () => {
    if (!currentOrg) return []
    const { data, error } = await supabase
      .from('hr_employees')
      .select('id, full_name')
      .eq('organization_id', currentOrg.id)
      .eq('is_active', true)
      .order('full_name')
    if (error) throw error
    return data ?? []
  }, [currentOrg])

  /** Bulk assign employees to transfers */
  const applyEmployeeAssignments = useCallback(
    async (
      assignments: EmployeeAssignment[],
      onProgress: (done: number, total: number, failed: number) => void,
    ) => {
      const toApply = assignments.filter((a) => a.selected && a.resolvedEmployeeId)
      let done = 0
      let failed = 0

      const batches = chunkArray(toApply, BATCH_SIZE)
      for (const batch of batches) {
        // Group by employee_id to batch updates
        for (const assignment of batch) {
          const { error } = await supabase
            .from('transfers')
            .update({ employee_id: assignment.resolvedEmployeeId } as never)
            .eq('id', assignment.transferId)

          if (error) {
            failed++
          } else {
            done++
          }
        }
        onProgress(done, toApply.length, failed)
      }

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() })

      return { done, failed, total: toApply.length }
    },
    [queryClient],
  )

  return {
    fetchSystemTransfers,
    fetchHrEmployees,
    applyFixes,
    applyEmployeeAssignments,
  }
}
