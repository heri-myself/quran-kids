'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type Story = {
  id: string
  title: string
  slug: string
  category: 'sahabat_nabi' | 'kisah_quran' | 'akhlaq'
  difficultyLevel: 'easy' | 'medium' | 'hard'
  isPremium: boolean
  isPublished: boolean
  totalPages: number
  coverImageUrl: string | null
  createdAt: string
  updatedAt: string
}

type StoriesResponse = {
  data: Story[]
  total: number
  page: number
  limit: number
}

export function useStories() {
  return useQuery({
    queryKey: ['stories'],
    queryFn: () => api.get<StoriesResponse>('/stories?limit=100'),
  })
}

export function useAllAdminStories() {
  return useQuery({
    queryKey: ['admin-stories'],
    queryFn: () => api.get<StoriesResponse>('/stories?limit=100'),
  })
}

export function useCreateStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      title: string
      slug: string
      category: string
      difficultyLevel: string
      isPremium: boolean
    }) => api.post<Story>('/admin/stories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stories'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

export function useDeleteStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/stories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stories'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

export function usePublishStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.put<Story>(`/admin/stories/${id}/publish`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stories'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}
