import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { checkApiHealth, updateApiSecrets } from '@/lib/apiHealthApi'
import { useToast } from '@/hooks/useToast'
import { useTranslation } from 'react-i18next'

export function useApiHealthQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.apiHealth.status(),
    queryFn: checkApiHealth,
    enabled,
    staleTime: 10 * 60_000, // 10 min – health check results are stable
    gcTime: 20 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useUpdateSecretsMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('pages')

  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: (secrets: { name: string; value: string }[]) => updateApiSecrets(secrets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiHealth.all })
      toast({
        title: t('security.api.dialog.success'),
        variant: 'success',
      })
    },
    onError: (err: Error) => {
      toast({
        title: t('security.api.dialog.error'),
        description: err.message,
        variant: 'error',
      })
    },
  })
}
