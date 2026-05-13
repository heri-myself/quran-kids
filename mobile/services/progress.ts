import { api } from './api'

export interface Gamification {
  id: string
  profileId: string
  totalPoints: number
  currentLevel: number
  currentStreak: number
  lastReadAt: string | null
}

export interface Badge {
  id: string
  name: string
  description: string
  iconUrl: string | null
  requirementType: 'stories_completed' | 'streak_days' | 'points'
  requirementValue: number
  earnedAt?: string
}

export interface BadgeWithEarned extends Badge {
  earned: boolean
  earnedAt: string | null
}

export type GamificationResponse = Gamification & {
  badges: BadgeWithEarned[]
}

export interface ProgressResponse {
  gamification: Gamification
  newBadges: Badge[]
}

export function getGamificationApi(profileId: string): Promise<GamificationResponse> {
  return api.get<GamificationResponse>(`/gamification/${profileId}`)
}

export function postProgressApi(data: {
  profileId: string
  storyId: string
  lastPage: number
  isCompleted: boolean
}): Promise<ProgressResponse> {
  return api.post<ProgressResponse>('/progress', data)
}
