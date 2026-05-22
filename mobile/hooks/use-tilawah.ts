import { useState, useRef, useCallback } from 'react'
import { Vibration } from 'react-native'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'
import { evaluateVerse, EvaluateResponse } from '../services/tilawah'
import { playStartSound, playStopSound } from '../utils/sound-fx'

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

const SILENCE_THRESHOLD_DB = -40
const SILENCE_DURATION_MS = 1800
const MIN_RECORDING_MS = 1500

export function useTilawah(chapterId: number) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [currentEval, setCurrentEval] = useState<EvaluateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const isStoppingRef = useRef(false)
  const verseDataRef = useRef<{ verseNumber: number; expectedText: string } | null>(null)

  const stopAndEvaluate = useCallback(async (verseNumber: number, expectedText: string) => {
    if (!recordingRef.current || isStoppingRef.current) return null
    isStoppingRef.current = true
    try {
      playStopSound()
      Vibration.vibrate([0, 30, 60, 30])
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
    } finally {
      isStoppingRef.current = false
    }
  }, [chapterId])

  const startRecording = useCallback(async (verseNumber: number, expectedText: string) => {
    verseDataRef.current = { verseNumber, expectedText }
    isStoppingRef.current = false
    try {
      setError(null)
      setCurrentEval(null)
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        setError('Izin mikrofon diperlukan. Buka Pengaturan > Privasi > Mikrofon dan aktifkan izin.')
        setRecordingState('error')
        return
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      })
      recordingRef.current = recording
      setRecordingState('recording')
      playStartSound()
      Vibration.vibrate(40)

      const startTime = Date.now()
      let silenceStart: number | null = null
      let hasSpoken = false

      recording.setProgressUpdateInterval(150)
      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording || isStoppingRef.current) return
        const level = status.metering ?? -160
        const elapsed = Date.now() - startTime

        if (level > SILENCE_THRESHOLD_DB) {
          hasSpoken = true
          silenceStart = null
        } else if (hasSpoken && elapsed > MIN_RECORDING_MS) {
          if (silenceStart === null) {
            silenceStart = Date.now()
          } else if (Date.now() - silenceStart >= SILENCE_DURATION_MS) {
            const verse = verseDataRef.current
            if (verse) stopAndEvaluate(verse.verseNumber, verse.expectedText)
          }
        }
      })
    } catch (e) {
      setError('Tidak bisa mengakses mikrofon')
      setRecordingState('error')
    }
  }, [stopAndEvaluate])

  const resetVerse = useCallback(() => {
    setRecordingState('idle')
    setCurrentEval(null)
    setError(null)
    setRetryCount(0)
    isStoppingRef.current = false
    verseDataRef.current = null
  }, [])

  return {
    recordingState,
    currentEval,
    error,
    retryCount,
    startRecording,
    stopAndEvaluate,
    resetVerse,
  }
}
