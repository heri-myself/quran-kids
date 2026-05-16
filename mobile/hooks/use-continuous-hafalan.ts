// mobile/hooks/use-continuous-hafalan.ts
import { useState, useRef, useCallback, useEffect } from 'react'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'
import { evaluateVerse } from '../services/tilawah'
import type { EvaluateResponse } from '../services/tilawah'

export type VerseState =
  | 'pending'
  | 'listening'
  | 'analyzing'
  | 'correct'
  | 'wrong'
  | 'hint_shown'
  | 'skipped'

export interface VerseAttempt {
  verseNumber: number
  state: VerseState
  attempts: number
  withHint: boolean
  skipped: boolean
  lastScore: number
  wordResults: EvaluateResponse['wordResults']
  feedback: string[]
}

export interface UseContinuousHafalanReturn {
  verseAttempts: VerseAttempt[]
  currentIndex: number
  isRunning: boolean
  startSession: () => Promise<void>
  stopSession: () => void
  skipCurrentVerse: () => void
  reset: () => void
}

const SILENCE_DB_THRESHOLD = -50
const SILENCE_DURATION_MS = 1500
const POLL_INTERVAL_MS = 100

function buildInitialAttempts(verseNumbers: number[]): VerseAttempt[] {
  return verseNumbers.map((n) => ({
    verseNumber: n,
    state: 'pending',
    attempts: 0,
    withHint: false,
    skipped: false,
    lastScore: 0,
    wordResults: [],
    feedback: [],
  }))
}

export function useContinuousHafalan(
  chapterId: number,
  verseNumbers: number[],
  getExpectedText: (verseNumber: number) => string
): UseContinuousHafalanReturn {
  const [verseAttempts, setVerseAttempts] = useState<VerseAttempt[]>(
    () => buildInitialAttempts(verseNumbers)
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  const recordingRef = useRef<Audio.Recording | null>(null)
  const silenceCounterRef = useRef(0)
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isEvaluatingRef = useRef(false)
  const currentIndexRef = useRef(0)
  const isRunningRef = useRef(false)
  const verseAttemptsRef = useRef(verseAttempts)

  useEffect(() => {
    verseAttemptsRef.current = verseAttempts
  }, [verseAttempts])

  const updateVerse = useCallback((index: number, patch: Partial<VerseAttempt>) => {
    setVerseAttempts((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...patch } : v))
    )
  }, [])

  const stopPoller = useCallback(() => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current)
      pollerRef.current = null
    }
  }, [])

  const stopRecordingClean = useCallback(async (): Promise<string | null> => {
    stopPoller()
    const rec = recordingRef.current
    if (!rec) return null
    recordingRef.current = null
    try {
      await rec.stopAndUnloadAsync()
      return rec.getURI() ?? null
    } catch {
      return null
    }
  }, [stopPoller])

  const evaluateCurrentVerse = useCallback(async (uri: string) => {
    if (isEvaluatingRef.current) return
    isEvaluatingRef.current = true

    const idx = currentIndexRef.current
    updateVerse(idx, { state: 'analyzing' })

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any })
      const cur = verseAttemptsRef.current[idx]
      const expectedText = getExpectedText(cur.verseNumber)
      const result = await evaluateVerse(chapterId, cur.verseNumber, expectedText, base64)

      setVerseAttempts((prev) => {
        const current = prev[idx]
        const newAttempts = current.attempts + 1
        const passed = result.score >= 60

        let newState: VerseState
        if (passed) {
          newState = 'correct'
        } else if (newAttempts >= 5) {
          newState = 'skipped'
        } else if (newAttempts >= 3) {
          newState = 'hint_shown'
        } else {
          newState = 'wrong'
        }

        return prev.map((v, i) =>
          i === idx
            ? {
                ...v,
                attempts: newAttempts,
                state: newState,
                withHint: current.state === 'hint_shown' && passed,
                skipped: newState === 'skipped',
                lastScore: result.score,
                wordResults: result.wordResults,
                feedback: result.feedback,
              }
            : v
        )
      })
    } catch {
      updateVerse(idx, { state: 'wrong' })
    } finally {
      isEvaluatingRef.current = false
    }
  }, [chapterId, getExpectedText, updateVerse])

  const startListeningForVerse = useCallback(async (index: number) => {
    if (!isRunningRef.current) return

    currentIndexRef.current = index
    setCurrentIndex(index)
    silenceCounterRef.current = 0

    updateVerse(index, { state: 'listening' })

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      })
      recordingRef.current = recording

      pollerRef.current = setInterval(async () => {
        if (!isRunningRef.current || isEvaluatingRef.current) return
        try {
          const status = await recording.getStatusAsync()
          const metering = (status as any).metering ?? 0

          if (metering < SILENCE_DB_THRESHOLD) {
            silenceCounterRef.current += POLL_INTERVAL_MS
          } else {
            silenceCounterRef.current = 0
          }

          if (silenceCounterRef.current >= SILENCE_DURATION_MS) {
            silenceCounterRef.current = 0
            stopPoller()
            const uri = await stopRecordingClean()
            if (uri) await evaluateCurrentVerse(uri)
          }
        } catch {
          // recording already unloaded
        }
      }, POLL_INTERVAL_MS)
    } catch {
      updateVerse(index, { state: 'wrong' })
    }
  }, [updateVerse, stopPoller, stopRecordingClean, evaluateCurrentVerse])

  const advanceOrFinish = useCallback(async (idx: number) => {
    if (idx + 1 >= verseNumbers.length) {
      setIsRunning(false)
      isRunningRef.current = false
      return
    }
    await new Promise((r) => setTimeout(r, 300))
    await startListeningForVerse(idx + 1)
  }, [verseNumbers.length, startListeningForVerse])

  // Drive state transitions after evaluateCurrentVerse updates state
  useEffect(() => {
    if (!isRunning) return
    const cur = verseAttempts[currentIndex]
    if (!cur) return

    if (cur.state === 'correct' || cur.state === 'skipped') {
      advanceOrFinish(currentIndex)
    } else if (cur.state === 'wrong' || cur.state === 'hint_shown') {
      const t = setTimeout(() => {
        startListeningForVerse(currentIndex)
      }, 400)
      return () => clearTimeout(t)
    }
  }, [verseAttempts, currentIndex, isRunning, advanceOrFinish, startListeningForVerse])

  const startSession = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync()
    if (!granted) return
    setIsRunning(true)
    isRunningRef.current = true
    await startListeningForVerse(0)
  }, [startListeningForVerse])

  const stopSession = useCallback(async () => {
    isRunningRef.current = false
    setIsRunning(false)
    await stopRecordingClean()
    stopPoller()
  }, [stopRecordingClean, stopPoller])

  const skipCurrentVerse = useCallback(async () => {
    await stopRecordingClean()
    stopPoller()
    updateVerse(currentIndexRef.current, { state: 'skipped', skipped: true })
  }, [stopRecordingClean, stopPoller, updateVerse])

  const reset = useCallback(() => {
    stopSession()
    setVerseAttempts(buildInitialAttempts(verseNumbers))
    setCurrentIndex(0)
    currentIndexRef.current = 0
    isEvaluatingRef.current = false
    silenceCounterRef.current = 0
  }, [stopSession, verseNumbers])

  return {
    verseAttempts,
    currentIndex,
    isRunning,
    startSession,
    stopSession,
    skipCurrentVerse,
    reset,
  }
}
