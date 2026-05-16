// mobile/hooks/use-hafalan.ts
import { useState, useRef, useCallback } from 'react'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'
import { evaluateVerse, EvaluateResponse } from '../services/tilawah'

export type HafalanState = 'idle' | 'recording' | 'analyzing' | 'done' | 'error'

export function useHafalan(chapterId: number) {
  const [hafalanState, setHafalanState] = useState<HafalanState>('idle')
  const [currentEval, setCurrentEval] = useState<EvaluateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setCurrentEval(null)
      setRecordingDuration(0)

      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        setError('Izin mikrofon diperlukan')
        setHafalanState('error')
        return
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      recordingRef.current = recording
      setHafalanState('recording')

      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1)
      }, 1000)
    } catch {
      setError('Tidak bisa mengakses mikrofon')
      setHafalanState('error')
    }
  }, [])

  const stopAndEvaluate = useCallback(
    async (verseNumber: number, expectedText: string): Promise<EvaluateResponse | null> => {
      if (!recordingRef.current) return null

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      try {
        setHafalanState('analyzing')
        await recordingRef.current.stopAndUnloadAsync()
        const uri = recordingRef.current.getURI()
        recordingRef.current = null

        if (!uri) throw new Error('Rekaman tidak tersedia')

        const durationSnap = recordingDuration
        if (durationSnap < 1) {
          setError('Bacaan terlalu singkat, coba lagi')
          setHafalanState('error')
          return null
        }

        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64' as any,
        })

        const result = await evaluateVerse(chapterId, verseNumber, expectedText, base64)
        setCurrentEval(result)
        setHafalanState('done')
        return result
      } catch (e: any) {
        setError(e.message ?? 'Terjadi kesalahan analisis')
        setHafalanState('error')
        return null
      }
    },
    [chapterId, recordingDuration]
  )

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {})
      recordingRef.current = null
    }
    setHafalanState('idle')
    setCurrentEval(null)
    setError(null)
    setRecordingDuration(0)
  }, [])

  return {
    hafalanState,
    currentEval,
    error,
    recordingDuration,
    startRecording,
    stopAndEvaluate,
    reset,
  }
}
