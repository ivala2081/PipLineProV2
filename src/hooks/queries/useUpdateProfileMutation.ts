import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'

interface UpdateProfileData {
  display_name?: string
  phone?: string | null
  bio?: string | null
  department?: string | null
  notes?: string | null
}

export function useUpdateProfileMutation(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profiles.detail(userId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all,
      })
    },
  })
}
