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
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated'
import { Audio } from 'expo-av'
import { useTilawah, calcStars, calcPoints, VerseResult } from '../../../hooks/use-tilawah'
import { getSurahVerses } from '../../../services/quran'
import { useLastActivityStore } from '../../../stores/last-activity-store'
import {
  ArrowCounterClockwise, ArrowRight, CheckCircle,
  Headphones, Play, Microphone, StopCircle, XCircle,
  ArrowsClockwise, Star, Sparkle,
} from 'phosphor-react-native'

const C = {
  bg:           '#F5EAD0',   // warm parchment (reference image background)
  bgAccent:     '#EDE0C4',   // deeper parchment
  card:         '#EDE0C4',   // parchment card — matches reference image
  cardSage:     '#D8EBD8',   // soft sage card
  cardPeach:    '#F2DBC8',   // warm peach card
  sage:         '#5C9E7A',
  sageDark:     '#3D7055',
  sageLight:    '#B8D8C0',
  peach:        '#E8855A',
  peachDark:    '#B85A32',
  peachLight:   '#F2DBC8',
  peachMid:     '#DEB89A',
  green:        '#3EB97A',
  greenDark:    '#228C56',
  red:          '#D95555',
  text:         '#3D2314',
  textSoft:     '#7A4A28',
  textMuted:    '#9A6840',
  gold:         '#C4840E',
  goldLight:    '#F0D898',
  cream:        '#D8C8A8',
}

interface Verse {
  verse_number: number
  text_uthmani: string
  translations: { text: string }[]
  words: { text_uthmani: string; position: number }[]
}

// Scattered sparkle decoration
function Sparkles({ style }: { style?: any }) {
  return (
    <View style={[{ position: 'absolute', width: 70, height: 36 }, style]} pointerEvents="none">
      <View style={{ position: 'absolute', top: 0, left: 0, opacity: 0.5 }}>
        <Sparkle size={13} color={C.gold} weight="fill" />
      </View>
      <View style={{ position: 'absolute', top: 18, left: 28, opacity: 0.4 }}>
        <Sparkle size={9} color={C.sage} weight="fill" />
      </View>
      <View style={{ position: 'absolute', top: 4, left: 52, opacity: 0.45 }}>
        <Sparkle size={11} color={C.peach} weight="fill" />
      </View>
    </View>
  )
}

function WaveformBar({ index, isActive }: { index: number; isActive: boolean }) {
  const height = useSharedValue(6)
  useEffect(() => {
    if (isActive) {
      height.value = withRepeat(
        withSequence(
          withTiming(10 + (index % 5) * 9, { duration: 160 + index * 30 }),
          withTiming(6, { duration: 160 + index * 30 })
        ),
        -1, true
      )
    } else {
      height.value = withTiming(6)
    }
  }, [isActive])
  const style = useAnimatedStyle(() => ({ height: height.value }))
  return <Animated.View style={[styles.waveBar, style]} />
}

function PulsingRing({ isActive }: { isActive: boolean }) {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(0)
  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(withSequence(withTiming(1.8, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, true)
      opacity.value = withRepeat(withSequence(withTiming(0.3, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1, true)
    } else {
      scale.value = withTiming(1)
      opacity.value = withTiming(0)
    }
  }, [isActive])
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }))
  return <Animated.View style={[styles.pulsingRing, style]} />
}

function StarRow({ score }: { score: number }) {
  const count = score >= 85 ? 3 : score >= 65 ? 2 : 1
  return (
    <View style={styles.starRow}>
      {[1, 2, 3].map((s) => (
        <Star key={s} size={30} color={s <= count ? C.gold : '#DDD0B8'} weight={s <= count ? 'fill' : 'regular'} />
      ))}
    </View>
  )
}

function AudioSampleSheet({
  visible, chapterId, verseNumber, onDismiss, onPlay, isLoading, audioError,
}: {
  visible: boolean; chapterId: string; verseNumber: number
  onDismiss: () => void; onPlay: () => void; isLoading: boolean; audioError: string | null
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={sheetStyles.overlay}>
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />
          {/* Decorative sparkles */}
          <View style={{ position: 'absolute', top: 24, right: 32, opacity: 0.5 }}>
            <Sparkle size={14} color={C.gold} weight="fill" />
          </View>
          <View style={{ position: 'absolute', top: 40, right: 56, opacity: 0.4 }}>
            <Sparkle size={9} color={C.sage} weight="fill" />
          </View>
          <View style={sheetStyles.iconBadge}>
            <Headphones size={28} color={C.peach} weight="regular" />
          </View>
          <Text style={sheetStyles.title}>Mau dengar contoh bacaan?</Text>
          <Text style={sheetStyles.subtitle}>
            Sudah 3x mencoba. Yuk dengar dulu cara yang benar!
          </Text>
          <View style={sheetStyles.waveform}>
            {Array.from({ length: 14 }).map((_, i) => (
              <View key={i} style={[sheetStyles.waveBar, { height: 8 + (i % 5) * 5 }]} />
            ))}
            <Text style={sheetStyles.waveLabel}>Surah {chapterId} : {verseNumber}</Text>
          </View>
          {audioError && <Text style={sheetStyles.errorText}>{audioError}</Text>}
          <View style={sheetStyles.actions}>
            <TouchableOpacity style={sheetStyles.skipBtn} onPress={onDismiss}>
              <Text style={sheetStyles.skipText}>Lewati</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sheetStyles.playBtn, (isLoading || !!audioError) && { opacity: 0.6 }]}
              onPress={onPlay}
              disabled={isLoading || !!audioError}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Play size={18} color="#FFFFFF" weight="fill" />
                  <Text style={sheetStyles.playText}>Dengar Contoh</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(61,35,20,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 28,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    alignItems: 'center',
  },
  handle: {
    width: 40, height: 5,
    backgroundColor: C.peachMid,
    borderRadius: 3,
    marginBottom: 20,
  },
  iconBadge: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: C.cardPeach,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  title: { color: C.text, fontSize: 21, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  subtitle: { color: C.textSoft, fontSize: 14, marginBottom: 18, lineHeight: 22, textAlign: 'center' },
  waveform: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.cardPeach,
    borderRadius: 20, padding: 14, marginBottom: 20,
    width: '100%',
  },
  waveBar: { width: 5, backgroundColor: C.peach, borderRadius: 3 },
  waveLabel: { color: C.peachDark, fontSize: 13, marginLeft: 8, flex: 1, fontWeight: '600' },
  errorText: { color: C.red, fontSize: 13, marginBottom: 10, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  skipBtn: {
    flex: 1, backgroundColor: C.cardPeach,
    borderRadius: 22, paddingVertical: 16, alignItems: 'center',
  },
  skipText: { color: C.peachDark, fontWeight: '700', fontSize: 16 },
  playBtn: {
    flex: 2, backgroundColor: C.peach,
    borderRadius: 22, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  playText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
})

export default function TilawahLatihanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const setLastTilawah = useLastActivityStore((s) => s.setLastTilawah)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [verseResults, setVerseResults] = useState<VerseResult[]>([])
  const [wrongCount, setWrongCount] = useState(0)
  const [sheetDismissed, setSheetDismissed] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const soundRef = useRef<any>(null)

  useEffect(() => {
    return () => {
      if (soundRef.current) { soundRef.current.unloadAsync().catch(() => {}); soundRef.current = null }
    }
  }, [])

  useEffect(() => {
    if (recordingState !== 'done' || !currentEval || !currentVerse) return
    setVerseResults((prev) => {
      const newEntry: VerseResult = {
        verseNumber: currentVerse.verse_number,
        score: currentEval.score,
        wordAccuracy: currentEval.wordAccuracy,
        tajweedScore: currentEval.tajweedScore,
        feedback: currentEval.feedback,
        evaluation: currentEval,
      }
      const existing = prev.findIndex((v) => v.verseNumber === currentVerse.verse_number)
      if (existing >= 0) {
        const updated = [...prev]
        if (currentEval.score > prev[existing].score) updated[existing] = newEntry
        return updated
      }
      return [...prev, newEntry]
    })
    if (currentEval.score < 70) {
      setWrongCount((c) => {
        const next = c + 1
        if (next >= 3) setSheetDismissed(false)
        return next
      })
    }
  }, [recordingState, currentEval])

  const verses = getSurahVerses(Number(id)) as Verse[]
  const isLoading = false
  const { recordingState, currentEval, error, startRecording, stopAndEvaluate, resetVerse } = useTilawah(Number(id))

  useFocusEffect(
    useCallback(() => {
      setCurrentIndex(0); setVerseResults([]); setWrongCount(0)
      setSheetDismissed(false); resetVerse()
    }, [])
  )

  const currentVerse = verses[currentIndex]
  const isRecording = recordingState === 'recording'
  const isAnalyzing = recordingState === 'analyzing'
  const isDone = recordingState === 'done'

  const handleMicPress = async () => {
    if (recordingState === 'idle' || recordingState === 'error') {
      if (!currentVerse) return
      await startRecording(currentVerse.verse_number, currentVerse.text_uthmani)
    } else if (recordingState === 'recording') {
      if (!currentVerse) return
      await stopAndEvaluate(currentVerse.verse_number, currentVerse.text_uthmani)
    }
  }

  const handleNext = () => {
    if (currentIndex + 1 >= verses.length) {
      const allResults = [...verseResults]
      const avg = allResults.length > 0
        ? Math.round(allResults.reduce((s, v) => s + v.score, 0) / allResults.length)
        : 0
      const stars = calcStars(avg)
      const points = calcPoints(stars, avg)
      router.replace({
        pathname: '/(child)/tilawah/result',
        params: { chapterId: String(id), totalScore: String(avg), stars: String(stars), pointsEarned: String(points), verseResults: JSON.stringify(allResults) },
      })
    } else {
      setCurrentIndex((i) => i + 1); setWrongCount(0)
      setSheetDismissed(false); setAudioError(null); resetVerse()
    }
  }

  const playAudioSample = async () => {
    if (!currentVerse) return
    setAudioLoading(true); setAudioError(null)
    try {
      if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null }
      const verseKey = `${id}:${currentVerse.verse_number}`
      const res = await fetch(`https://api.quran.com/api/v4/recitations/12/by_ayah/${verseKey}`)
      if (!res.ok) throw new Error('Gagal mengambil audio')
      const data = await res.json()
      const rawUrl = data?.audio_files?.[0]?.url
      if (!rawUrl) throw new Error('URL audio tidak tersedia')
      const audioUrl = rawUrl.startsWith('http') ? rawUrl : rawUrl.startsWith('//') ? `https:${rawUrl}` : `https://verses.quran.com${rawUrl}`
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false })
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: true })
      soundRef.current = sound
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) { setSheetDismissed(true); soundRef.current = null }
      })
    } catch (e: any) {
      if (soundRef.current) { await soundRef.current.unloadAsync().catch(() => {}); soundRef.current = null }
      setAudioError(e.message ?? 'Audio tidak tersedia')
    } finally { setAudioLoading(false) }
  }

  const dismissSheet = async () => {
    if (soundRef.current) { await soundRef.current.unloadAsync().catch(() => {}); soundRef.current = null }
    setSheetDismissed(true)
  }

  if (isLoading || !currentVerse) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.peach} size="large" />
      </View>
    )
  }

  const words = currentVerse.words ?? []
  const translation = currentVerse.translations?.[0]?.text?.replace(/<\/?[^>]+(>|$)/g, '') ?? ''
  const progress = (currentIndex + 1) / verses.length

  return (
    <View style={styles.container}>

      {/* ── Header ─────────────────────────────────── */}
      <View style={styles.header}>
        {/* Sparkle decoration */}
        <Sparkles style={{ top: 8, right: 28 }} />
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
          <View style={[styles.progressDot, { left: `${Math.max(progress * 100 - 2, 0)}%` as any }]} />
        </View>
        <Text style={styles.progressLabel}>Ayat {currentIndex + 1} dari {verses.length}</Text>
      </View>

      {/* ── Scrollable content ─────────────────────── */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Verse card */}
        <View style={styles.verseCard}>
          {/* Watercolor header banner */}
          <View style={styles.verseCardBanner}>
            <View style={styles.verseBadge}>
              <Text style={styles.verseBadgeText}>{currentVerse.verse_number}</Text>
            </View>
            <View style={{ position: 'absolute', right: 28, top: 10, opacity: 0.65 }}>
              <Sparkle size={11} color="#FFFFFF" weight="fill" />
            </View>
            <View style={{ position: 'absolute', right: 52, top: 22, opacity: 0.5 }}>
              <Sparkle size={8} color="#FFFFFF" weight="fill" />
            </View>
          </View>

          <View style={styles.arabicRow}>
            {isDone && currentEval && words.length > 0 ? (
              words.map((w, i) => {
                const wordResult = currentEval.wordResults?.[i]
                const status = wordResult?.status ?? (wordResult?.correct === false ? 'wrong' : 'correct')
                const wordColor =
                  status === 'mad_short' ? C.gold
                  : status === 'correct'  ? C.sage
                  : C.red
                return (
                  <Text key={i} style={[styles.arabicWord, { color: wordColor }]}>
                    {w.text_uthmani}
                  </Text>
                )
              })
            ) : (
              <Text style={styles.arabicFull}>{currentVerse.text_uthmani}</Text>
            )}
          </View>
          <View style={styles.divider} />
          <Text style={styles.translation}>{translation}</Text>
        </View>

        {/* Feedback card */}
        {isDone && currentEval && (
          <View style={[
            styles.feedbackCard,
            currentEval.score >= 85
              ? styles.feedbackCardGreen
              : currentEval.score >= 65
              ? styles.feedbackCardGold
              : styles.feedbackCardRed,
          ]}>
            <View style={styles.feedbackHeader}>
              <StarRow score={currentEval.score} />
              <View style={[
                styles.scorePill,
                currentEval.score >= 85 ? styles.scorePillGreen : currentEval.score >= 65 ? styles.scorePillGold : styles.scorePillRed,
              ]}>
                <Text style={[
                  styles.scoreText,
                  { color: currentEval.score >= 85 ? C.sage : currentEval.score >= 65 ? C.gold : C.red },
                ]}>{currentEval.score}</Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
            </View>
            {currentEval.feedback.map((f, i) => (
              <Text key={i} style={[styles.feedbackItem, i === 0 && styles.feedbackFirst]}>
                {f}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Record area ────────────────────────────── */}
      <View style={styles.recordArea}>
        {/* Decorative dots row */}
        <View style={styles.dotRow}>
          {[C.sage, C.peach, C.gold, C.peach, C.sage].map((col, i) => (
            <View key={i} style={[styles.decorDot, { backgroundColor: col }]} />
          ))}
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/* Status label */}
        <View style={[
          styles.statusChip,
          isRecording && styles.statusChipRecording,
          isDone && styles.statusChipDone,
          recordingState === 'error' && styles.statusChipError,
        ]}>
          {recordingState === 'idle'      && <Microphone size={18} color={C.peach} weight="regular" />}
          {recordingState === 'recording' && <View style={styles.recordingDot} />}
          {recordingState === 'analyzing' && <ArrowsClockwise size={18} color={C.gold} weight="regular" />}
          {recordingState === 'done'      && <CheckCircle size={18} color={C.sage} weight="fill" />}
          {recordingState === 'error'     && <XCircle size={18} color={C.red} weight="fill" />}
          <Text style={[
            styles.statusText,
            isRecording               && { color: C.red },
            isDone                    && { color: C.sageDark },
            recordingState === 'error' && { color: C.red },
          ]}>
            {recordingState === 'idle'      && 'Tap tombol untuk membaca'}
            {recordingState === 'recording' && 'Sedang merekam...'}
            {recordingState === 'analyzing' && 'Sedang dinilai...'}
            {recordingState === 'done'      && `Skor kamu: ${currentEval?.score ?? 0}`}
            {recordingState === 'error'     && 'Coba lagi ya!'}
          </Text>
        </View>

        {/* Waveform */}
        {isRecording && (
          <View style={styles.waveform}>
            {Array.from({ length: 22 }).map((_, i) => (
              <WaveformBar key={i} index={i} isActive={isRecording} />
            ))}
          </View>
        )}

        {/* Mic button */}
        {!isDone && (
          <View style={styles.micWrapper}>
            <PulsingRing isActive={isRecording} />
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnActive, isAnalyzing && { opacity: 0.7 }]}
              onPress={handleMicPress}
              disabled={isAnalyzing}
              activeOpacity={0.85}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#FFFFFF" size="large" />
              ) : isRecording ? (
                <StopCircle size={36} color="#fff" weight="fill" />
              ) : (
                <Microphone size={36} color="#fff" weight="regular" />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Done actions */}
        {isDone && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { resetVerse(); if (currentVerse) startRecording(currentVerse.verse_number, currentVerse.text_uthmani) }}
            >
              <ArrowCounterClockwise size={20} color={C.peach} weight="regular" />
              <Text style={styles.retryBtnText}>Ulangi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              {currentIndex + 1 >= verses.length
                ? <CheckCircle size={20} color="#fff" weight="regular" />
                : null}
              <Text style={styles.nextBtnText}>
                {currentIndex + 1 >= verses.length ? 'Selesai' : 'Ayat Berikutnya'}
              </Text>
              {currentIndex + 1 < verses.length
                ? <ArrowRight size={20} color="#fff" weight="regular" />
                : null}
            </TouchableOpacity>
          </View>
        )}

        {/* Hint button */}
        {wrongCount >= 3 && (
          <TouchableOpacity style={styles.hintBtn} onPress={() => setSheetDismissed(false)}>
            <Headphones size={17} color={C.peachDark} weight="regular" />
            <Text style={styles.hintBtnText}>Dengar Contoh Syeikh</Text>
          </TouchableOpacity>
        )}
      </View>

      <AudioSampleSheet
        visible={wrongCount >= 3 && !sheetDismissed && !!currentVerse}
        chapterId={String(id)}
        verseNumber={currentVerse?.verse_number ?? 1}
        onDismiss={dismissSheet}
        onPlay={playAudioSample}
        isLoading={audioLoading}
        audioError={audioError}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  /* Header */
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 38,
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  progressTrack: {
    height: 14,
    backgroundColor: C.cream,
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: 14,
    backgroundColor: C.sage,
    borderRadius: 7,
  },
  progressDot: {
    position: 'absolute',
    top: 3,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    shadowColor: C.sage,
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  progressLabel: {
    color: C.textSoft,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.4,
  },

  /* Scroll content */
  scrollContent: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 },

  /* Verse card */
  verseCard: {
    backgroundColor: C.card,
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingBottom: 22,
    paddingTop: 0,
    marginBottom: 14,
    overflow: 'hidden',
  },
  /* Watercolor banner at top of verse card */
  verseCardBanner: {
    height: 52,
    backgroundColor: C.sage,
    marginHorizontal: -22,
    marginBottom: 16,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  verseBadge: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  verseBadgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  arabicRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  arabicWord: { fontSize: 40, lineHeight: 72, fontFamily: 'ScheherazadeNew-Regular' },
  arabicFull: {
    fontSize: 40, color: C.text,
    textAlign: 'right', lineHeight: 72,
    writingDirection: 'rtl',
    fontFamily: 'ScheherazadeNew-Regular',
    width: '100%',
  },
  divider: {
    height: 1.5,
    backgroundColor: C.cream,
    marginBottom: 12,
    borderRadius: 1,
  },
  translation: {
    color: C.textMuted, fontSize: 15, fontStyle: 'italic', lineHeight: 23,
  },

  /* Feedback card */
  feedbackCard: {
    borderRadius: 24, padding: 20,
    marginBottom: 14,
  },
  feedbackCardGreen: { backgroundColor: C.cardSage },
  feedbackCardGold:  { backgroundColor: C.goldLight },
  feedbackCardRed:   { backgroundColor: '#FFF5F5' },
  feedbackHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  starRow: { flexDirection: 'row', gap: 4 },
  scorePill: {
    flexDirection: 'row', alignItems: 'baseline', gap: 2,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  scorePillGreen: { backgroundColor: 'rgba(92,158,122,0.15)' },
  scorePillGold:  { backgroundColor: 'rgba(212,146,30,0.15)' },
  scorePillRed:   { backgroundColor: 'rgba(217,85,85,0.12)' },
  scoreText: { fontWeight: '900', fontSize: 22 },
  scoreMax: { color: C.textMuted, fontWeight: '600', fontSize: 13 },
  feedbackFirst: { fontWeight: '700', fontSize: 16, color: C.text, marginBottom: 8 },
  feedbackItem: { color: C.textSoft, fontSize: 14, marginBottom: 5, lineHeight: 21 },

  /* Record area */
  recordArea: {
    backgroundColor: C.card,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
    gap: 14,
  },

  /* Decorative dots */
  dotRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 6,
  },
  decorDot: {
    width: 8, height: 8, borderRadius: 4,
    opacity: 0.5,
  },

  /* Status chip */
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.cardPeach,
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 24,
  },
  statusChipRecording: { backgroundColor: '#FFF0F0' },
  statusChipDone:      { backgroundColor: C.cardSage },
  statusChipError:     { backgroundColor: '#FFF0F0' },
  statusText: { color: C.peachDark, fontSize: 15, fontWeight: '700' },
  recordingDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: C.red,
  },
  errorText: { color: C.red, fontSize: 14, textAlign: 'center' },

  /* Waveform */
  waveform: {
    flexDirection: 'row', gap: 4, alignItems: 'center',
    height: 56,
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 16, borderRadius: 20,
    width: '100%', justifyContent: 'center',
  },
  waveBar: { width: 5, borderRadius: 3, backgroundColor: C.red, minHeight: 6 },

  /* Mic button */
  micWrapper: { alignItems: 'center', justifyContent: 'center', width: 104, height: 104 },
  pulsingRing: {
    position: 'absolute',
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: C.green,
  },
  micBtn: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: C.red },

  /* Done actions */
  actionRow: { flexDirection: 'row', gap: 12, alignItems: 'center', width: '100%' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: C.cardPeach,
  },
  retryBtnText: { color: C.peach, fontWeight: '800', fontSize: 15 },
  nextBtn: {
    flex: 1, backgroundColor: C.sage,
    borderRadius: 22, paddingVertical: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nextBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },

  /* Hint */
  hintBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.cardPeach,
    borderRadius: 22, paddingVertical: 11, paddingHorizontal: 20,
  },
  hintBtnText: { color: C.peachDark, fontSize: 14, fontWeight: '700' },
})
