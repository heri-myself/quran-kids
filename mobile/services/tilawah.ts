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

const POLL_INTERVAL_MS = 3_000
const POLL_TIMEOUT_MS  = 120_000  // 2 menit total, tapi koneksi per-request hanya <5s

async function submitJob(path: string, payload: object): Promise<string> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error ?? `Submit gagal (${res.status})`)
  }
  const data = await res.json()
  return data.jobId as string
}

async function pollJob(jobId: string): Promise<EvaluateResponse> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
    const res = await fetch(`${API_URL}/tilawah/job/${jobId}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as any).error ?? `Evaluasi gagal (${res.status})`)
    }
    const data = await res.json()
    if (data.status === 'completed') return data.result as EvaluateResponse
    if (data.status === 'failed') throw new Error(data.error ?? 'Evaluasi gagal')
    // 'pending' — lanjut poll
  }
  throw new Error('Proses terlalu lama, coba lagi sebentar lagi.')
}

export async function evaluateVerse(
  chapterId: number,
  verseNumber: number,
  expectedText: string,
  audioBase64: string
): Promise<EvaluateResponse> {
  const jobId = await submitJob('/tilawah/evaluate', { chapterId, verseNumber, expectedText, audioBase64 })
  return pollJob(jobId)
}

export async function evaluateVerseSimple(
  chapterId: number,
  verseNumber: number,
  expectedText: string,
  audioBase64: string
): Promise<EvaluateResponse> {
  const jobId = await submitJob('/tilawah/evaluate-simple', { chapterId, verseNumber, expectedText, audioBase64 })
  return pollJob(jobId)
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
