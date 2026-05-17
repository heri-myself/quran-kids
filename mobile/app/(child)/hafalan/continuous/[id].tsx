// mobile/app/(child)/hafalan/continuous/[id].tsx
import { useCallback, useRef, useEffect, useMemo, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Text } from '../../../../components/Text'
import { RiIcon } from '../../../../components/RiIcon'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { getSurahVerses, getChapters } from '../../../../services/quran'
import { useContinuousHafalan } from '../../../../hooks/use-continuous-hafalan'
import type { VerseAttempt, VerseState } from '../../../../hooks/use-continuous-hafalan'

const { width: SCREEN_W } = Dimensions.get('window')

// ─── Stars (hanya di area header) ────────────────────────────────────────────
const STAR_COLORS = ['#FFD700', '#FF9EFF', '#7DF9FF', '#ADFF2F', '#FFB347', '#FF6EB4']

function Star({ x, y, size, delay, color }: { x: number; y: number; size: number; delay: number; color: string }) {
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.3)

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1,   { duration: 700, easing: Easing.out(Easing.ease) }),
        withTiming(0.2, { duration: 900, easing: Easing.in(Easing.ease) }),
        withTiming(0.8, { duration: 500 }),
        withTiming(0,   { duration: 800, easing: Easing.in(Easing.ease) }),
      ),
      -1, false
    ))
    scale.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1,   { duration: 700 }),
        withTiming(0.5, { duration: 900 }),
        withTiming(1.1, { duration: 500 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1, false
    ))
  }, [])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.Text style={[{ position: 'absolute', left: x, top: y, fontSize: size, color }, style]}>
      ✦
    </Animated.Text>
  )
}

const STARS = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  x: Math.random() * SCREEN_W,
  y: 10 + Math.random() * 110,
  size: 6 + Math.random() * 6,
  delay: i * 350,
  color: STAR_COLORS[i % STAR_COLORS.length],
}))

function StarField() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {STARS.map((s) => <Star key={s.id} {...s} />)}
    </View>
  )
}

// ─── Spectrum Wave ────────────────────────────────────────────────────────────
const WAVE_COLORS = ['#FF6EB4', '#FFD700', '#7DF9FF', '#ADFF2F', '#FFB347']

function WaveBar({ delay, color }: { delay: number; color: string }) {
  const height = useSharedValue(4)
  useEffect(() => {
    height.value = withRepeat(
      withSequence(
        withTiming(22, { duration: 320 + delay * 30, easing: Easing.inOut(Easing.sin) }),
        withTiming(4,  { duration: 320 + delay * 30, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    )
  }, [])
  const style = useAnimatedStyle(() => ({ height: height.value }))
  return <Animated.View style={[styles.waveBar, { backgroundColor: color }, style]} />
}

function SpectrumWave() {
  return (
    <View style={styles.waveWrap}>
      {WAVE_COLORS.map((c, i) => <WaveBar key={i} delay={i} color={c} />)}
    </View>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Verse {
  verse_number: number
  text_uthmani: string
  words: { text_uthmani: string; position: number }[]
}

function toArabicNumeral(n: number): string {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])
}

const VERSE_NUM_COLORS: Record<VerseState, string> = {
  pending:    '#A78BFA',
  listening:  '#60A5FA',
  analyzing:  '#FCD34D',
  correct:    '#4ADE80',
  wrong:      '#F87171',
  hint_shown: '#FCD34D',
  skipped:    '#94A3B8',
}

function VerseEndMark({ verseNumber, state }: { verseNumber: number; state: VerseState }) {
  const color = VERSE_NUM_COLORS[state]
  return (
    <View style={[styles.verseCircle, { borderColor: color }]}>
      <Text style={[styles.verseCircleText, { color }]}>
        {toArabicNumeral(verseNumber)}
      </Text>
    </View>
  )
}

function VerseSegment({ verse, attempt, firstWordOnly, hideEndMark }: {
  verse: Verse; attempt: VerseAttempt; firstWordOnly?: boolean; hideEndMark?: boolean
}) {
  const words = firstWordOnly ? verse.words.slice(0, 1) : verse.words
  return (
    <>
      {words.map((w, i) => (
        <Text key={i} style={styles.arabicWord}>{w.text_uthmani}{' '}</Text>
      ))}
      {firstWordOnly && <Text style={styles.arabicDots}>{'...'}</Text>}
      {!hideEndMark && <VerseEndMark verseNumber={verse.verse_number} state={attempt.state} />}
      <Text style={styles.arabicWord}> </Text>
    </>
  )
}

function RevealingVerseOverlay({ verse, attempt, isFirst }: {
  verse: Verse; attempt: VerseAttempt; isFirst: boolean
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
      <Text style={[styles.arabicFlow, styles.arabicFlowOverlay, { color: '#4ADE80' }]}>
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

  if (isFirst || attempt.withHint) {
    return (
      <Text style={[styles.arabicFlow, styles.arabicFlowOverlay, {
        color: attempt.withHint && !isFirst ? '#FCD34D' : '#FFFFFF'
      }]}>
        <VerseSegment verse={verse} attempt={attempt} firstWordOnly />
      </Text>
    )
  }

  return null
}

// ─── Mic pulse ring ───────────────────────────────────────────────────────────
function MicPulse() {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(0.7)
  useEffect(() => {
    scale.value = withRepeat(withSequence(
      withTiming(1.5, { duration: 700, easing: Easing.out(Easing.ease) }),
      withTiming(1,   { duration: 700, easing: Easing.in(Easing.ease) }),
    ), -1, false)
    opacity.value = withRepeat(withSequence(
      withTiming(0,   { duration: 700 }),
      withTiming(0.7, { duration: 0 }),
    ), -1, false)
  }, [])
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))
  return <Animated.View style={[styles.pulseRing, style]} />
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ContinuousHafalanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const chapterId = parseInt(id, 10)
  const router = useRouter()
  const scrollRef = useRef<ScrollView>(null)
  const verseYPositions = useRef<Record<number, number>>({})
  const verseHeights = useRef<Record<number, number>>({})
  const scrollViewHeight = useRef(0)

  const chapter = useMemo(() => getChapters().find((c) => c.id === chapterId), [chapterId])
  const verses = useMemo(
    () => (isNaN(chapterId) ? [] : getSurahVerses(chapterId) as unknown as Verse[]),
    [chapterId]
  )
  const verseNumbers = useMemo(() => verses.map((v) => v.verse_number), [verses])

  const getExpectedText = useCallback(
    (verseNumber: number) => verses.find((v) => v.verse_number === verseNumber)?.text_uthmani ?? '',
    [verses]
  )

  const {
    verseAttempts, currentIndex, isRunning, hintUnlocked, isVoiceDetected,
    startSession, stopSession, skipCurrentVerse, showHint, reset,
  } = useContinuousHafalan(chapterId, verseNumbers, getExpectedText)

  useFocusEffect(useCallback(() => { reset() }, [id, reset]))

  useEffect(() => {
    if (!isRunning || currentIndex === 0) return
    const t = setTimeout(() => {
      const y = verseYPositions.current[currentIndex]
      if (y === undefined) return
      const verseH = verseHeights.current[currentIndex] ?? 60
      const scrollH = scrollViewHeight.current
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
      <LinearGradient
        colors={['#0D0628', '#0F1F4B', '#0D1B2A']}
        style={StyleSheet.absoluteFillObject}
      />
      <StarField />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <RiIcon name="arrow-left-s-line" size={22} color="#A78BFA" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerArabicName}>{chapter?.name_arabic ?? ''}</Text>
          <Text style={styles.headerSurahName}>{chapter?.name_simple ?? 'Mode Membaca'}</Text>
          <Text style={styles.headerSub}>✦ {verseNumbers.length} Ayat ✦</Text>
        </View>
        <View style={[
          styles.progressBadge,
          allDone && { backgroundColor: 'rgba(74,222,128,0.2)', borderColor: 'rgba(74,222,128,0.5)' }
        ]}>
          <Text style={[styles.progressBadgeText, allDone && { color: '#4ADE80' }]}>
            {correctCount}/{verseNumbers.length}
          </Text>
        </View>
      </View>

      {/* Rainbow progress strip */}
      <View style={styles.progressStrip}>
        <LinearGradient
          colors={['#FF6EB4', '#FFD700', '#7DF9FF', '#ADFF2F']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progress * 100}%` as any }]}
        />
      </View>


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

          const isActive = idx === currentIndex && isRunning

          return (
            <View
              key={verse.verse_number}
              style={[styles.verseRow, isActive && styles.verseRowActive]}
              onLayout={(e) => {
                verseYPositions.current[idx] = e.nativeEvent.layout.y
                verseHeights.current[idx] = e.nativeEvent.layout.height
              }}
            >
              {idx === currentIndex && isRunning && isVoiceDetected && attempt.state === 'listening' && (
                <View style={styles.waveContainer}>
                  <SpectrumWave />
                </View>
              )}
              {attempt.state === 'analyzing' && (
                <View style={styles.waveContainer}>
                  <Text style={styles.analyzingText}>Mencocokan hasil...</Text>
                </View>
              )}
              <View style={{ flex: 1, position: 'relative' }}>
                <Text style={[styles.arabicFlow, { opacity: 0 }]}>
                  <VerseSegment verse={verse} attempt={attempt} hideEndMark />
                </Text>
                <RevealingVerseOverlay verse={verse} attempt={attempt} isFirst={idx === 0} />
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
      <LinearGradient
        colors={['rgba(13,6,40,0)', 'rgba(13,6,40,0.97)', '#0D0628']}
        style={styles.bottomGradient}
      >
        {allDone ? (
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.85}>
            <LinearGradient
              colors={['#7C3AED', '#4F46E5']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.finishGradient}
            >
              <RiIcon name="trophy-fill" size={20} color="#FFD700" />
              <Text style={styles.finishBtnText}>🌟 Lihat Hasil!</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <>
            {isRunning && activeAttempt?.state === 'listening' ? (
              <View style={styles.recordingStatus}>
                <RiIcon name="mic-fill" size={12} color="#4ADE80" />
                <Text style={styles.recordingStatusText}> Sedang merekam...</Text>
              </View>
            ) : isRunning && activeAttempt?.state === 'analyzing' ? (
              <Text style={styles.bottomStatus}>Sedang melakukan penilaian...</Text>
            ) : (
              <Text style={styles.bottomStatus}>
                {!isRunning ? 'Tekan mikrofon untuk mulai membaca' : ''}
              </Text>
            )}
            <View style={styles.bottomRow}>
              {isRunning && (
                <TouchableOpacity style={styles.skipBtn} onPress={skipCurrentVerse}>
                  <RiIcon name="skip-forward-line" size={14} color="#94A3B8" />
                  <Text style={styles.skipBtnText}>Lewati</Text>
                </TouchableOpacity>
              )}
              <View style={styles.micWrap}>
                {isRunning && <MicPulse />}
                <TouchableOpacity
                  style={[styles.micBtn, isRunning && styles.micBtnRecording]}
                  onPress={isRunning ? stopSession : startSession}
                  activeOpacity={0.85}
                >
                  {isRunning ? (
                    <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.micGradient}>
                      <RiIcon name="stop-circle-fill" size={28} color="#FFF" />
                    </LinearGradient>
                  ) : (
                    <LinearGradient colors={['#7C3AED', '#4F46E5', '#0EA5E9']} style={styles.micGradient}>
                      <RiIcon name="mic-fill" size={28} color="#FFF" />
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>
              {isRunning && (
                <TouchableOpacity
                  style={[styles.skipBtn, hintUnlocked && { borderColor: 'rgba(252,211,77,0.4)', backgroundColor: 'rgba(252,211,77,0.08)' }]}
                  onPress={() => hintUnlocked ? showHint(currentIndex) : undefined}
                  activeOpacity={hintUnlocked ? 0.7 : 1}
                >
                  <RiIcon name="lightbulb-line" size={14} color={hintUnlocked ? '#FCD34D' : 'rgba(255,255,255,0.2)'} />
                  <Text style={[styles.skipBtnText, hintUnlocked && { color: '#FCD34D' }]}>Hint</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0D0628' },

  header:             { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(167,139,250,0.15)' },
  backBtn:            { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', justifyContent: 'center', alignItems: 'center' },
  headerCenter:       { flex: 1, alignItems: 'center', gap: 2 },
  headerArabicName:   { color: '#E9D5FF', fontSize: 22, fontFamily: 'ScheherazadeNew-Regular', lineHeight: 34 },
  headerSurahName:    { color: '#F1F5F9', fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  headerSub:          { color: '#FFD700', fontSize: 10, letterSpacing: 1 },
  progressBadge:      { backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  progressBadgeText:  { color: '#C4B5FD', fontSize: 12, fontWeight: '700' },

  progressStrip:      { height: 3, backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill:       { height: 3, borderRadius: 2 },

  chipRow:            { paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center' },
  chipWrap:           { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(96,165,250,0.08)' },
  chipText:           { color: '#60A5FA', fontSize: 11, fontWeight: '700' },

  scroll:             { flex: 1 },
  mushafPage:         { padding: 24, paddingBottom: 48 },
  arabicFlow:         { fontSize: 25, lineHeight: 60, fontFamily: 'ScheherazadeNew-Regular', textAlign: 'right', writingDirection: 'rtl', color: '#E2E8F0' },
  arabicFlowOverlay:  { position: 'absolute', top: 0, left: 0, right: 0 },
  arabicWord:         { fontSize: 25, fontFamily: 'ScheherazadeNew-Regular', lineHeight: 60 },
  arabicDots:         { fontSize: 18, color: 'rgba(167,139,250,0.5)', lineHeight: 60, letterSpacing: 2 },
  verseCircle:        { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#A78BFA', justifyContent: 'center', alignItems: 'center' },
  verseCircleText:    { fontSize: 11, fontFamily: 'ScheherazadeNew-Regular', lineHeight: 14 },
  verseRow:           { flexDirection: 'row-reverse', alignItems: 'center', flexWrap: 'wrap', paddingVertical: 4 },
  verseRowActive:     { backgroundColor: 'rgba(124,58,237,0.06)', borderRadius: 12, marginHorizontal: -8, paddingHorizontal: 8 },

  hintBadge:          { position: 'absolute', bottom: -8, right: 0, backgroundColor: 'rgba(252,211,77,0.1)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.4)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  hintBadgeText:      { color: '#FCD34D', fontSize: 11, fontWeight: '700' },

  waveContainer:      { marginLeft: 10, marginBottom: 4, justifyContent: 'center' },
  analyzingText:      { color: '#FCD34D', fontSize: 11, fontWeight: '600' },
  waveWrap:           { flexDirection: 'row', alignItems: 'center', gap: 3, height: 36 },
  waveBar:            { width: 3, borderRadius: 2 },

  bottomGradient:     { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 36 },
  bottomStatus:       { color: 'rgba(203,213,225,0.6)', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  recordingStatus:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  recordingStatusText:{ color: '#4ADE80', fontSize: 13, fontWeight: '600' },
  bottomRow:          { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 },
  micWrap:            { position: 'relative', width: 68, height: 68, justifyContent: 'center', alignItems: 'center' },
  pulseRing:          { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#EF4444' },
  micBtn:             { width: 68, height: 68, borderRadius: 34, overflow: 'hidden', shadowColor: '#7C3AED', shadowOpacity: 0.6, shadowRadius: 20, elevation: 10 },
  micBtnRecording:    { shadowColor: '#EF4444' },
  micGradient:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  skipBtn:            { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  skipBtnText:        { color: '#94A3B8', fontSize: 12 },
  finishBtn:          { borderRadius: 16, overflow: 'hidden', shadowColor: '#7C3AED', shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  finishGradient:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18 },
  finishBtnText:      { color: '#FFF', fontWeight: '700', fontSize: 17 },
})
