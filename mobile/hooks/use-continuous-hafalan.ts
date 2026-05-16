// mobile/hooks/use-continuous-hafalan.ts
import { useState, useRef, useCallback, useEffect } from 'react'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'
import { evaluateVerseSimple, type EvaluateResponse } from '../services/tilawah'

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
  stopSession: () => Promise<void>
  skipCurrentVerse: () => void
  showHint: (index: number) => void
  reset: () => void
}

const SILENCE_DB_THRESHOLD = -50
const SILENCE_DURATION_MS = 800
const POLL_INTERVAL_MS = 100
const SPEECH_DB_THRESHOLD = -35  // metering above this = user is speaking

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
  const hasSpokenRef = useRef(false)
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isAdvancingRef = useRef(false)
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

  const markVerseRead = useCallback(async (uri: string) => {
    const idx = currentIndexRef.current
    const cur = verseAttemptsRef.current[idx]

    // Mark as analyzing while we evaluate
    updateVerse(idx, { state: 'analyzing' })

    let score = 100
    let wordResults: EvaluateResponse['wordResults'] = []
    let isCorrect = true

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any })
      const result = await evaluateVerseSimple(
        chapterId,
        cur.verseNumber,
        getExpectedText(cur.verseNumber),
        base64,
      )
      isCorrect = result.wordAccuracy >= 60
      score = isCorrect ? 100 : result.wordAccuracy
      wordResults = result.wordResults
    } catch {
      // Evaluation failed — treat as correct so session can continue
    }

    if (isCorrect) {
      setVerseAttempts((prev) =>
        prev.map((v, i) =>
          i === idx
            ? { ...v, state: 'correct', attempts: cur.attempts + 1, lastScore: score, wordResults, feedback: [] }
            : v
        )
      )
    } else {
      setVerseAttempts((prev) =>
        prev.map((v, i) =>
          i === idx
            ? { ...v, state: 'listening', attempts: cur.attempts + 1, lastScore: score, wordResults, feedback: [] }
            : v
        )
      )
      // Restart recording for same verse after short pause
      setTimeout(() => {
        startListeningRef.current(idx)
      }, 500)
    }

    FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {})
  }, [chapterId, getExpectedText, updateVerse])

  const startListeningForVerse = useCallback(async (index: number) => {
    if (!isRunningRef.current) return

    currentIndexRef.current = index
    setCurrentIndex(index)
    silenceCounterRef.current = 0
    hasSpokenRef.current = false

    updateVerse(index, { state: 'listening' })

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      })
      recordingRef.current = recording

      pollerRef.current = setInterval(async () => {
        if (!isRunningRef.current) return
        try {
          const status = await recording.getStatusAsync()
          const metering = (status as any).metering ?? 0

          if (metering >= SPEECH_DB_THRESHOLD) {
            hasSpokenRef.current = true
            silenceCounterRef.current = 0
          } else if (metering < SILENCE_DB_THRESHOLD && hasSpokenRef.current) {
            silenceCounterRef.current += POLL_INTERVAL_MS
          }

          if (hasSpokenRef.current && silenceCounterRef.current >= SILENCE_DURATION_MS) {
            silenceCounterRef.current = 0
            stopPoller()
            const uri = await stopRecordingClean()
            if (uri) markVerseRead(uri)
          }
        } catch {
          // recording already unloaded
        }
      }, POLL_INTERVAL_MS)
    } catch {
      updateVerse(index, { state: 'wrong' })
    }
  }, [updateVerse, stopPoller, stopRecordingClean, markVerseRead])

  const startListeningRef = useRef(startListeningForVerse)
  useEffect(() => {
    startListeningRef.current = startListeningForVerse
  }, [startListeningForVerse])

  const advanceOrFinish = useCallback(async (idx: number) => {
    if (idx + 1 >= verseNumbers.length) {
      setIsRunning(false)
      isRunningRef.current = false
      isAdvancingRef.current = false
      return
    }
    await new Promise((r) => setTimeout(r, 100))
    await startListeningForVerse(idx + 1)
    isAdvancingRef.current = false
  }, [verseNumbers.length, startListeningForVerse])

  // Drive state transitions after evaluateCurrentVerse updates state
  const currentVerseState = verseAttempts[currentIndex]?.state

  useEffect(() => {
    if (!isRunning) return
    const cur = verseAttempts[currentIndex]
    if (!cur) return

    if (cur.state === 'correct' || cur.state === 'skipped') {
      if (isAdvancingRef.current) return
      isAdvancingRef.current = true
      advanceOrFinish(currentIndex)
    }
  }, [currentVerseState, currentIndex, isRunning, advanceOrFinish])

  const startSession = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync()
    if (!granted) return
    // Pre-warm audio session so first verse recording starts instantly
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
    setIsRunning(true)
    isRunningRef.current = true
    // Resume from last position instead of restarting from verse 0
    await startListeningForVerse(currentIndexRef.current)
  }, [startListeningForVerse])

  const stopSession = useCallback(async () => {
    isRunningRef.current = false
    setIsRunning(false)
    await stopRecordingClean()
    stopPoller()
  }, [stopRecordingClean, stopPoller])

  const skipCurrentVerse = useCallback(async () => {
    isAdvancingRef.current = false
    await stopRecordingClean()
    stopPoller()
    updateVerse(currentIndexRef.current, { state: 'skipped', skipped: true })
  }, [stopRecordingClean, stopPoller, updateVerse])

  useEffect(() => {
    return () => {
      isRunningRef.current = false
      stopPoller()
      const rec = recordingRef.current
      recordingRef.current = null
      if (rec) rec.stopAndUnloadAsync().catch(() => {})
    }
  }, [stopPoller])

  const showHint = useCallback((index: number) => {
    updateVerse(index, { withHint: true })
  }, [updateVerse])

  const reset = useCallback(() => {
    stopSession()
    setVerseAttempts(buildInitialAttempts(verseNumbers))
    setCurrentIndex(0)
    currentIndexRef.current = 0
    silenceCounterRef.current = 0
  }, [stopSession, verseNumbers])

  return {
    verseAttempts,
    currentIndex,
    isRunning,
    startSession,
    stopSession,
    skipCurrentVerse,
    showHint,
    reset,
  }
}
