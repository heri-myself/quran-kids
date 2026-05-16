// mobile/services/hafalan.ts
import { apiRequest } from './api'

export interface HafalanWordResult {
  word: string
  correct: boolean
  expected: string
}

export interface SaveHafalanPayload {
  profileId: string
  chapterId: number
  verses: {
    verseNumber: number
    score: number
    wordResults: HafalanWordResult[]
  }[]
}

export interface SaveHafalanResponse {
  id: string
  avgScore: number
  pointsEarned: number
}

export async function saveHafalanSession(
  payload: SaveHafalanPayload
): Promise<SaveHafalanResponse> {
  return apiRequest<SaveHafalanResponse>('/hafalan/session', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
