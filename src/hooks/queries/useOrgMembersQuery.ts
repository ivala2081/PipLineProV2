import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { OrganizationMember, Profile } from '@/lib/database.types'

export interface MemberWithProfile extends OrganizationMember {
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'system_role'> | null
}

export function useOrgMembersQuery(orgId: string) {
  return useQuery({
    queryKey: queryKeys.organizations.members(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*, profile:profiles!organization_members_user_id_profiles_fkey(id, display_name, avatar_url, system_role)')
        .eq('organization_id', orgId)
        .order('created_at')

      if (error) throw error
      return (data as unknown as MemberWithProfile[]) ?? []
    },
    enabled: !!orgId,
  })
}
