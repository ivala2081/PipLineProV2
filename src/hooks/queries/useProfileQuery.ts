import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Profile, Organization, OrganizationMember } from '@/lib/database.types'

export interface ProfileWithMemberships extends Profile {
  memberships: (OrganizationMember & {
    organization: Pick<Organization, 'id' | 'name' | 'slug'>
  })[]
}

export function useProfileQuery(userId: string) {
  return useQuery({
    queryKey: queryKeys.profiles.detail(userId),
    queryFn: async (): Promise<ProfileWithMemberships> => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError
      if (!profile) throw new Error('Profile not found')

      const { data: memberships, error: membershipsError } = await supabase
        .from('organization_members')
        .select(
          '*, organization:organizations!organization_members_organization_id_fkey(id, name, slug)',
        )
        .eq('user_id', userId)

      if (membershipsError) throw membershipsError

      return {
        ...profile,
        memberships: (memberships as unknown as ProfileWithMemberships['memberships']) ?? [],
      }
    },
    enabled: !!userId,
  })
}
