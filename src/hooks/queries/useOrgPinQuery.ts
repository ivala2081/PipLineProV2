import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { getDeviceId } from '@/lib/deviceFingerprinting'

const ORG_PIN_KEY = 'orgPin'

/** Check whether the current org has a PIN configured */
export function useHasOrgPin() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id

  return useQuery({
    queryKey: [ORG_PIN_KEY, 'has', orgId],
    queryFn: async () => {
      if (!orgId) return false
      const { data, error } = await supabase.rpc('has_org_pin', {
        p_organization_id: orgId,
      })
      if (error) throw error
      return data as boolean
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 30, // 30 min
  })
}

/** Verify a PIN against the server — returns true/false or throws on rate limit */
export function useVerifyOrgPin() {
  const { currentOrg } = useOrganization()

  return useMutation({
    mutationFn: async (pin: string) => {
      if (!currentOrg?.id) throw new Error('No organization selected')
      const deviceId = getDeviceId()
      const { data, error } = await supabase.rpc('verify_org_pin', {
        p_organization_id: currentOrg.id,
        p_pin: pin,
        p_device_id: deviceId,
      })
      if (error) {
        if (error.message?.includes('RATE_LIMITED')) {
          throw new Error('RATE_LIMITED')
        }
        throw error
      }
      return data as boolean
    },
  })
}

/** Set or update the org PIN (admin/god only) */
export function useSetOrgPin() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newPin: string) => {
      if (!currentOrg?.id) throw new Error('No organization selected')
      const { error } = await supabase.rpc('set_org_pin', {
        p_organization_id: currentOrg.id,
        p_new_pin: newPin,
      })
      if (error) {
        if (error.message?.includes('UNAUTHORIZED')) throw new Error('UNAUTHORIZED')
        if (error.message?.includes('PIN_INVALID_FORMAT')) throw new Error('PIN_INVALID_FORMAT')
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORG_PIN_KEY, 'has', currentOrg?.id] })
    },
  })
}
