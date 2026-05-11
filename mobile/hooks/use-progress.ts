import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGamificationApi, postProgressApi } from '../services/progress'

export function useGamification(profileId: string | undefined) {
  return useQuery({
    queryKey: ['gamification', profileId],
    queryFn: () => getGamificationApi(profileId!),
    enabled: !!profileId,
  })
}

export function usePostProgress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: postProgressApi,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gamification', variables.profileId] })
    },
  })
}
