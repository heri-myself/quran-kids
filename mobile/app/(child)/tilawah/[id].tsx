import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Platform, Modal, Dimensions,
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence,
} from 'react-native-reanimated'
import { Audio } from 'expo-av'
import { useTilawah, calcStars, calcPoints, VerseResult } from '../../../hooks/use-tilawah'
import { getSurahVerses } from '../../../services/quran'
import { useLastActivityStore } from '../../../stores/last-activity-store'
import {
  ArrowCounterClockwise, ArrowRight, CheckCircle,
  Headphones, Play, Microphone, StopCircle,
  XCircle, ArrowsClockwise, Star,
} from 'phosphor-react-native'

// ─────────────────────────────────────────────────────────────
//  DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const D = {
  // Background
  bg:        '#F4FAF6',

  // Surfaces
  card:      '#FFFFFF',
  panel:     '#22A66A',   // cheerful emerald panel
  panelDark: '#178A55',   // pressed / deep

  // States
  correct:   '#22A66A',
  partial:   '#F5A623',
  wrong:     '#E8453C',
  idle:      '#22A66A',

  // Text
  ink:       '#0F2319',   // 12:1 on white
  inkMid:    '#3A6652',   // 5.8:1 on white
  inkSoft:   '#6B9E86',   // 4.6:1 on white
  white:     '#FFFFFF',

  // Accents
  amber:     '#F5A623',
  amberBg:   '#FFF7E6',
  coral:     '#E8453C',
  coralBg:   '#FFF0EF',
  greenBg:   '#E8F8F0',
  greenMid:  '#B2E4CA',

  // Progress dots
  dotOn:     '#FFFFFF',
  dotOff:    'rgba(255,255,255,0.35)',

  // Misc
  line:      '#E2EEE8',
  starOn:    '#FFB800',
  starOff:   '#D9EDE3',
}

const { width: SW } = Dimensions.get('window')

interface Verse {
  verse_number: number
  text_uthmani: string
  translations: { text: string }[]
  words: { text_uthmani: string; position: number }[]
}

// ─────────────────────────────────────────────────────────────
//  PROGRESS DOTS
// ─────────────────────────────────────────────────────────────
function ProgressDots({ total, current }: { total: number; current: number }) {
  const MAX = 12
  const show = Math.min(total, MAX)
  return (
    <View style={pd.row}>
      {Array.from({ length: show }).map((_, i) => (
        <View
          key={i}
          style={[
            pd.dot,
            i < current   && pd.done,
            i === current  && pd.active,
          ]}
        />
      ))}
      {total > MAX && (
        <Text style={pd.more}>+{total - MAX}</Text>
      )}
    </View>
  )
}
const pd = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: D.dotOff },
  done:   { backgroundColor: D.dotOn, opacity: 0.6 },
  active: { width: 22, borderRadius: 4, backgroundColor: D.dotOn },
  more:   { color: D.dotOn, fontSize: 12, fontWeight: '700', marginLeft: 2 },
})

// ─────────────────────────────────────────────────────────────
//  WAVEFORM
// ─────────────────────────────────────────────────────────────
function WaveBar({ idx, active }: { idx: number; active: boolean }) {
  const h = useSharedValue(5)
  useEffect(() => {
    if (active) {
      h.value = withRepeat(
        withSequence(
          withTiming(8 + (idx % 5) * 8, { duration: 160 + idx * 22 }),
          withTiming(5, { duration: 160 + idx * 22 }),
        ), -1, true,
      )
    } else {
      h.value = withTiming(5)
    }
  }, [active])
  const anim = useAnimatedStyle(() => ({ height: h.value }))
  return (
    <Animated.View style={[anim, {
      width: 4, borderRadius: 2,
      backgroundColor: D.panel,
      marginHorizontal: 1.5,
    }]} />
  )
}

// ─────────────────────────────────────────────────────────────
//  PULSE RING
// ─────────────────────────────────────────────────────────────
function PulseRing({ active }: { active: boolean }) {
  const sc = useSharedValue(1)
  const op = useSharedValue(0)
  useEffect(() => {
    if (active) {
      sc.value = withRepeat(withSequence(
        withTiming(1.9, { duration: 950 }),
        withTiming(1,   { duration: 950 }),
      ), -1, true)
      op.value = withRepeat(withSequence(
        withTiming(0.3, { duration: 950 }),
        withTiming(0,   { duration: 950 }),
      ), -1, true)
    } else {
      sc.value = withTiming(1); op.value = withTiming(0)
    }
  }, [active])
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: sc.value }],
    opacity: op.value,
  }))
  return (
    <Animated.View style={[
      StyleSheet.absoluteFillObject,
      { borderRadius: 999, backgroundColor: D.white },
      anim,
    ]} />
  )
}

// ─────────────────────────────────────────────────────────────
//  STAR ROW
// ─────────────────────────────────────────────────────────────
function StarRow({ score }: { score: number }) {
  const n = score >= 95 ? 5 : score >= 85 ? 4 : score >= 70 ? 3 : score >= 55 ? 2 : 1
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={24} color={i <= n ? D.starOn : D.starOff} weight={i <= n ? 'fill' : 'regular'} />
      ))}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
//  AUDIO SHEET
// ─────────────────────────────────────────────────────────────
function AudioSheet({
  visible, chapterId, verseNumber,
  onDismiss, onPlay, loading, error,
}: {
  visible: boolean; chapterId: string; verseNumber: number
  onDismiss: () => void; onPlay: () => void
  loading: boolean; error: string | null
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={as.overlay}>
        <View style={as.sheet}>
          <View style={as.handle} />

          <View style={as.iconRing}>
            <Headphones size={32} color={D.panel} weight="regular" />
          </View>

          <Text style={as.title}>Dengar Contoh Bacaan</Text>
          <Text style={as.sub}>
            Sudah 3× mencoba.{'\n'}Yuk dengar dulu cara yang benar!
          </Text>

          <View style={as.track}>
            {Array.from({ length: 18 }).map((_, i) => (
              <View key={i} style={[as.tBar, { height: 7 + (i % 5) * 5, opacity: 0.4 + (i % 3) * 0.2 }]} />
            ))}
          </View>
          <Text style={as.trackLabel}>Surah {chapterId} · Ayat {verseNumber}</Text>

          {error ? <Text style={as.err}>{error}</Text> : null}

          <View style={as.btnRow}>
            <TouchableOpacity style={as.skipBtn} onPress={onDismiss}>
              <Text style={as.skipTxt}>Lewati</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[as.playBtn, (loading || !!error) && { opacity: 0.5 }]}
              onPress={onPlay}
              disabled={loading || !!error}
            >
              {loading
                ? <ActivityIndicator color={D.white} size="small" />
                : <><Play size={18} color={D.white} weight="fill" /><Text style={as.playTxt}>Dengar Sekarang</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
const as = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(15,35,25,0.55)', justifyContent: 'flex-end' },
  sheet:      {
    backgroundColor: D.card,
    borderTopLeftRadius: 40, borderTopRightRadius: 40,
    paddingHorizontal: 24, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 42 : 26,
    alignItems: 'center',
  },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: D.line, marginBottom: 22 },
  iconRing:   {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: D.greenBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title:      { fontSize: 22, fontWeight: '800', color: D.ink, marginBottom: 6, textAlign: 'center' },
  sub:        { fontSize: 15, color: D.inkSoft, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  track:      {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: D.greenBg,
    borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16,
    width: '100%', marginBottom: 8,
  },
  tBar:       { width: 5, backgroundColor: D.panel, borderRadius: 3 },
  trackLabel: { fontSize: 13, color: D.inkSoft, fontWeight: '600', marginBottom: 20 },
  err:        { color: D.coral, fontSize: 13, marginBottom: 12 },
  btnRow:     { flexDirection: 'row', gap: 12, width: '100%' },
  skipBtn:    {
    flex: 1, backgroundColor: D.greenBg,
    borderRadius: 22, paddingVertical: 16, alignItems: 'center',
  },
  skipTxt:    { color: D.panel, fontWeight: '700', fontSize: 16 },
  playBtn:    {
    flex: 2, backgroundColor: D.panel,
    borderRadius: 22, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  playTxt:    { color: D.white, fontWeight: '800', fontSize: 16 },
})

// ─────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function TilawahLatihanScreen() {
  const { id }         = useLocalSearchParams<{ id: string }>()
  const router         = useRouter()
  const setLastTilawah = useLastActivityStore((s) => s.setLastTilawah)

  const [currentIndex,   setCurrentIndex]   = useState(0)
  const [verseResults,   setVerseResults]   = useState<VerseResult[]>([])
  const [wrongCount,     setWrongCount]     = useState(0)
  const [sheetDismissed, setSheetDismissed] = useState(false)
  const [audioLoading,   setAudioLoading]   = useState(false)
  const [audioError,     setAudioError]     = useState<string | null>(null)
  const soundRef = useRef<any>(null)

  const verses = getSurahVerses(Number(id)) as Verse[]
  const { recordingState, currentEval, error, startRecording, stopAndEvaluate, resetVerse } = useTilawah(Number(id))

  useEffect(() => () => { soundRef.current?.unloadAsync().catch(() => {}) }, [])

  useEffect(() => {
    if (recordingState !== 'done' || !currentEval || !currentVerse) return
    setVerseResults(prev => {
      const entry: VerseResult = {
        verseNumber: currentVerse.verse_number,
        score: currentEval.score,
        wordAccuracy: currentEval.wordAccuracy,
        tajweedScore: currentEval.tajweedScore,
        feedback: currentEval.feedback,
        evaluation: currentEval,
      }
      const idx = prev.findIndex(v => v.verseNumber === currentVerse.verse_number)
      if (idx >= 0) {
        const next = [...prev]
        if (currentEval.score > prev[idx].score) next[idx] = entry
        return next
      }
      return [...prev, entry]
    })
    if (currentEval.score < 70) {
      setWrongCount(c => {
        const n = c + 1
        if (n >= 3) setSheetDismissed(false)
        return n
      })
    }
  }, [recordingState, currentEval])

  useFocusEffect(useCallback(() => {
    setCurrentIndex(0); setVerseResults([])
    setWrongCount(0); setSheetDismissed(false); resetVerse()
  }, []))

  const currentVerse = verses[currentIndex]
  const isRecording  = recordingState === 'recording'
  const isAnalyzing  = recordingState === 'analyzing'
  const isDone       = recordingState === 'done'

  const accentColor = !isDone || !currentEval ? D.correct
    : currentEval.score >= 85 ? D.correct
    : currentEval.score >= 65 ? D.amber
    : D.coral

  const handleMic = async () => {
    if (!currentVerse) return
    if (recordingState === 'idle' || recordingState === 'error')
      await startRecording(currentVerse.verse_number, currentVerse.text_uthmani)
    else if (isRecording)
      await stopAndEvaluate(currentVerse.verse_number, currentVerse.text_uthmani)
  }

  const handleNext = () => {
    if (currentIndex + 1 >= verses.length) {
      const avg    = verseResults.length > 0
        ? Math.round(verseResults.reduce((s, v) => s + v.score, 0) / verseResults.length) : 0
      const stars  = calcStars(avg)
      const points = calcPoints(stars, avg)
      router.replace({
        pathname: '/(child)/tilawah/result',
        params: { chapterId: String(id), totalScore: String(avg), stars: String(stars), pointsEarned: String(points), verseResults: JSON.stringify(verseResults) },
      })
    } else {
      setCurrentIndex(i => i + 1)
      setWrongCount(0); setSheetDismissed(false); setAudioError(null); resetVerse()
    }
  }

  const playAudio = async () => {
    if (!currentVerse) return
    setAudioLoading(true); setAudioError(null)
    try {
      await soundRef.current?.unloadAsync(); soundRef.current = null
      const res  = await fetch(`https://api.quran.com/api/v4/recitations/12/by_ayah/${id}:${currentVerse.verse_number}`)
      if (!res.ok) throw new Error('Gagal mengambil audio')
      const data = await res.json()
      const raw  = data?.audio_files?.[0]?.url
      if (!raw) throw new Error('URL audio tidak tersedia')
      const url  = raw.startsWith('http') ? raw : raw.startsWith('//') ? `https:${raw}` : `https://verses.quran.com${raw}`
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false })
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true })
      soundRef.current = sound
      sound.setOnPlaybackStatusUpdate((s: any) => {
        if (s.didJustFinish) { setSheetDismissed(true); soundRef.current = null }
      })
    } catch (e: any) {
      await soundRef.current?.unloadAsync().catch(() => {}); soundRef.current = null
      setAudioError(e.message ?? 'Audio tidak tersedia')
    } finally { setAudioLoading(false) }
  }

  const dismissSheet = async () => {
    await soundRef.current?.unloadAsync().catch(() => {}); soundRef.current = null
    setSheetDismissed(true)
  }

  if (!currentVerse) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={D.panel} size="large" />
      </View>
    )
  }

  const words       = currentVerse.words ?? []
  const translation = currentVerse.translations?.[0]?.text?.replace(/<\/?[^>]+(>|$)/g, '') ?? ''

  return (
    <View style={s.root}>

      {/* ── Emerald top bar ─────────────────────────────── */}
      <View style={[s.topBar, { backgroundColor: accentColor }]}>
        <View style={s.topLeft}>
          <Text style={s.surahName}>Surah {id}</Text>
          <ProgressDots total={verses.length} current={currentIndex} />
        </View>
        <View style={s.versePill}>
          <Text style={s.versePillTxt}>{currentIndex + 1}<Text style={{ opacity: 0.65 }}>/{verses.length}</Text></Text>
        </View>
      </View>

      {/* ── Scrollable body ─────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Verse card */}
        <View style={s.verseCard}>

          {/* Arabic */}
          <View style={s.arabicArea}>
            {isDone && currentEval && words.length > 0 ? (
              words.map((w, i) => {
                const wr     = currentEval.wordResults?.[i]
                const status = wr?.status ?? (wr?.correct === false ? 'wrong' : 'correct')
                const col    = status === 'mad_short' ? D.amber : status === 'correct' ? D.correct : D.coral
                return <Text key={i} style={[s.arabicWord, { color: col }]}>{w.text_uthmani}</Text>
              })
            ) : (
              <Text style={s.arabicFull}>{currentVerse.text_uthmani}</Text>
            )}
          </View>

          <View style={s.cardDivider} />

          {/* Translation */}
          <Text style={s.translation}>{translation}</Text>
        </View>

        {/* Feedback card */}
        {isDone && currentEval && (
          <View style={[s.feedbackCard, { backgroundColor: accentColor + '12' }]}>
            <View style={s.feedbackTop}>
              <StarRow score={currentEval.score} />
              <View style={[s.scorePill, { backgroundColor: accentColor }]}>
                <Text style={s.scoreNum}>{currentEval.score}</Text>
                <Text style={s.scoreSub}>/100</Text>
              </View>
            </View>
            {currentEval.feedback.map((f, i) => (
              <Text key={i} style={[s.fbLine, i === 0 && s.fbBold]}>{f}</Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Control panel ───────────────────────────────── */}
      <View style={s.panel}>

        {!!error && <Text style={s.errTxt}>{error}</Text>}

        {/* Status chip */}
        <View style={[s.chip,
          isRecording && s.chipRec,
          isDone      && s.chipDone,
          recordingState === 'error' && s.chipErr,
        ]}>
          {recordingState === 'idle'      && <Microphone    size={15} color={D.panel} weight="regular" />}
          {recordingState === 'recording' && <View style={s.recDot} />}
          {recordingState === 'analyzing' && <ArrowsClockwise size={15} color={D.amber} weight="regular" />}
          {recordingState === 'done'      && <CheckCircle   size={15} color={D.panel} weight="fill" />}
          {recordingState === 'error'     && <XCircle       size={15} color={D.coral} weight="fill" />}
          <Text style={s.chipTxt}>
            {recordingState === 'idle'      && 'Tap mic untuk mulai membaca'}
            {recordingState === 'recording' && 'Sedang merekam...'}
            {recordingState === 'analyzing' && 'Sedang dinilai...'}
            {recordingState === 'done'      && `Nilai kamu: ${currentEval?.score ?? 0}`}
            {recordingState === 'error'     && 'Coba lagi ya!'}
          </Text>
        </View>

        {/* Waveform */}
        {isRecording && (
          <View style={s.waveRow}>
            {Array.from({ length: 26 }).map((_, i) => <WaveBar key={i} idx={i} active />)}
          </View>
        )}

        {/* Mic */}
        {!isDone && (
          <View style={s.micOuter}>
            <PulseRing active={isRecording} />
            <TouchableOpacity
              style={[s.micBtn, isRecording && s.micBtnRec, isAnalyzing && { opacity: 0.6 }]}
              onPress={handleMic}
              disabled={isAnalyzing}
              activeOpacity={0.8}
              accessibilityLabel={isRecording ? 'Berhenti merekam' : 'Mulai merekam'}
              accessibilityRole="button"
            >
              {isAnalyzing
                ? <ActivityIndicator color={D.white} size="large" />
                : isRecording
                  ? <StopCircle size={28} color={D.white} weight="fill" />
                  : <Microphone  size={28} color={D.white} weight="regular" />
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Done actions */}
        {isDone && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={s.retryBtn}
              onPress={() => { resetVerse(); currentVerse && startRecording(currentVerse.verse_number, currentVerse.text_uthmani) }}
              accessibilityLabel="Ulangi"
            >
              <ArrowCounterClockwise size={20} color={D.panel} weight="regular" />
              <Text style={s.retryTxt}>Ulangi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.nextBtn}
              onPress={handleNext}
              accessibilityLabel={currentIndex + 1 >= verses.length ? 'Selesai' : 'Ayat berikutnya'}
            >
              {currentIndex + 1 >= verses.length
                ? <CheckCircle size={20} color={D.panel} weight="fill" />
                : null}
              <Text style={s.nextTxt}>
                {currentIndex + 1 >= verses.length ? 'Selesai!' : 'Berikutnya'}
              </Text>
              {currentIndex + 1 < verses.length
                ? <ArrowRight size={20} color={D.panel} weight="regular" />
                : null}
            </TouchableOpacity>
          </View>
        )}

        {/* Hint */}
        {wrongCount >= 3 && (
          <TouchableOpacity
            style={s.hintBtn}
            onPress={() => setSheetDismissed(false)}
            accessibilityLabel="Dengar contoh Syeikh"
          >
            <Headphones size={16} color={D.panel} weight="regular" />
            <Text style={s.hintTxt}>Dengar Contoh Syeikh</Text>
          </TouchableOpacity>
        )}
      </View>

      <AudioSheet
        visible={wrongCount >= 3 && !sheetDismissed && !!currentVerse}
        chapterId={String(id)}
        verseNumber={currentVerse.verse_number}
        onDismiss={dismissSheet}
        onPlay={playAudio}
        loading={audioLoading}
        error={audioError}
      />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  root: { flex: 1, backgroundColor: D.bg },

  /* Top bar */
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLeft:     { gap: 8 },
  surahName:   { fontSize: 18, fontWeight: '800', color: D.white, letterSpacing: 0.2 },
  versePill:   {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
  },
  versePillTxt: { fontSize: 15, fontWeight: '800', color: D.white },

  /* Scroll */
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 12 },

  /* Verse card */
  verseCard: {
    backgroundColor: D.card,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cardCap: {
    height: 56,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  ayatBadge: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  ayatNum:   { color: D.white, fontSize: 15, fontWeight: '900' },
  arabicArea: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  arabicWord: {
    fontSize: 32, lineHeight: 60,
    fontFamily: 'ScheherazadeNew-Regular',
    color: D.ink,
  },
  arabicFull: {
    fontSize: 32, lineHeight: 60,
    fontFamily: 'ScheherazadeNew-Regular',
    color: D.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  cardDivider: { height: 1, backgroundColor: D.line, marginHorizontal: 20, marginBottom: 14 },
  translation: {
    color: D.inkSoft, fontSize: 15, lineHeight: 24,
    paddingHorizontal: 20, paddingBottom: 20,
    fontStyle: 'italic',
  },

  /* Feedback */
  feedbackCard: {
    borderRadius: 24, padding: 20, marginBottom: 14,
  },
  feedbackTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  scorePill: {
    flexDirection: 'row', alignItems: 'baseline', gap: 2,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  scoreNum:  { fontSize: 24, fontWeight: '900', color: D.white },
  scoreSub:  { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  fbBold:    { fontSize: 16, fontWeight: '700', color: D.ink, marginBottom: 6 },
  fbLine:    { fontSize: 14, color: D.inkMid, lineHeight: 21, marginBottom: 4 },

  /* Panel */
  panel: {
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    paddingTop: 14,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 38 : 22,
    alignItems: 'center',
    gap: 12,
  },

  /* Status chip */
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.greenBg,
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 24,
    minWidth: 240, justifyContent: 'center',
  },
  chipRec:  { backgroundColor: D.coralBg },
  chipDone: { backgroundColor: D.greenBg },
  chipErr:  { backgroundColor: D.coralBg },
  chipTxt:  { color: D.inkMid, fontWeight: '700', fontSize: 14 },
  recDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: D.coral },

  /* Waveform */
  waveRow: {
    flexDirection: 'row', alignItems: 'center',
    height: 50,
    paddingHorizontal: 12,
    width: '100%', justifyContent: 'center',
  },

  /* Mic */
  micOuter: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  micBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: D.panel,
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnRec: { backgroundColor: D.coral },

  /* Actions */
  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.greenBg,
    borderRadius: 22, paddingVertical: 16, paddingHorizontal: 20,
    minHeight: 54,
  },
  retryTxt: { color: D.panel, fontWeight: '700', fontSize: 15 },
  nextBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: D.white,
    borderRadius: 22, paddingVertical: 16, paddingHorizontal: 16,
    minHeight: 54,
  },
  nextTxt: { color: D.panel, fontWeight: '900', fontSize: 16 },

  /* Hint */
  hintBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.greenBg,
    borderRadius: 22, paddingVertical: 12, paddingHorizontal: 20,
    minHeight: 44,
  },
  hintTxt:  { color: D.panel, fontSize: 14, fontWeight: '600' },
  errTxt:   { color: D.coral, fontSize: 13, textAlign: 'center' },
})
