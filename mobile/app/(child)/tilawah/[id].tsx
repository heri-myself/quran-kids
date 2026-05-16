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
import { evaluateVerse } from '../../../services/tilawah'
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
}

function toArabicNum(n: number) {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])
}

function wordColor(status: string | undefined, state: VerseState): string {
  if (state === 'pending' || state === 'listening' || state === 'analyzing') {
    return 'rgba(255,255,255,0.15)'
  }
  if (!status || status === 'correct') return '#10B981'
  if (status === 'mad_short') return '#EAB308'
  return '#EF4444'
}

const NUM_COLORS: Record<VerseState, { bg: string; border: string; color: string }> = {
  pending:   { bg: 'rgba(124,111,241,0.1)',  border: 'rgba(124,111,241,0.25)', color: '#BDB8FF' },
  listening: { bg: 'rgba(124,111,241,0.25)', border: '#7C6FF1',                color: '#E0DDFF' },
  analyzing: { bg: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.15)', color: '#94A3B8' },
  done:      { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',   color: '#10B981' },
}

export default function TilawahLatihanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const chapterId = Number(id)
  const router = useRouter()
  const setLastTilawah = useLastActivityStore((s) => s.setLastTilawah)

  const verses = useMemo(() => getSurahVerses(chapterId) as unknown as Verse[], [chapterId])
  const verseNumbers = useMemo(() => verses.map((v) => v.verse_number), [verses])

  const [statuses, setStatuses] = useState<VerseStatus[]>(() =>
    verseNumbers.map(() => ({ state: 'pending', wordResults: [], score: 0 }))
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [verseResults, setVerseResults] = useState<VerseResult[]>([])
  const scrollRef = useRef<ScrollView>(null)
  const verseYPositions = useRef<Record<number, number>>({})

  // Recording refs
  const recordingRef   = useRef<Audio.Recording | null>(null)
  const pollerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const silenceRef     = useRef(0)
  const isEvalRef      = useRef(false)
  const isRunningRef   = useRef(false)
  const currentIdxRef  = useRef(0)

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
      const result = await evaluateVerse(chapterId, verse.verse_number, verse.text_uthmani, base64)

      updateStatus(idx, { state: 'done', wordResults: result.wordResults, score: result.score })

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

      // Advance to next verse after 500ms
      await new Promise((r) => setTimeout(r, 500))
      const nextIdx = idx + 1
      if (nextIdx >= verses.length || !isRunningRef.current) {
        setIsRunning(false)
        isRunningRef.current = false
        return
      }

      // Start listening for next verse
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
    updateStatus(idx, { state: 'listening', wordResults: [], score: 0 })

    // Scroll to verse
    setTimeout(() => {
      const y = verseYPositions.current[idx]
      if (y !== undefined) scrollRef.current?.scrollTo({ y, animated: true })
    }, 100)

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
    // Reset results for fresh session
    setStatuses(verseNumbers.map(() => ({ state: 'pending', wordResults: [], score: 0 })))
    setVerseResults([])
    currentIdxRef.current = 0
    setCurrentIndex(0)
    await startListening(0)
  }, [verseNumbers, startListening])

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
      setStatuses(verseNumbers.map(() => ({ state: 'pending', wordResults: [], score: 0 })))
      setVerseResults([])
      setCurrentIndex(0)
      currentIdxRef.current = 0
    }, [id])
  )

  const allDone = statuses.length > 0 && statuses.every((s) => s.state === 'done')

  const handleFinish = () => {
    const allResults = verseResults
    const avg = allResults.length > 0
      ? Math.round(allResults.reduce((s, v) => s + v.score, 0) / allResults.length)
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
        verseResults: JSON.stringify(allResults),
      },
    })
  }

  const doneCount = statuses.filter((s) => s.state === 'done').length
  const progress = verses.length > 0 ? doneCount / verses.length : 0
  const activeStatus = statuses[currentIndex]

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Tilawah</Text>
          <Text style={styles.headerSub}>{verses.length} Ayat</Text>
        </View>
        <View style={[styles.badge, allDone && styles.badgeDone]}>
          <Text style={[styles.badgeText, allDone && styles.badgeTextDone]}>
            {doneCount}/{verses.length}
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressStrip}>
        <View style={[
          styles.progressFill,
          { width: `${progress * 100}%` as any },
          allDone && { backgroundColor: '#10B981' },
        ]} />
      </View>

      {/* Status chip */}
      {isRunning && activeStatus && (
        <View style={styles.chipRow}>
          {activeStatus.state === 'listening' && (
            <View style={[styles.chip, { borderColor: 'rgba(124,111,241,0.4)' }]}>
              <Text style={[styles.chipText, { color: '#BDB8FF' }]}>🎙 Merekam ayat {currentIndex + 1}...</Text>
            </View>
          )}
          {activeStatus.state === 'analyzing' && (
            <View style={[styles.chip, { borderColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={[styles.chipText, { color: '#94A3B8' }]}>⏳ Menilai...</Text>
            </View>
          )}
        </View>
      )}

      {/* Mushaf ScrollView */}
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.mushafPage}>
        {verses.map((verse, idx) => {
          const st = statuses[idx] ?? { state: 'pending', wordResults: [], score: 0 }
          const numStyle = NUM_COLORS[st.state]
          return (
            <View
              key={verse.verse_number}
              onLayout={(e) => { verseYPositions.current[idx] = e.nativeEvent.layout.y }}
            >
              <Text style={styles.arabicFlow}>
                {verse.words.map((w, i) => {
                  const wr = st.wordResults[i]
                  const status = wr?.status ?? (wr?.correct === false ? 'wrong' : wr ? 'correct' : undefined)
                  return (
                    <Text key={i} style={[styles.arabicWord, { color: wordColor(status, st.state) }]}>
                      {w.text_uthmani}{' '}
                    </Text>
                  )
                })}
                <Text style={[styles.verseNum, {
                  backgroundColor: numStyle.bg,
                  borderColor: numStyle.border,
                  color: numStyle.color,
                }]}>
                  {toArabicNum(verse.verse_number)}
                </Text>
              </Text>
              {/* Score chip for done verses */}
              {st.state === 'done' && (
                <View style={styles.scoreRow}>
                  <View style={[styles.scoreChip, { backgroundColor: st.score >= 85 ? 'rgba(16,185,129,0.12)' : st.score >= 65 ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                    <Text style={[styles.scoreText, { color: st.score >= 85 ? '#10B981' : st.score >= 65 ? '#EAB308' : '#EF4444' }]}>
                      {st.score}/100
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {allDone ? (
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishText}>Lihat Hasil 🎉</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.bottomStatus}>
              {!isRunning
                ? 'Tekan mikrofon untuk mulai tilawah'
                : activeStatus?.state === 'analyzing'
                ? '⏳ Menilai bacaan...'
                : '🔴 Baca terus — berhenti otomatis saat jeda'}
            </Text>
            <View style={styles.bottomRow}>
              {isRunning && (
                <TouchableOpacity style={styles.stopBtn} onPress={stopSession}>
                  <Text style={styles.stopBtnText}>⏹ Berhenti</Text>
                </TouchableOpacity>
              )}
              {!isRunning && (
                <TouchableOpacity style={styles.micBtn} onPress={startSession}>
                  <Text style={styles.micIcon}>🎙</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#1A1A2E' },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 32, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  backBtn:       { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  backIcon:      { color: '#fff', fontSize: 20, lineHeight: 22 },
  headerTitle:   { color: '#F9FAFB', fontSize: 15, fontWeight: '700' },
  headerSub:     { color: '#6B7280', fontSize: 11, marginTop: 1 },
  badge:         { backgroundColor: 'rgba(124,111,241,0.15)', borderWidth: 1, borderColor: 'rgba(124,111,241,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeDone:     { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' },
  badgeText:     { color: '#BDB8FF', fontSize: 12, fontWeight: '700' },
  badgeTextDone: { color: '#10B981' },
  progressStrip: { height: 2, backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill:  { height: 2, backgroundColor: '#7C6FF1' },
  chipRow:       { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'flex-end' },
  chip:          { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: 'rgba(0,0,0,0.2)' },
  chipText:      { fontSize: 11, fontWeight: '700' },
  scroll:        { flex: 1 },
  mushafPage:    { padding: 20, paddingBottom: 40 },
  arabicFlow:    { fontSize: 26, lineHeight: 58, fontFamily: 'ScheherazadeNew-Regular', textAlign: 'right', writingDirection: 'rtl', color: '#E5E7EB', marginBottom: 4 },
  arabicWord:    { fontSize: 26, fontFamily: 'ScheherazadeNew-Regular', lineHeight: 58 },
  verseNum:      { fontSize: 11, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 5, paddingVertical: 2 },
  scoreRow:      { alignItems: 'flex-start', marginBottom: 12, marginTop: -2 },
  scoreChip:     { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  scoreText:     { fontSize: 11, fontWeight: '700' },
  bottomBar:     { backgroundColor: 'rgba(26,26,46,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  bottomStatus:  { color: '#6B7280', fontSize: 12, textAlign: 'center', marginBottom: 12 },
  bottomRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  micBtn:        { width: 64, height: 64, borderRadius: 32, backgroundColor: '#7C6FF1', justifyContent: 'center', alignItems: 'center', shadowColor: '#7C6FF1', shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 },
  micIcon:       { fontSize: 26 },
  stopBtn:       { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  stopBtnText:   { color: '#F87171', fontSize: 14, fontWeight: '700' },
  finishBtn:     { backgroundColor: '#7C6FF1', borderRadius: 14, padding: 16, alignItems: 'center' },
  finishText:    { color: '#fff', fontWeight: '700', fontSize: 16 },
})
