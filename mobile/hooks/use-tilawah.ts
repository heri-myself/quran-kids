import { useState, useRef, useCallback } from 'react'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'
import { evaluateVerse, EvaluateResponse } from '../services/tilawah'

export type RecordingState = 'idle' | 'recording' | 'analyzing' | 'done' | 'error'

export interface VerseResult {
  verseNumber: number
  score: number
  wordAccuracy: number
  tajweedScore: number
  feedback: string[]
  evaluation: EvaluateResponse
}

export function calcStars(score: number): number {
  if (score >= 85) return 3
  if (score >= 65) return 2
  return 1
}

export function calcPoints(stars: number, score: number): number {
  if (score === 100) return 75
  if (stars === 3) return 50
  if (stars === 2) return 25
  return 10
}

export function useTilawah(chapterId: number) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [currentEval, setCurrentEval] = useState<EvaluateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const recordingRef = useRef<Audio.Recording | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setCurrentEval(null)
      await Audio.requestPermissionsAsync()
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      recordingRef.current = recording
      setRecordingState('recording')
    } catch (e) {
      setError('Tidak bisa mengakses mikrofon')
      setRecordingState('error')
    }
  }, [])

  const stopAndEvaluate = useCallback(async (verseNumber: number, expectedText: string) => {
    if (!recordingRef.current) return null
    try {
      setRecordingState('analyzing')
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()
      recordingRef.current = null

      if (!uri) throw new Error('Rekaman tidak tersedia')

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      })

      const result = await evaluateVerse(chapterId, verseNumber, expectedText, base64)
      setCurrentEval(result)
      setRecordingState('done')
      setRetryCount(c => c + 1)
      return result
    } catch (e: any) {
      setError(e.message ?? 'Terjadi kesalahan analisis')
      setRecordingState('error')
      setRetryCount(c => c + 1)
      return null
    }
  }, [chapterId])

  const reset = useCallback(() => {
    setRecordingState('idle')
    setCurrentEval(null)
    setError(null)
  }, [])

  const resetVerse = useCallback(() => {
    setRecordingState('idle')
    setCurrentEval(null)
    setError(null)
    setRetryCount(0)
  }, [])

  return {
    recordingState,
    currentEval,
    error,
    retryCount,
    startRecording,
    stopAndEvaluate,
    reset,
    resetVerse,
  }
}
