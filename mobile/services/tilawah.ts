import { getStoredToken } from './api'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.4:3001'

export interface WordResult {
  word: string
  correct: boolean
  expected: string
}

export interface EvaluateResponse {
  score: number
  wordAccuracy: number
  tajweedScore: number
  wordResults: WordResult[]
  transcription: string
  feedback: string[]
}

export interface SaveSessionPayload {
  profileId: string
  chapterId: number
  totalScore: number
  stars: number
  pointsEarned: number
  verses: {
    verseNumber: number
    score: number
    wordAccuracy: number
    tajweedScore: number
    feedback: string[]
  }[]
}

export interface SaveSessionResponse {
  sessionId: string
  totalScore: number
  stars: number
  pointsEarned: number
}

export async function evaluateVerse(
  chapterId: number,
  verseNumber: number,
  expectedText: string,
  audioBase64: string
): Promise<EvaluateResponse> {
  const res = await fetch(`${API_URL}/tilawah/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chapterId, verseNumber, expectedText, audioBase64 }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error ?? (err as any).message ?? `Evaluasi gagal (${res.status})`)
  }
  return res.json()
}

export async function saveSession(
  payload: SaveSessionPayload
): Promise<SaveSessionResponse> {
  const token = await getStoredToken()
  const res = await fetch(`${API_URL}/tilawah/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error ?? (err as any).message ?? `Gagal menyimpan sesi (${res.status})`)
  }
  return res.json()
}
