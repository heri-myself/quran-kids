import { useQuery } from '@tanstack/react-query'
import { getStoriesApi, getStoryApi, getStoryPagesApi } from '../services/stories'

export function useStories(params?: { category?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['stories', params],
    queryFn: () => getStoriesApi(params),
  })
}

export function useStory(slug: string | undefined) {
  return useQuery({
    queryKey: ['story', slug],
    queryFn: () => getStoryApi(slug!),
    enabled: !!slug,
  })
}

export function useStoryPages(slug: string | undefined) {
  return useQuery({
    queryKey: ['story-pages', slug],
    queryFn: () => getStoryPagesApi(slug!),
    enabled: !!slug,
  })
}
