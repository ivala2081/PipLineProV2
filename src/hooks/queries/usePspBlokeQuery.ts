import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'

export type BlokeStatus = 'pending' | 'resolved' | 'written_off'

export interface BlokeTransfer {
  transferId: string
  fullName: string
  transferDate: string
  amount: number
  currency: string
  crmId: string | null
  metaId: string | null
  paymentMethod: string
  notes: string | null
  status: BlokeStatus
  resolutionDate: string | null
  resolutionNotes: string | null
  resolvedBy: string | null
  resolutionId: string | null
}

export function usePspBlokeQuery(pspId: string | undefined) {
  const { currentOrg } = useOrganization()

  return useQuery({
    queryKey: queryKeys.pspDashboard.bloke(pspId ?? ''),
    queryFn: async () => {
      if (!currentOrg || !pspId) throw new Error('Missing context')

      const { data: rows, error } = await supabase.rpc('get_psp_bloke_transfers', {
        _psp_id: pspId,
        _org_id: currentOrg.id,
      })

      if (error) throw error

      return (rows ?? []).map(
        (r: Record<string, unknown>): BlokeTransfer => ({
          transferId: String(r.transfer_id),
          fullName: String(r.full_name),
          transferDate: String(r.transfer_date),
          amount: Number(r.amount),
          currency: String(r.currency),
          crmId: r.crm_id ? String(r.crm_id) : null,
          metaId: r.meta_id ? String(r.meta_id) : null,
          paymentMethod: String(r.payment_method),
          notes: r.notes ? String(r.notes) : null,
          status: String(r.status) as BlokeStatus,
          resolutionDate: r.resolution_date ? String(r.resolution_date) : null,
          resolutionNotes: r.resolution_notes ? String(r.resolution_notes) : null,
          resolvedBy: r.resolved_by ? String(r.resolved_by) : null,
          resolutionId: r.resolution_id ? String(r.resolution_id) : null,
        }),
      )
    },
    enabled: !!currentOrg && !!pspId,
  })
}

export function useBlokeResolutionMutation(pspId: string) {
  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      transferId,
      status,
      date,
      notes,
    }: {
      transferId: string
      status: BlokeStatus
      date?: string
      notes?: string
    }) => {
      if (!currentOrg) throw new Error('Missing org')

      const { error } = await supabase.from('bloke_resolutions').upsert(
        {
          transfer_id: transferId,
          organization_id: currentOrg.id,
          status,
          resolution_date: date || null,
          resolution_notes: notes || null,
          resolved_by: user?.id || null,
        },
        { onConflict: 'transfer_id' },
      )

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pspDashboard.bloke(pspId) })
    },
  })
}
