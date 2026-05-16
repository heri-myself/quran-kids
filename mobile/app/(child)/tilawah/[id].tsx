import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native'
import { Text } from '../../../components/Text'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'
import { evaluateVerseSimple } from '../../../services/tilawah'
import { calcStars, calcPoints, VerseResult } from '../../../hooks/use-tilawah'
import { getSurahVerses } from '../../../services/quran'
import { useLastActivityStore } from '../../../stores/last-activity-store'

const SILENCE_DB = -50
const SILENCE_MS = 1500
const POLL_MS    = 100

interface Verse {
  verse_number: number
  text_uthmani: string
  translations: { text: string }[]
  words: { text_uthmani: string; position: number }[]
}

type VerseState = 'pending' | 'listening' | 'analyzing' | 'done'

interface VerseStatus {
  state: VerseState
  wordResults: { status?: string; correct?: boolean }[]
  score: number
  evaluation: any
}

export default function TilawahLatihanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const chapterId = Number(id)
  const router = useRouter()
  const setLastTilawah = useLastActivityStore((s) => s.setLastTilawah)

  const verses = useMemo(() => getSurahVerses(chapterId) as unknown as Verse[], [chapterId])

  const [statuses, setStatuses] = useState<VerseStatus[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [verseResults, setVerseResults] = useState<VerseResult[]>([])

  const scrollRef   = useRef<ScrollView>(null)
  const cardYRef    = useRef<Record<number, number>>({})
  const recordingRef  = useRef<Audio.Recording | null>(null)
  const pollerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const silenceRef    = useRef(0)
  const isEvalRef     = useRef(false)
  const isRunningRef  = useRef(false)
  const currentIdxRef = useRef(0)

  // Init statuses when verses load
  useEffect(() => {
    if (verses.length > 0) {
      setStatuses(verses.map(() => ({ state: 'pending', wordResults: [], score: 0, evaluation: null })))
    }
  }, [verses])

  const stopPoller = useCallback(() => {
    if (pollerRef.current) { clearInterval(pollerRef.current); pollerRef.current = null }
  }, [])

  const stopRec = useCallback(async (): Promise<string | null> => {
    stopPoller()
    const rec = recordingRef.current
    if (!rec) return null
    recordingRef.current = null
    try {
      await rec.stopAndUnloadAsync()
      return rec.getURI() ?? null
    } catch { return null }
  }, [stopPoller])

  const updateStatus = useCallback((idx: number, patch: Partial<VerseStatus>) => {
    setStatuses((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }, [])

  const evaluateAndAdvance = useCallback(async (uri: string) => {
    if (isEvalRef.current) return
    isEvalRef.current = true
    const idx = currentIdxRef.current
    updateStatus(idx, { state: 'analyzing' })

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any })
      const verse = verses[idx]
      const result = await evaluateVerseSimple(chapterId, verse.verse_number, verse.text_uthmani, base64)

      updateStatus(idx, { state: 'done', wordResults: result.wordResults, score: result.score, evaluation: result })

      setVerseResults((prev) => {
        const entry: VerseResult = {
          verseNumber: verse.verse_number,
          score: result.score,
          wordAccuracy: result.wordAccuracy,
          tajweedScore: result.tajweedScore,
          feedback: result.feedback,
          evaluation: result,
        }
        const existing = prev.findIndex((v) => v.verseNumber === verse.verse_number)
        if (existing >= 0) {
          const updated = [...prev]
          if (result.score > prev[existing].score) updated[existing] = entry
          return updated
        }
        return [...prev, entry]
      })

      await new Promise((r) => setTimeout(r, 600))
      const nextIdx = idx + 1
      if (nextIdx >= verses.length || !isRunningRef.current) {
        setIsRunning(false)
        isRunningRef.current = false
        return
      }
      await startListening(nextIdx)
    } catch {
      updateStatus(idx, { state: 'pending' })
    } finally {
      isEvalRef.current = false
    }
  }, [chapterId, verses, updateStatus])

  const startListening = useCallback(async (idx: number) => {
    if (!isRunningRef.current) return
    currentIdxRef.current = idx
    setCurrentIndex(idx)
    silenceRef.current = 0
    updateStatus(idx, { state: 'listening', wordResults: [], score: 0, evaluation: null })

    // Scroll to active card
    setTimeout(() => {
      const y = cardYRef.current[idx]
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true })
    }, 120)

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      })
      recordingRef.current = recording

      pollerRef.current = setInterval(async () => {
        if (!isRunningRef.current || isEvalRef.current) return
        try {
          const status = await recording.getStatusAsync()
          const metering = (status as any).metering ?? 0
          if (metering < SILENCE_DB) {
            silenceRef.current += POLL_MS
          } else {
            silenceRef.current = 0
          }
          if (silenceRef.current >= SILENCE_MS) {
            silenceRef.current = 0
            stopPoller()
            const uri = await stopRec()
            if (uri) await evaluateAndAdvance(uri)
          }
        } catch { /* recording unloaded */ }
      }, POLL_MS)
    } catch {
      updateStatus(idx, { state: 'pending' })
    }
  }, [updateStatus, stopPoller, stopRec, evaluateAndAdvance])

  const startSession = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync()
    if (!granted) return
    setIsRunning(true)
    isRunningRef.current = true
    setStatuses(verses.map(() => ({ state: 'pending', wordResults: [], score: 0, evaluation: null })))
    setVerseResults([])
    currentIdxRef.current = 0
    setCurrentIndex(0)
    await startListening(0)
  }, [verses, startListening])

  const stopSession = useCallback(async () => {
    isRunningRef.current = false
    setIsRunning(false)
    await stopRec()
    stopPoller()
  }, [stopRec, stopPoller])

  // Unmount cleanup
  useEffect(() => {
    return () => {
      isRunningRef.current = false
      stopPoller()
      const rec = recordingRef.current
      recordingRef.current = null
      if (rec) rec.stopAndUnloadAsync().catch(() => {})
    }
  }, [stopPoller])

  // Reset on focus
  useFocusEffect(
    useCallback(() => {
      stopSession()
      setStatuses(verses.map(() => ({ state: 'pending', wordResults: [], score: 0, evaluation: null })))
      setVerseResults([])
      setCurrentIndex(0)
      currentIdxRef.current = 0
      cardYRef.current = {}
    }, [id])
  )

  const allDone = statuses.length > 0 && statuses.every((s) => s.state === 'done')

  const handleFinish = () => {
    const avg = verseResults.length > 0
      ? Math.round(verseResults.reduce((s, v) => s + v.score, 0) / verseResults.length)
      : 0
    const stars = calcStars(avg)
    const points = calcPoints(stars, avg)
    setLastTilawah({ surahId: chapterId, surahName: String(id), verseNumber: 1, timestamp: Date.now() })
    router.replace({
      pathname: '/(child)/tilawah/result',
      params: {
        chapterId: String(id),
        totalScore: String(avg),
        stars: String(stars),
        pointsEarned: String(points),
        verseResults: JSON.stringify(verseResults),
      },
    })
  }

  const doneCount = statuses.filter((s) => s.state === 'done').length
  const activeStatus = statuses[currentIndex]

  if (statuses.length === 0) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#7C6FF1" size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(doneCount / verses.length) * 100}%` as any }]} />
      </View>
      <Text style={styles.progressLabel}>{doneCount} / {verses.length} ayat selesai</Text>

      {/* Verse cards */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {verses.map((verse, idx) => {
          const st = statuses[idx] ?? { state: 'pending', wordResults: [], score: 0, evaluation: null }
          const isActive = idx === currentIndex && (st.state === 'listening' || st.state === 'analyzing')
          const isDone = st.state === 'done'
          const translation = verse.translations?.[0]?.text?.replace(/<\/?[^>]+(>|$)/g, '') ?? ''

          return (
            <View
              key={verse.verse_number}
              style={[
                styles.card,
                isActive && styles.cardActive,
                isDone && styles.cardDone,
                !isActive && !isDone && idx !== currentIndex && styles.cardPending,
              ]}
              onLayout={(e) => { cardYRef.current[idx] = e.nativeEvent.layout.y }}
            >
              {/* Card header */}
              <View style={styles.cardHeader}>
                <View style={[styles.badge, isActive && styles.badgeActive, isDone && styles.badgeDone]}>
                  <Text style={styles.badgeText}>{verse.verse_number}</Text>
                </View>

                {isActive && st.state === 'listening' && (
                  <View style={styles.statusChip}>
                    <View style={styles.recordDot} />
                    <Text style={styles.statusText}>Merekam...</Text>
                  </View>
                )}
                {isActive && st.state === 'analyzing' && (
                  <View style={[styles.statusChip, { borderColor: 'rgba(255,255,255,0.15)' }]}>
                    <Text style={[styles.statusText, { color: '#94A3B8' }]}>⏳ Menilai...</Text>
                  </View>
                )}
                {isDone && (
                  <View style={[styles.statusChip, {
                    borderColor: st.score >= 85 ? 'rgba(16,185,129,0.3)' : st.score >= 65 ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)',
                  }]}>
                    <Text style={[styles.statusText, {
                      color: st.score >= 85 ? '#10B981' : st.score >= 65 ? '#EAB308' : '#EF4444',
                    }]}>
                      {st.score >= 85 ? '✅' : st.score >= 65 ? '⚡' : '❌'} {st.score}/100
                    </Text>
                  </View>
                )}
              </View>

              {/* Arabic text */}
              {isDone ? (
                <Text style={styles.arabicText}>
                  {verse.words.map((w, i) => {
                    const wr = st.wordResults[i]
                    const status = wr?.status ?? (wr?.correct === false ? 'wrong' : wr ? 'correct' : undefined)
                    const color = !status || status === 'correct' ? '#10B981'
                      : status === 'mad_short' ? '#EAB308' : '#EF4444'
                    return (
                      <Text key={i} style={{ color }}>
                        {w.text_uthmani}{i < verse.words.length - 1 ? ' ' : ''}
                      </Text>
                    )
                  })}
                </Text>
              ) : (
                // Hidden placeholder chips
                <View style={styles.hiddenRow}>
                  {verse.words.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.hiddenChip,
                        i % 3 === 0 && { width: 54 },
                        i % 3 === 1 && { width: 36 },
                        isActive && { backgroundColor: 'rgba(124,111,241,0.25)' },
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Translation for done verses */}
              {isDone && translation ? (
                <Text style={styles.translation}>{translation}</Text>
              ) : null}

              {/* Feedback for done verses */}
              {isDone && st.evaluation?.feedback?.length > 0 && (
                <View style={styles.feedbackWrap}>
                  {st.evaluation.feedback.slice(0, 2).map((f: string, i: number) => (
                    <Text key={i} style={styles.feedbackItem}>• {f}</Text>
                  ))}
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>

      {/* Bottom recording area */}
      <View style={styles.recordArea}>
        <Text style={styles.recordStatus}>
          {!isRunning
            ? '🎙️ Tekan untuk mulai membaca'
            : activeStatus?.state === 'analyzing'
            ? '⏳ Menganalisis...'
            : `🔴 Sedang merekam Ayat ${currentIndex + 1}`}
        </Text>

        {allDone ? (
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishText}>Selesai 🎉</Text>
          </TouchableOpacity>
        ) : isRunning ? (
          <TouchableOpacity style={styles.stopBtn} onPress={stopSession}>
            <Text style={styles.stopText}>⏹ Berhenti</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.micBtn} onPress={startSession}>
            <Text style={{ fontSize: 32 }}>🎙️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#1A1A2E' },
  progressBar:    { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: Platform.OS === 'ios' ? 52 : 32, marginHorizontal: 20, borderRadius: 2 },
  progressFill:   { height: 4, backgroundColor: '#7C6FF1', borderRadius: 2 },
  progressLabel:  { color: '#BDB8FF', fontSize: 12, textAlign: 'center', marginTop: 6, marginBottom: 4 },
  scrollContent:  { paddingHorizontal: 16, paddingBottom: 20, gap: 10 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: 14,
  },
  cardActive:  { borderColor: '#7C6FF1', backgroundColor: 'rgba(124,111,241,0.1)' },
  cardDone:    { borderColor: 'rgba(255,255,255,0.08)' },
  cardPending: { opacity: 0.5 },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  badge:       { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  badgeActive: { backgroundColor: '#7C6FF1' },
  badgeDone:   { backgroundColor: 'rgba(16,185,129,0.2)' },
  badgeText:   { color: '#fff', fontSize: 12, fontWeight: '700' },
  statusChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderColor: 'rgba(124,111,241,0.4)' },
  recordDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  statusText:  { color: '#BDB8FF', fontSize: 11, fontWeight: '700' },
  arabicText:  { fontSize: 26, lineHeight: 52, fontFamily: 'ScheherazadeNew-Regular', textAlign: 'right', writingDirection: 'rtl', marginBottom: 8 },
  hiddenRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', direction: 'rtl' as any },
  hiddenChip:  { height: 14, width: 44, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.08)' },
  translation: { color: '#94A3B8', fontSize: 12, fontStyle: 'italic', lineHeight: 18, marginTop: 4 },
  feedbackWrap:{ marginTop: 6 },
  feedbackItem:{ color: '#BDB8FF', fontSize: 12, marginBottom: 2 },
  recordArea:  { backgroundColor: 'rgba(255,255,255,0.05)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, alignItems: 'center', gap: 12 },
  recordStatus:{ color: '#D4D0FF', fontSize: 13 },
  micBtn:      { width: 72, height: 72, borderRadius: 36, backgroundColor: '#7C6FF1', alignItems: 'center', justifyContent: 'center', shadowColor: '#7C6FF1', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  stopBtn:     { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  stopText:    { color: '#F87171', fontSize: 14, fontWeight: '700' },
  finishBtn:   { width: '100%', backgroundColor: '#7C6FF1', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  finishText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
})
