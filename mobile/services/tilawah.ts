import { getStoredToken } from './api'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api-kids.qbest.id'

export interface WordResult {
  word: string
  correct: boolean
  expected: string
  status?: 'correct' | 'wrong' | 'missing' | 'mad_short'
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

const EVAL_TIMEOUT_MS = 200_000

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer))
    .catch((err) => {
      if (err?.name === 'AbortError') {
        throw new Error('Proses terlalu lama, coba lagi sebentar lagi.')
      }
      throw err
    })
}

export async function evaluateVerse(
  chapterId: number,
  verseNumber: number,
  expectedText: string,
  audioBase64: string
): Promise<EvaluateResponse> {
  const res = await fetchWithTimeout(
    `${API_URL}/tilawah/evaluate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId, verseNumber, expectedText, audioBase64 }),
    },
    EVAL_TIMEOUT_MS
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error ?? (err as any).message ?? `Evaluasi gagal (${res.status})`)
  }
  return res.json()
}


export async function evaluateVerseSimple(
  chapterId: number,
  verseNumber: number,
  expectedText: string,
  audioBase64: string
): Promise<EvaluateResponse> {
  const res = await fetchWithTimeout(
    `${API_URL}/tilawah/evaluate-simple`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId, verseNumber, expectedText, audioBase64 }),
    },
    EVAL_TIMEOUT_MS
  )
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
