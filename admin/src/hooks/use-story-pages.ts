'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type StoryPage = {
  id: string
  storyId: string
  pageNumber: number
  textArabic: string | null
  textLatin: string | null
  textTranslation: string
  illustrationUrl: string | null
  audioUrl: string | null
  durationSeconds: number | null
  createdAt: string
}

export function useStoryPages(slug: string) {
  return useQuery({
    queryKey: ['story-pages', slug],
    queryFn: () => api.get<StoryPage[]>(`/stories/${slug}/pages`),
    enabled: !!slug,
  })
}

export function useUploadPage(storyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (form: FormData) => api.upload<StoryPage>(`/admin/stories/${storyId}/pages`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-pages'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stories'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}
