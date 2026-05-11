import { api } from './api'

export interface Story {
  id: string
  title: string
  slug: string
  category: 'sahabat_nabi' | 'kisah_quran' | 'akhlaq'
  difficultyLevel: 'easy' | 'medium' | 'hard'
  isPremium: boolean
  isPublished: boolean
  totalPages: number
  coverImageUrl: string | null
}

export interface StoryPage {
  id: string
  storyId: string
  pageNumber: number
  textArabic: string | null
  textLatin: string | null
  textTranslation: string
  illustrationUrl: string | null
  audioUrl: string | null
  durationSeconds: number | null
}

export interface StoriesResponse {
  data: Story[]
  total: number
  page: number
  limit: number
}

export function getStoriesApi(params?: { category?: string; page?: number }): Promise<StoriesResponse> {
  const query = new URLSearchParams()
  if (params?.category) query.set('category', params.category)
  if (params?.page) query.set('page', String(params.page))
  query.set('limit', '20')
  return api.get<StoriesResponse>(`/stories?${query.toString()}`)
}

export function getStoryApi(slug: string): Promise<Story> {
  return api.get<Story>(`/stories/${slug}`)
}

export function getStoryPagesApi(slug: string): Promise<StoryPage[]> {
  return api.get<StoryPage[]>(`/stories/${slug}/pages`)
}
