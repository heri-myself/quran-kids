import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Modal,
  Dimensions,
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { Audio } from 'expo-av'
import { useTilawah, calcStars, calcPoints, VerseResult } from '../../../hooks/use-tilawah'
import { getSurahVerses } from '../../../services/quran'
import { useLastActivityStore } from '../../../stores/last-activity-store'
import {
  ArrowCounterClockwise, ArrowRight, CheckCircle,
  Headphones, Play, Microphone, StopCircle, XCircle,
  ArrowsClockwise, Star,
} from 'phosphor-react-native'

// ── Design tokens ─────────────────────────────────────────────
const T = {
  // Base palette
  bg:          '#F7F3EB',   // warm ivory
  surface:     '#FFFFFF',   // card surface
  surfaceAlt:  '#F0EBE1',   // alternate surface

  // Primary — deep emerald (Islamic, trustworthy, ≥4.5:1 on white)
  primary:     '#1A7A50',
  primaryMid:  '#2D9E6A',
  primaryLight:'#C8EDD8',
  primaryBg:   '#E8F6EE',

  // Accent — warm amber
  amber:       '#C47E0A',
  amberLight:  '#FFF0C0',
  amberBg:     '#FFF8E6',

  // Coral for errors/recording
  coral:       '#D94F35',
  coralLight:  '#FFE8E4',

  // Neutrals
  ink:         '#1A2820',   // primary text — 10.5:1 on white
  inkMid:      '#3D5248',   // secondary text — 7.2:1
  inkSoft:     '#6B8070',   // tertiary — 4.5:1
  line:        '#DDE8E2',

  // Star gold
  star:        '#F0A500',

  // White
  white:       '#FFFFFF',
}

const { width: SW } = Dimensions.get('window')

interface Verse {
  verse_number: number
  text_uthmani: string
  translations: { text: string }[]
  words: { text_uthmani: string; position: number }[]
}

// ── Waveform bar ───────────────────────────────────────────────
function WaveBar({ index, active }: { index: number; active: boolean }) {
  const h = useSharedValue(4)
  useEffect(() => {
    if (active) {
      h.value = withRepeat(
        withSequence(
          withTiming(6 + (index % 6) * 7, { duration: 180 + index * 25, easing: Easing.inOut(Easing.sine) }),
          withTiming(4, { duration: 180 + index * 25, easing: Easing.inOut(Easing.sine) }),
        ), -1, true,
      )
    } else {
      h.value = withTiming(4, { duration: 200 })
    }
  }, [active])
  const s = useAnimatedStyle(() => ({ height: h.value }))
  return <Animated.View style={[s, { width: 4, borderRadius: 2, backgroundColor: T.white, opacity: 0.8, marginHorizontal: 2 }]} />
}

// ── Pulsing ring around mic ────────────────────────────────────
function PulseRing({ active }: { active: boolean }) {
  const sc = useSharedValue(1)
  const op = useSharedValue(0)
  useEffect(() => {
    if (active) {
      sc.value = withRepeat(withSequence(withTiming(1.85, { duration: 900, easing: Easing.out(Easing.ease) }), withTiming(1, { duration: 900 })), -1, true)
      op.value = withRepeat(withSequence(withTiming(0.28, { duration: 900 }), withTiming(0, { duration: 900 })), -1, true)
    } else {
      sc.value = withTiming(1); op.value = withTiming(0)
    }
  }, [active])
  const s = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }], opacity: op.value }))
  return <Animated.View style={[StyleSheet.absoluteFillObject, { borderRadius: 999, backgroundColor: T.coral }, s]} />
}

// ── Star rating ────────────────────────────────────────────────
function Stars({ score }: { score: number }) {
  const n = score >= 85 ? 3 : score >= 65 ? 2 : 1
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3].map(i => (
        <Star key={i} size={26} color={i <= n ? T.star : T.line} weight={i <= n ? 'fill' : 'regular'} />
      ))}
    </View>
  )
}

// ── Audio sample bottom sheet ──────────────────────────────────
function AudioSheet({
  visible, chapterId, verseNumber, onDismiss, onPlay, loading, error,
}: {
  visible: boolean; chapterId: string; verseNumber: number
  onDismiss: () => void; onPlay: () => void; loading: boolean; error: string | null
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={sh.overlay}>
        <View style={sh.sheet}>
          <View style={sh.pill} />

          <View style={sh.iconWrap}>
            <Headphones size={30} color={T.primary} weight="regular" />
          </View>

          <Text style={sh.title}>Dengar contoh bacaan</Text>
          <Text style={sh.sub}>Sudah 3× mencoba. Yuk dengar dulu!</Text>

          <View style={sh.track}>
            {Array.from({ length: 16 }).map((_, i) => (
              <View key={i} style={[sh.tBar, { height: 6 + (i % 5) * 5, opacity: 0.5 + (i % 3) * 0.15 }]} />
            ))}
            <Text style={sh.trackLabel}>Surah {chapterId} · {verseNumber}</Text>
          </View>

          {error ? <Text style={sh.err}>{error}</Text> : null}

          <View style={sh.row}>
            <TouchableOpacity style={sh.skip} onPress={onDismiss} accessibilityLabel="Lewati">
              <Text style={sh.skipTxt}>Lewati</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sh.play, (loading || !!error) && { opacity: 0.55 }]}
              onPress={onPlay}
              disabled={loading || !!error}
              accessibilityLabel="Dengar contoh bacaan"
            >
              {loading
                ? <ActivityIndicator color={T.white} size="small" />
                : <><Play size={18} color={T.white} weight="fill" /><Text style={sh.playTxt}>Dengar Contoh</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const sh = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(26,40,32,0.5)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: T.surface, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 28, paddingBottom: Platform.OS === 'ios' ? 44 : 28, alignItems: 'center' },
  pill:       { width: 36, height: 4, borderRadius: 2, backgroundColor: T.line, marginBottom: 24 },
  iconWrap:   { width: 64, height: 64, borderRadius: 32, backgroundColor: T.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title:      { fontSize: 20, fontWeight: '800', color: T.ink, marginBottom: 6 },
  sub:        { fontSize: 14, color: T.inkSoft, marginBottom: 20, textAlign: 'center', lineHeight: 21 },
  track:      { flexDirection: 'row', alignItems: 'center', backgroundColor: T.primaryBg, borderRadius: 16, padding: 14, marginBottom: 22, width: '100%', gap: 3 },
  tBar:       { width: 5, backgroundColor: T.primary, borderRadius: 3 },
  trackLabel: { flex: 1, marginLeft: 10, fontSize: 13, color: T.primary, fontWeight: '700' },
  err:        { color: T.coral, fontSize: 13, marginBottom: 10 },
  row:        { flexDirection: 'row', gap: 12, width: '100%' },
  skip:       { flex: 1, backgroundColor: T.primaryBg, borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  skipTxt:    { color: T.primary, fontWeight: '700', fontSize: 15 },
  play:       { flex: 2, backgroundColor: T.primary, borderRadius: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  playTxt:    { color: T.white, fontWeight: '800', fontSize: 16 },
})

// ── Main screen ────────────────────────────────────────────────
export default function TilawahLatihanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router  = useRouter()
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

  useEffect(() => () => {
    soundRef.current?.unloadAsync().catch(() => {})
  }, [])

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
    setCurrentIndex(0); setVerseResults([]); setWrongCount(0)
    setSheetDismissed(false); resetVerse()
  }, []))

  const currentVerse = verses[currentIndex]
  const isRecording  = recordingState === 'recording'
  const isAnalyzing  = recordingState === 'analyzing'
  const isDone       = recordingState === 'done'

  const handleMic = async () => {
    if (!currentVerse) return
    if (recordingState === 'idle' || recordingState === 'error') {
      await startRecording(currentVerse.verse_number, currentVerse.text_uthmani)
    } else if (isRecording) {
      await stopAndEvaluate(currentVerse.verse_number, currentVerse.text_uthmani)
    }
  }

  const handleNext = () => {
    if (currentIndex + 1 >= verses.length) {
      const avg    = verseResults.length > 0 ? Math.round(verseResults.reduce((s, v) => s + v.score, 0) / verseResults.length) : 0
      const stars  = calcStars(avg)
      const points = calcPoints(stars, avg)
      router.replace({ pathname: '/(child)/tilawah/result', params: { chapterId: String(id), totalScore: String(avg), stars: String(stars), pointsEarned: String(points), verseResults: JSON.stringify(verseResults) } })
    } else {
      setCurrentIndex(i => i + 1); setWrongCount(0); setSheetDismissed(false); setAudioError(null); resetVerse()
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
      sound.setOnPlaybackStatusUpdate((s: any) => { if (s.didJustFinish) { setSheetDismissed(true); soundRef.current = null } })
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
    return <View style={s.fill}><ActivityIndicator color={T.primary} size="large" /></View>
  }

  const words       = currentVerse.words ?? []
  const translation = currentVerse.translations?.[0]?.text?.replace(/<\/?[^>]+(>|$)/g, '') ?? ''
  const progress    = (currentIndex + 1) / verses.length

  // Score-based accent
  const scoreAccent = !currentEval ? T.primary
    : currentEval.score >= 85 ? T.primary
    : currentEval.score >= 65 ? T.amber
    : T.coral

  return (
    <View style={s.root}>

      {/* ── Top bar ────────────────────────────────────────── */}
      <View style={s.topBar}>
        <Text style={s.surahLabel}>Surah {id}</Text>
        <Text style={s.verseCounter}>{currentIndex + 1} / {verses.length}</Text>
      </View>

      {/* ── Progress strip ─────────────────────────────────── */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      {/* ── Scrollable body ────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Verse card */}
        <View style={s.verseCard}>
          {/* Colored top strip */}
          <View style={[s.cardStrip, { backgroundColor: scoreAccent }]} />

          {/* Verse badge */}
          <View style={[s.badge, { backgroundColor: scoreAccent }]}>
            <Text style={s.badgeNum}>{currentVerse.verse_number}</Text>
          </View>

          {/* Arabic text */}
          <View style={s.arabicWrap}>
            {isDone && currentEval && words.length > 0 ? (
              words.map((w, i) => {
                const wr     = currentEval.wordResults?.[i]
                const status = wr?.status ?? (wr?.correct === false ? 'wrong' : 'correct')
                const col    = status === 'mad_short' ? T.amber : status === 'correct' ? T.primary : T.coral
                return <Text key={i} style={[s.arabicWord, { color: col }]}>{w.text_uthmani}</Text>
              })
            ) : (
              <Text style={s.arabicFull}>{currentVerse.text_uthmani}</Text>
            )}
          </View>

          {/* Divider */}
          <View style={s.divider} />

          {/* Translation */}
          <Text style={s.translation}>{translation}</Text>
        </View>

        {/* Feedback card */}
        {isDone && currentEval && (
          <View style={[s.feedbackCard, { borderLeftColor: scoreAccent }]}>
            <View style={s.feedbackTop}>
              <Stars score={currentEval.score} />
              <View style={[s.scoreBadge, { backgroundColor: scoreAccent + '1A' }]}>
                <Text style={[s.scoreNum, { color: scoreAccent }]}>{currentEval.score}</Text>
                <Text style={s.scoreDen}>/100</Text>
              </View>
            </View>
            {currentEval.feedback.map((f, i) => (
              <Text key={i} style={[s.feedbackLine, i === 0 && s.feedbackBold]}>{f}</Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Control panel ──────────────────────────────────── */}
      <View style={s.panel}>

        {/* Error */}
        {!!error && <Text style={s.errorMsg}>{error}</Text>}

        {/* Status pill */}
        <View style={[s.statusPill,
          isRecording && s.statusRecording,
          isDone      && s.statusDone,
          recordingState === 'error' && s.statusError,
        ]}>
          {recordingState === 'idle'      && <Microphone    size={16} color={T.white} weight="regular" />}
          {recordingState === 'recording' && <View style={s.recDot} />}
          {recordingState === 'analyzing' && <ArrowsClockwise size={16} color={T.white} weight="regular" />}
          {recordingState === 'done'      && <CheckCircle   size={16} color={T.white} weight="fill" />}
          {recordingState === 'error'     && <XCircle       size={16} color={T.white} weight="fill" />}
          <Text style={s.statusTxt}>
            {recordingState === 'idle'      && 'Tap mic untuk mulai membaca'}
            {recordingState === 'recording' && 'Sedang merekam...'}
            {recordingState === 'analyzing' && 'Sedang dinilai...'}
            {recordingState === 'done'      && `Nilai kamu: ${currentEval?.score ?? 0}`}
            {recordingState === 'error'     && 'Coba lagi ya!'}
          </Text>
        </View>

        {/* Waveform — only while recording */}
        {isRecording && (
          <View style={s.waveWrap}>
            {Array.from({ length: 24 }).map((_, i) => <WaveBar key={i} index={i} active={isRecording} />)}
          </View>
        )}

        {/* Mic button */}
        {!isDone && (
          <View style={s.micOuter}>
            <PulseRing active={isRecording} />
            <TouchableOpacity
              style={[s.micBtn, isRecording && s.micBtnActive, isAnalyzing && { opacity: 0.65 }]}
              onPress={handleMic}
              disabled={isAnalyzing}
              activeOpacity={0.82}
              accessibilityLabel={isRecording ? 'Stop rekaman' : 'Mulai rekaman'}
              accessibilityRole="button"
            >
              {isAnalyzing
                ? <ActivityIndicator color={T.white} size="large" />
                : isRecording
                  ? <StopCircle size={40} color={T.white} weight="fill" />
                  : <Microphone  size={40} color={T.white} weight="regular" />
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Done — retry + next */}
        {isDone && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={s.retryBtn}
              onPress={() => { resetVerse(); currentVerse && startRecording(currentVerse.verse_number, currentVerse.text_uthmani) }}
              accessibilityLabel="Ulangi"
            >
              <ArrowCounterClockwise size={20} color={T.white} weight="regular" />
              <Text style={s.retryTxt}>Ulangi</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.nextBtn} onPress={handleNext} accessibilityLabel="Lanjut">
              {currentIndex + 1 >= verses.length
                ? <CheckCircle size={20} color={T.white} weight="regular" />
                : null}
              <Text style={s.nextTxt}>{currentIndex + 1 >= verses.length ? 'Selesai' : 'Berikutnya'}</Text>
              {currentIndex + 1 < verses.length
                ? <ArrowRight size={20} color={T.white} weight="regular" />
                : null}
            </TouchableOpacity>
          </View>
        )}

        {/* Hint button */}
        {wrongCount >= 3 && (
          <TouchableOpacity style={s.hintBtn} onPress={() => setSheetDismissed(false)} accessibilityLabel="Dengar contoh Syeikh">
            <Headphones size={16} color={T.white} weight="regular" />
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

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({

  fill:   { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  root:   { flex: 1, backgroundColor: T.bg },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingHorizontal: 22,
    paddingBottom: 10,
  },
  surahLabel:   { fontSize: 17, fontWeight: '800', color: T.ink },
  verseCounter: { fontSize: 14, fontWeight: '700', color: T.inkSoft, backgroundColor: T.primaryBg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },

  /* Progress */
  progressTrack: { height: 6, backgroundColor: T.line, marginHorizontal: 22, borderRadius: 3, overflow: 'hidden', marginBottom: 16 },
  progressFill:  { height: 6, backgroundColor: T.primary, borderRadius: 3 },

  /* Scroll */
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 12 },

  /* Verse card */
  verseCard: {
    backgroundColor: T.surface,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cardStrip: { height: 8, width: '100%' },
  badge: {
    position: 'absolute',
    top: 16, right: 20,
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeNum:  { color: T.white, fontWeight: '900', fontSize: 14 },
  arabicWrap: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  arabicWord: { fontSize: 42, lineHeight: 76, fontFamily: 'ScheherazadeNew-Regular', color: T.ink },
  arabicFull: {
    fontSize: 42, lineHeight: 76,
    fontFamily: 'ScheherazadeNew-Regular',
    color: T.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
    width: '100%',
  },
  divider:     { height: 1, backgroundColor: T.line, marginHorizontal: 20, marginBottom: 14 },
  translation: { color: T.inkSoft, fontSize: 15, lineHeight: 23, paddingHorizontal: 20, paddingBottom: 20, fontStyle: 'italic' },

  /* Feedback */
  feedbackCard: {
    backgroundColor: T.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderLeftWidth: 4,
  },
  feedbackTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  scoreBadge:   { flexDirection: 'row', alignItems: 'baseline', gap: 2, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  scoreNum:     { fontSize: 24, fontWeight: '900' },
  scoreDen:     { fontSize: 13, color: T.inkSoft, fontWeight: '600' },
  feedbackBold: { fontWeight: '700', fontSize: 16, color: T.ink, marginBottom: 6 },
  feedbackLine: { color: T.inkMid, fontSize: 14, lineHeight: 21, marginBottom: 4 },

  /* Panel */
  panel: {
    backgroundColor: T.primary,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 12,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 38 : 22,
    alignItems: 'center',
    gap: 14,
  },

  /* Status pill */
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    minWidth: 220,
    justifyContent: 'center',
  },
  statusRecording: { backgroundColor: 'rgba(217,79,53,0.35)' },
  statusDone:      { backgroundColor: 'rgba(255,255,255,0.22)' },
  statusError:     { backgroundColor: 'rgba(217,79,53,0.35)' },
  statusTxt: { color: T.white, fontWeight: '700', fontSize: 14 },
  recDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: T.white },

  /* Waveform */
  waveWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    paddingHorizontal: 14,
    width: '100%',
    justifyContent: 'center',
  },

  /* Mic */
  micOuter: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  micBtn: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: T.primaryMid,
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: T.coral },

  /* Done actions */
  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20,
    minHeight: 52,
  },
  retryTxt: { color: T.white, fontWeight: '700', fontSize: 15 },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: T.white,
    borderRadius: 20, paddingVertical: 16, paddingHorizontal: 16,
    minHeight: 52,
  },
  nextTxt: { color: T.primary, fontWeight: '800', fontSize: 16 },

  /* Hint */
  hintBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingVertical: 12, paddingHorizontal: 20,
    minHeight: 44,
  },
  hintTxt: { color: T.white, fontSize: 14, fontWeight: '600' },

  errorMsg: { color: '#FFD0C8', fontSize: 13, textAlign: 'center' },
})
