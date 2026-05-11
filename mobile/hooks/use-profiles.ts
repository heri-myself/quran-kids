import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfilesApi, createProfileApi, deleteProfileApi } from '../services/profiles'

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: getProfilesApi,
  })
}

export function useCreateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProfileApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })
}

export function useDeleteProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProfileApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })
}
