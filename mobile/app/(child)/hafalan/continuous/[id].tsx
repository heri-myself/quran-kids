// mobile/app/(child)/hafalan/continuous/[id].tsx
import { useCallback, useRef, useEffect, useMemo, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { Text } from '../../../../components/Text'
import { RiIcon } from '../../../../components/RiIcon'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { getSurahVerses, getChapters } from '../../../../services/quran'
import { useContinuousHafalan } from '../../../../hooks/use-continuous-hafalan'
import type { VerseAttempt, VerseState } from '../../../../hooks/use-continuous-hafalan'

function WaveBar({ delay }: { delay: number }) {
  const height = useSharedValue(4)

  useEffect(() => {
    height.value = withRepeat(
      withSequence(
        withTiming(18, { duration: 350 + delay * 30, easing: Easing.inOut(Easing.sin) }),
        withTiming(4,  { duration: 350 + delay * 30, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )
  }, [])

  const style = useAnimatedStyle(() => ({ height: height.value }))

  return <Animated.View style={[styles.waveBar, style]} />
}

function SoundWave() {
  return (
    <View style={styles.waveWrap}>
      {[0,1,2,3,4].map((i) => <WaveBar key={i} delay={i} />)}
    </View>
  )
}

interface Verse {
  verse_number: number
  text_uthmani: string
  words: { text_uthmani: string; position: number }[]
}

function toArabicNumeral(n: number): string {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])
}

function verseOpacity(verseState: VerseState): number {
  if (verseState === 'correct') return 1
  if (verseState === 'skipped') return 0.35
  return 0
}

const VERSE_NUM_COLORS: Record<VerseState, { color: string }> = {
  pending:    { color: '#34D399' },
  listening:  { color: '#6EE7B7' },
  analyzing:  { color: '#9CA3AF' },
  correct:    { color: '#4ADE80' },
  wrong:      { color: '#F87171' },
  hint_shown: { color: '#6EE7B7' },
  skipped:    { color: '#64748B' },
}

// Islamic verse end ornament using Unicode characters
function VerseEndMark({ verseNumber, state }: { verseNumber: number; state: VerseState }) {
  const { color } = VERSE_NUM_COLORS[state]
  return (
    <View style={[styles.verseCircle, { borderColor: color }]}>
      <Text style={[styles.verseCircleText, { color }]}>
        {toArabicNumeral(verseNumber)}
      </Text>
    </View>
  )
}

function VerseSegment({ verse, attempt, firstWordOnly, hideEndMark }: { verse: Verse; attempt: VerseAttempt; firstWordOnly?: boolean; hideEndMark?: boolean }) {
  const words = firstWordOnly ? verse.words.slice(0, 1) : verse.words
  return (
    <>
      {words.map((w, i) => (
        <Text key={i} style={styles.arabicWord}>
          {w.text_uthmani}{' '}
        </Text>
      ))}
      {firstWordOnly && <Text style={styles.arabicDots}>{'...'}</Text>}
      {!hideEndMark && <VerseEndMark verseNumber={verse.verse_number} state={attempt.state} />}
      <Text style={styles.arabicWord}> </Text>
    </>
  )
}

function RevealingVerseOverlay({ verse, attempt, isFirst }: {
  verse: Verse
  attempt: VerseAttempt
  isFirst: boolean  // idx === 0 (always shows first word as guide)
}) {
  const [revealedCount, setRevealedCount] = useState(0)
  const prevState = useRef<VerseState>('pending')

  useEffect(() => {
    if (prevState.current === attempt.state) return
    prevState.current = attempt.state

    if (attempt.state === 'correct') {
      setRevealedCount(0)
      let count = 0
      const timer = setInterval(() => {
        count += 1
        setRevealedCount(count)
        if (count >= verse.words.length) clearInterval(timer)
      }, 80)
      return () => clearInterval(timer)
    }
  }, [attempt.state, verse.words.length])

  if (attempt.state === 'correct') {
    const showEnd = revealedCount >= verse.words.length
    return (
      <Text style={[styles.arabicFlow, styles.arabicFlowOverlay, { color: '#10B981' }]}>
        {verse.words.slice(0, revealedCount).map((w, i) => (
          <Text key={i} style={styles.arabicWord}>{w.text_uthmani}{' '}</Text>
        ))}
        {showEnd && <VerseEndMark verseNumber={verse.verse_number} state={attempt.state} />}
        {showEnd && <Text style={styles.arabicWord}> </Text>}
      </Text>
    )
  }

  if (attempt.state === 'skipped') {
    return (
      <Text style={[styles.arabicFlow, styles.arabicFlowOverlay, { opacity: 0.35 }]}>
        <VerseSegment verse={verse} attempt={attempt} />
      </Text>
    )
  }

  // Show first word as hint for verse 0 (guide) or when hint is activated
  if (isFirst || attempt.withHint) {
    return (
      <Text style={[styles.arabicFlow, styles.arabicFlowOverlay, { color: attempt.withHint && !isFirst ? '#FCD34D' : '#FFFFFF' }]}>
        <VerseSegment verse={verse} attempt={attempt} firstWordOnly />
      </Text>
    )
  }

  return null
}

function ActiveStatusChip({ attempt }: { attempt: VerseAttempt }) {
  const configs: Partial<Record<VerseState, { icon: 'mic-fill' | 'skip-forward-line'; label: string; color: string; borderColor: string }>> = {
    listening: { icon: 'mic-fill',          label: 'Sedang merekam...', color: '#34D399', borderColor: 'rgba(5,150,105,0.3)' },
    skipped:   { icon: 'skip-forward-line', label: 'Dilewati',          color: 'rgba(52,211,153,0.4)', borderColor: 'rgba(5,150,105,0.2)' },
  }
  const cfg = configs[attempt.state]
  if (!cfg) return null
  return (
    <View style={[styles.chipWrap, { borderColor: cfg.borderColor }]}>
      <RiIcon name={cfg.icon} size={11} color={cfg.color} />
      <Text style={[styles.chipText, { color: cfg.color }]}> {cfg.label}</Text>
    </View>
  )
}

export default function ContinuousHafalanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const chapterId = parseInt(id, 10)
  const router = useRouter()
  const scrollRef = useRef<ScrollView>(null)
  const verseYPositions = useRef<Record<number, number>>({})
  const verseHeights = useRef<Record<number, number>>({})
  const scrollViewHeight = useRef(0)

  const chapter = useMemo(
    () => getChapters().find((c) => c.id === chapterId),
    [chapterId]
  )

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
    showHint,
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
      if (y === undefined) return
      const verseH = verseHeights.current[currentIndex] ?? 60
      const scrollH = scrollViewHeight.current
      // Center the active verse in the scroll view
      const centeredY = y - scrollH / 2 + verseH / 2
      scrollRef.current?.scrollTo({ y: Math.max(0, centeredY), animated: true })
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
        verseResults: JSON.stringify(
          verseAttempts.map((v) => ({
            verseNumber: v.verseNumber,
            score: v.lastScore,
            wordResults: v.wordResults,
          }))
        ),
        chapterId: String(chapterId),
        from: 'membaca',
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
          <RiIcon name="arrow-left-s-line" size={22} color="#34D399" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerArabicName}>{chapter?.name_arabic ?? ''}</Text>
          <Text style={styles.headerSurahName}>{chapter?.name_simple ?? 'Mode Membaca'}</Text>
          <Text style={styles.headerSub}>{verseNumbers.length} Ayat</Text>
        </View>
        <View style={[
          styles.progressBadge,
          allDone && { backgroundColor: 'rgba(74,222,128,0.15)', borderColor: 'rgba(74,222,128,0.3)' }
        ]}>
          <Text style={[styles.progressBadgeText, allDone && { color: '#4ADE80' }]}>
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
        onLayout={(e) => { scrollViewHeight.current = e.nativeEvent.layout.height }}
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
          const showHintBadge =
            idx === currentIndex &&
            attempt.state === 'listening' &&
            attempt.attempts >= 3 &&
            !attempt.withHint &&
            idx !== 0

          return (
            <View
              key={verse.verse_number}
              style={styles.verseRow}
              onLayout={(e) => {
                verseYPositions.current[idx] = e.nativeEvent.layout.y
                verseHeights.current[idx] = e.nativeEvent.layout.height
              }}
            >
              {attempt.state === 'analyzing' && <SoundWave />}
              <View style={{ flex: 1, position: 'relative' }}>
                {/* Full verse — invisible, hanya untuk menjaga lebar layout */}
                <Text style={[styles.arabicFlow, { opacity: 0 }]}>
                  <VerseSegment verse={verse} attempt={attempt} hideEndMark />
                </Text>
                {/* Visible layer with word-by-word reveal on correct */}
                <RevealingVerseOverlay verse={verse} attempt={attempt} isFirst={idx === 0} />
                {/* Hint badge — muncul setelah 3x salah */}
                {showHintBadge && (
                  <TouchableOpacity
                    style={styles.hintBadge}
                    onPress={() => showHint(idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.hintBadgeText}>💡 Tampilkan Bantuan</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        })}
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {allDone ? (
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <RiIcon name="trophy-fill" size={18} color="#E8C97A" />
              <Text style={styles.finishBtnText}>Lihat Hasil</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.bottomStatus}>
              {!isRunning ? 'Tekan mikrofon untuk mulai membaca' : 'Sedang merekam — baca terus'}
            </Text>
            <View style={styles.bottomRow}>
              {isRunning && (
                <TouchableOpacity style={styles.skipBtn} onPress={skipCurrentVerse}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <RiIcon name="skip-forward-line" size={14} color="rgba(52,211,153,0.6)" />
                    <Text style={styles.skipBtnText}>Lewati</Text>
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.micBtn, isRunning && styles.micBtnRecording]}
                onPress={isRunning ? stopSession : startSession}
              >
                <RiIcon
                  name={isRunning ? 'stop-circle-fill' : 'mic-fill'}
                  size={26}
                  color={isRunning ? '#FCA5A5' : '#34D399'}
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0D1B2A' },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1B2A' },

  // Header
  header:             { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(5,150,105,0.15)' },
  backBtn:            { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(5,150,105,0.1)', borderWidth: 1, borderColor: 'rgba(5,150,105,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerCenter:       { flex: 1, alignItems: 'center', gap: 1 },
  headerArabicName:   { color: '#34D399', fontSize: 20, fontFamily: 'ScheherazadeNew-Regular', lineHeight: 30 },
  headerSurahName:    { color: '#ECFDF5', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  headerSub:          { color: 'rgba(52,211,153,0.5)', fontSize: 10, letterSpacing: 0.5 },
  progressBadge:      { backgroundColor: 'rgba(5,150,105,0.1)', borderWidth: 1, borderColor: 'rgba(5,150,105,0.25)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  progressBadgeText:  { color: '#34D399', fontSize: 12, fontWeight: '700' },

  // Progress
  progressStrip:      { height: 2, backgroundColor: 'rgba(5,150,105,0.1)' },
  progressFill:       { height: 2, backgroundColor: '#059669' },

  // Status chip
  chipRow:            { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'flex-end' },
  chipWrap:           { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.3)' },
  chipText:           { fontSize: 11, fontWeight: '700' },

  // Mushaf
  scroll:             { flex: 1 },
  mushafPage:         { padding: 24, paddingBottom: 48 },
  arabicFlow:         { fontSize: 25, lineHeight: 60, fontFamily: 'ScheherazadeNew-Regular', textAlign: 'right', writingDirection: 'rtl', color: '#ECFDF5' },
  arabicFlowOverlay:  { position: 'absolute', top: 0, left: 0, right: 0 },
  arabicWord:         { fontSize: 25, fontFamily: 'ScheherazadeNew-Regular', lineHeight: 60 },
  arabicDots:         { fontSize: 18, color: 'rgba(52,211,153,0.4)', lineHeight: 60, letterSpacing: 2 },
  verseCircle:        { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#34D399', justifyContent: 'center', alignItems: 'center' },
  verseCircleText:    { fontSize: 11, fontFamily: 'ScheherazadeNew-Regular', lineHeight: 14 },

  // Bottom bar
  bottomBar:          { backgroundColor: 'rgba(13,27,42,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(5,150,105,0.12)', padding: 16, paddingBottom: 32 },
  bottomStatus:       { color: 'rgba(52,211,153,0.5)', fontSize: 12, textAlign: 'center', marginBottom: 12 },
  bottomRow:          { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  micBtn:             { width: 62, height: 62, borderRadius: 31, backgroundColor: '#065F46', borderWidth: 1.5, borderColor: '#34D399', justifyContent: 'center', alignItems: 'center', shadowColor: '#059669', shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  micBtnRecording:    { backgroundColor: '#7F1D1D', borderColor: '#F87171', shadowColor: '#EF4444' },
  skipBtn:            { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(5,150,105,0.07)', borderWidth: 1, borderColor: 'rgba(5,150,105,0.15)' },
  skipBtnText:        { color: 'rgba(52,211,153,0.6)', fontSize: 12 },
  finishBtn:          { backgroundColor: '#065F46', borderWidth: 1.5, borderColor: '#34D399', borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#059669', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  finishBtnText:      { color: '#fff', fontWeight: '700', fontSize: 16 },
  verseRow:           { flexDirection: 'row-reverse', alignItems: 'center', flexWrap: 'wrap' },
  hintBadge:          { position: 'absolute', bottom: -8, right: 0, backgroundColor: 'rgba(252,211,77,0.12)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.35)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  hintBadgeText:      { color: '#FCD34D', fontSize: 11, fontWeight: '700' },
  waveWrap:           { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 10 },
  waveBar:            { width: 3, borderRadius: 2, backgroundColor: '#34D399' },
})
