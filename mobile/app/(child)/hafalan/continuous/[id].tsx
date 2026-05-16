// mobile/app/(child)/hafalan/continuous/[id].tsx
import { useCallback, useRef, useEffect, useMemo } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { Text } from '../../../../components/Text'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { getSurahVerses } from '../../../../services/quran'
import { useContinuousHafalan } from '../../../../hooks/use-continuous-hafalan'
import type { VerseAttempt, VerseState } from '../../../../hooks/use-continuous-hafalan'

interface Verse {
  verse_number: number
  text_uthmani: string
  words: { text_uthmani: string; position: number }[]
}

function toArabicNumeral(n: number): string {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])
}

function wordColor(verseState: VerseState): string {
  if (verseState === 'correct') return '#10B981'
  if (verseState === 'skipped') return 'rgba(255,255,255,0.35)'
  return '#E5E7EB' // white — visible while reading (pending/listening)
}

const VERSE_NUM_COLORS: Record<VerseState, { bg: string; border: string; text: string }> = {
  pending:    { bg: 'rgba(99,102,241,0.1)',   border: 'rgba(99,102,241,0.25)',  text: '#818CF8' },
  listening:  { bg: 'rgba(99,102,241,0.25)',  border: '#6366F1',                text: '#A5B4FC' },
  analyzing:  { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', text: '#9CA3AF' },
  correct:    { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',   text: '#10B981' },
  wrong:      { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',    text: '#F87171' },
  hint_shown: { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',   text: '#FCD34D' },
  skipped:    { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)',  text: '#64748B' },
}
// Note: wrong/hint_shown/analyzing states retained for type compatibility but not used in reading mode

function VerseSegment({ verse, attempt }: { verse: Verse; attempt: VerseAttempt }) {
  const numStyle = VERSE_NUM_COLORS[attempt.state]
  const color = wordColor(attempt.state)

  return (
    <>
      {verse.words.map((w, i) => (
        <Text key={i} style={[styles.arabicWord, { color }]}>
          {w.text_uthmani}{' '}
        </Text>
      ))}
      <Text style={[styles.verseNum, {
        backgroundColor: numStyle.bg,
        borderColor: numStyle.border,
        color: numStyle.text,
      }]}>
        {toArabicNumeral(verse.verse_number)}
      </Text>
      <Text style={styles.arabicWord}> </Text>
    </>
  )
}

function ActiveStatusChip({ attempt }: { attempt: VerseAttempt }) {
  const configs: Partial<Record<VerseState, { label: string; color: string; borderColor: string }>> = {
    listening: { label: '🎙 Sedang merekam...', color: '#A5B4FC', borderColor: 'rgba(99,102,241,0.3)' },
    skipped:   { label: '⏭ Dilewati',          color: '#64748B', borderColor: 'rgba(100,116,139,0.3)' },
  }
  const cfg = configs[attempt.state]
  if (!cfg) return null
  return (
    <View style={[styles.chipWrap, { borderColor: cfg.borderColor }]}>
      <Text style={[styles.chipText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  )
}

export default function ContinuousHafalanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const chapterId = parseInt(id, 10)
  const router = useRouter()
  const scrollRef = useRef<ScrollView>(null)
  const verseYPositions = useRef<Record<number, number>>({})

  const verses = useMemo(
    () => (isNaN(chapterId) ? [] : getSurahVerses(chapterId) as unknown as Verse[]),
    [chapterId]
  )

  const verseNumbers = useMemo(() => verses.map((v) => v.verse_number), [verses])

  const getExpectedText = useCallback(
    (verseNumber: number) => {
      const v = verses.find((v) => v.verse_number === verseNumber)
      return v?.text_uthmani ?? ''
    },
    [verses]
  )

  const {
    verseAttempts,
    currentIndex,
    isRunning,
    startSession,
    stopSession,
    skipCurrentVerse,
    reset,
  } = useContinuousHafalan(chapterId, verseNumbers, getExpectedText)

  useFocusEffect(
    useCallback(() => {
      reset()
    }, [id, reset])
  )

  useEffect(() => {
    if (!isRunning || currentIndex === 0) return
    const t = setTimeout(() => {
      const y = verseYPositions.current[currentIndex]
      if (y !== undefined) {
        scrollRef.current?.scrollTo({ y, animated: true })
      }
    }, 150)
    return () => clearTimeout(t)
  }, [currentIndex, isRunning])

  const allDone =
    verseAttempts.length > 0 &&
    verseAttempts.every((v) => v.state === 'correct' || v.state === 'skipped')

  const handleFinish = () => {
    router.push({
      pathname: '/(child)/hafalan/result' as any,
      params: {
        results: JSON.stringify(verseAttempts),
        chapterId: String(chapterId),
      },
    })
  }



  const correctCount = verseAttempts.filter((v) => v.state === 'correct').length
  const progress = verseNumbers.length > 0 ? correctCount / verseNumbers.length : 0
  const activeAttempt = verseAttempts[currentIndex]

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mode Membaca</Text>
          <Text style={styles.headerSub}>{verseNumbers.length} Ayat</Text>
        </View>
        <View style={[
          styles.progressBadge,
          allDone && { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' }
        ]}>
          <Text style={[styles.progressBadgeText, allDone && { color: '#10B981' }]}>
            {correctCount}/{verseNumbers.length}
          </Text>
        </View>
      </View>

      {/* Progress strip */}
      <View style={styles.progressStrip}>
        <View style={[
          styles.progressFill,
          { width: `${progress * 100}%` },
          allDone && { backgroundColor: '#10B981' },
        ]} />
      </View>

      {/* Active verse status chip */}
      {isRunning && activeAttempt && (
        <View style={styles.chipRow}>
          <ActiveStatusChip attempt={activeAttempt} />
        </View>
      )}

      {/* Mushaf scroll */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.mushafPage}
      >
        {verses.map((verse, idx) => {
          const attempt: VerseAttempt = verseAttempts[idx] ?? {
            verseNumber: verse.verse_number,
            state: 'pending',
            attempts: 0,
            withHint: false,
            skipped: false,
            lastScore: 0,
            wordResults: [],
            feedback: [],
          }
          return (
            <View
              key={verse.verse_number}
              onLayout={(e) => {
                verseYPositions.current[idx] = e.nativeEvent.layout.y
              }}
            >
              <Text style={styles.arabicFlow}>
                <VerseSegment verse={verse} attempt={attempt} />
              </Text>
            </View>
          )
        })}
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {allDone ? (
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishBtnText}>Lihat Hasil 🎉</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.bottomStatus}>
              {!isRunning ? 'Tekan mikrofon untuk mulai membaca' : '🔴 Sedang merekam — baca terus'}
            </Text>
            <View style={styles.bottomRow}>
              {isRunning && (
                <TouchableOpacity style={styles.skipBtn} onPress={skipCurrentVerse}>
                  <Text style={styles.skipBtnText}>⏭ Lewati</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.micBtn, isRunning && styles.micBtnRecording]}
                onPress={isRunning ? stopSession : startSession}
              >
                <Text style={styles.micIcon}>{isRunning ? '⏹' : '🎙'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#111827' },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  header:             { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn:            { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center' },
  backIcon:           { color: '#fff', fontSize: 20, lineHeight: 22 },
  headerTitle:        { color: '#F9FAFB', fontSize: 15, fontWeight: '700' },
  headerSub:          { color: '#6B7280', fontSize: 11, marginTop: 1 },
  progressBadge:      { backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  progressBadgeText:  { color: '#A5B4FC', fontSize: 12, fontWeight: '700' },
  progressStrip:      { height: 2, backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill:       { height: 2, backgroundColor: '#6366F1' },
  chipRow:            { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'flex-end' },
  chipWrap:           { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: 'rgba(0,0,0,0.2)' },
  chipText:           { fontSize: 11, fontWeight: '700' },
  scroll:             { flex: 1 },
  mushafPage:         { padding: 20, paddingBottom: 40 },
  arabicFlow:         { fontSize: 24, lineHeight: 56, fontFamily: 'ScheherazadeNew-Regular', textAlign: 'right', writingDirection: 'rtl', color: '#E5E7EB' },
  arabicWord:         { fontSize: 24, fontFamily: 'ScheherazadeNew-Regular', lineHeight: 56 },
  verseNum:           { fontSize: 11, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 5, paddingVertical: 2 },
  bottomBar:          { backgroundColor: 'rgba(17,24,39,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', padding: 16, paddingBottom: 32 },
  bottomStatus:       { color: '#6B7280', fontSize: 12, textAlign: 'center', marginBottom: 12 },
  bottomRow:          { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  micBtn:             { width: 58, height: 58, borderRadius: 29, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', shadowColor: '#6366F1', shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  micBtnRecording:    { backgroundColor: '#EF4444', shadowColor: '#EF4444' },
  micIcon:            { fontSize: 22 },
  skipBtn:            { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  skipBtnText:        { color: '#6B7280', fontSize: 12 },
  finishBtn:          { backgroundColor: '#6366F1', borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#6366F1', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  finishBtnText:      { color: '#fff', fontWeight: '700', fontSize: 16 },
})
