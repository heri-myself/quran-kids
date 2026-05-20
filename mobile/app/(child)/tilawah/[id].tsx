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
import { RiIcon } from '../../../components/RiIcon'
import {
  ArrowCounterClockwise, ArrowRight, CheckCircle,
  Headphones, Play, Microphone, StopCircle, XCircle,
  ArrowsClockwise,
} from 'phosphor-react-native'

interface Verse {
  verse_number: number
  text_uthmani: string
  translations: { text: string }[]
  words: { text_uthmani: string; position: number }[]
}

function WaveformBar({ index, isActive }: { index: number; isActive: boolean }) {
  const height = useSharedValue(8)
  useEffect(() => {
    if (isActive) {
      height.value = withRepeat(
        withSequence(
          withTiming(12 + (index % 5) * 8, { duration: 180 + index * 35 }),
          withTiming(8, { duration: 180 + index * 35 })
        ),
        -1,
        true
      )
    } else {
      height.value = withTiming(8)
    }
  }, [isActive])
  const style = useAnimatedStyle(() => ({ height: height.value }))
  return <Animated.View style={[styles.waveBar, style]} />
}

function AudioSampleSheet({
  visible,
  chapterId,
  verseNumber,
  onDismiss,
  onPlay,
  isLoading,
  audioError,
}: {
  visible: boolean
  chapterId: string
  verseNumber: number
  onDismiss: () => void
  onPlay: () => void
  isLoading: boolean
  audioError: string | null
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={sheetStyles.overlay}>
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.title}>🎧 Mau dengar contoh bacaan?</Text>
          <Text style={sheetStyles.subtitle}>
            Sudah 3x mencoba. Yuk dengar dulu cara yang benar!
          </Text>
          <View style={sheetStyles.waveform}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View
                key={i}
                style={[sheetStyles.waveBar, { height: 8 + (i % 5) * 4 }]}
              />
            ))}
            <Text style={sheetStyles.waveLabel}>
              Surah {chapterId} : {verseNumber}
            </Text>
          </View>
          {audioError && (
            <Text style={sheetStyles.errorText}>{audioError}</Text>
          )}
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
                  <Play size={18} color="#FFFFFF" weight="regular" />
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1C0800',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 44,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,107,53,0.3)',
  },
  handle: {
    width: 48,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#FFB899',
    fontSize: 15,
    marginBottom: 18,
    lineHeight: 22,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,107,53,0.08)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.15)',
  },
  waveBar: {
    width: 5,
    backgroundColor: '#FF6B35',
    borderRadius: 3,
  },
  waveLabel: {
    color: '#FFCBA9',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    fontWeight: '600',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  skipBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipText: {
    color: '#FFCBA9',
    fontWeight: '700',
    fontSize: 16,
  },
  playBtn: {
    flex: 2,
    backgroundColor: '#FF6B35',
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FF6B35',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  playText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
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
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {})
        soundRef.current = null
      }
    }
  }, [])

  // Update verseResults dan wrongCount saat evaluasi selesai — handle auto-stop maupun manual stop
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

  const { recordingState, currentEval, error, startRecording, stopAndEvaluate, resetVerse } =
    useTilawah(Number(id))

  useFocusEffect(
    useCallback(() => {
      setCurrentIndex(0)
      setVerseResults([])
      setWrongCount(0)
      setSheetDismissed(false)
      resetVerse()
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
      const avg =
        allResults.length > 0
          ? Math.round(allResults.reduce((s, v) => s + v.score, 0) / allResults.length)
          : 0
      const stars = calcStars(avg)
      const points = calcPoints(stars, avg)
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
    } else {
      setCurrentIndex((i) => i + 1)
      setWrongCount(0)
      setSheetDismissed(false)
      setAudioError(null)
      resetVerse()
    }
  }

  const playAudioSample = async () => {
    if (!currentVerse) return
    setAudioLoading(true)
    setAudioError(null)
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync()
        soundRef.current = null
      }
      const verseKey = `${id}:${currentVerse.verse_number}`
      const res = await fetch(
        `https://api.quran.com/api/v4/recitations/12/by_ayah/${verseKey}`
      )
      if (!res.ok) throw new Error('Gagal mengambil audio')
      const data = await res.json()
      const rawUrl = data?.audio_files?.[0]?.url
      if (!rawUrl) throw new Error('URL audio tidak tersedia')
      const audioUrl = rawUrl.startsWith('http') ? rawUrl : rawUrl.startsWith('//') ? `https:${rawUrl}` : `https://verses.quran.com${rawUrl}`

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false })
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      )
      soundRef.current = sound
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setSheetDismissed(true)
          soundRef.current = null
        }
      })
    } catch (e: any) {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {})
        soundRef.current = null
      }
      setAudioError(e.message ?? 'Audio tidak tersedia')
    } finally {
      setAudioLoading(false)
    }
  }

  const dismissSheet = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {})
      soundRef.current = null
    }
    setSheetDismissed(true)
  }

  if (isLoading || !currentVerse) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#FF6B35" size="large" />
      </View>
    )
  }

  const words = currentVerse.words ?? []
  const translation =
    currentVerse.translations?.[0]?.text?.replace(/<\/?[^>]+(>|$)/g, '') ?? ''

  const progressWidth = `${((currentIndex + 1) / verses.length) * 100}%`

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: progressWidth as any }]} />
      </View>
      <Text style={styles.progressLabel}>
        Ayat {currentIndex + 1} / {verses.length}
      </Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 16 }}>
        <View style={styles.verseCard}>
          <View style={styles.verseBadge}>
            <Text style={styles.verseBadgeText}>{currentVerse.verse_number}</Text>
          </View>

          <View style={styles.arabicRow}>
            {isDone && currentEval && words.length > 0 ? (
              words.map((w, i) => {
                const wordResult = currentEval.wordResults?.[i]
                const status = wordResult?.status ?? (wordResult?.correct === false ? 'wrong' : 'correct')
                const wordColor = status === 'mad_short' ? '#EAB308' : status === 'correct' ? '#10B981' : '#EF4444'
                return (
                  <Text
                    key={i}
                    style={[styles.arabicWord, { color: wordColor }]}
                  >
                    {w.text_uthmani}
                  </Text>
                )
              })
            ) : (
              <Text style={styles.arabicFull}>{currentVerse.text_uthmani}</Text>
            )}
          </View>

          <Text style={styles.translation}>{translation}</Text>
        </View>

        {isDone && currentEval && (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackScore}>
              {currentEval.score >= 85 ? '⭐⭐⭐' : currentEval.score >= 65 ? '⭐⭐' : '⭐'}
              {'  '}Skor: {currentEval.score}/100
            </Text>
            {currentEval.feedback.map((f, i) => (
              <Text key={i} style={styles.feedbackItem}>
                {f}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Recording Area */}
      <View style={styles.recordArea}>
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.recordStatusRow}>
          {recordingState === 'idle' && <Microphone size={20} color="#FFB899" weight="regular" />}
          {recordingState === 'recording' && <View style={styles.recordingDot} />}
          {recordingState === 'analyzing' && <ArrowsClockwise size={20} color="#FCD34D" weight="regular" />}
          {recordingState === 'done' && <CheckCircle size={20} color="#4ADE80" weight="regular" />}
          {recordingState === 'error' && <XCircle size={20} color="#F87171" weight="regular" />}
          <Text style={styles.recordStatus}>
            {recordingState === 'idle' && 'Tap untuk mulai membaca'}
            {recordingState === 'recording' && 'Sedang merekam...'}
            {recordingState === 'analyzing' && 'Sedang dinilai...'}
            {recordingState === 'done' && `Skor: ${currentEval?.score ?? 0}`}
            {recordingState === 'error' && 'Coba lagi ya!'}
          </Text>
        </View>

        {isRecording && (
          <View style={styles.waveform}>
            {Array.from({ length: 20 }).map((_, i) => (
              <WaveformBar key={i} index={i} isActive={isRecording} />
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {isDone && (
            <TouchableOpacity style={styles.retryBtn} onPress={() => { resetVerse(); if (currentVerse) startRecording(currentVerse.verse_number, currentVerse.text_uthmani) }}>
              <ArrowCounterClockwise size={20} color="#FF6B35" weight="regular" />
              <Text style={styles.retryBtnText}>Ulangi</Text>
            </TouchableOpacity>
          )}

          {!isDone && (
            <TouchableOpacity
              style={[
                styles.micBtn,
                isRecording && styles.micBtnActive,
                isAnalyzing && { opacity: 0.6 },
              ]}
              onPress={handleMicPress}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : isRecording ? (
                <StopCircle size={32} color="#fff" weight="regular" />
              ) : (
                <Microphone size={32} color="#fff" weight="regular" />
              )}
            </TouchableOpacity>
          )}

          {isDone && (
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
          )}
        </View>
      {wrongCount >= 3 && (
        <TouchableOpacity
          style={styles.hintBtn}
          onPress={() => setSheetDismissed(false)}
        >
          <Headphones size={18} color="#FFB899" weight="regular" />
          <Text style={styles.hintBtnText}>Dengar Contoh Syeikh</Text>
        </TouchableOpacity>
      )}

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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C0800' },
  progressBar: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: Platform.OS === 'ios' ? 56 : 36,
    marginHorizontal: 20,
    borderRadius: 5,
  },
  progressFill: { height: 10, backgroundColor: '#FF6B35', borderRadius: 5 },
  progressLabel: {
    color: '#FFB899',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  verseCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.15)',
  },
  verseBadge: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 14,
  },
  verseBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  arabicRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 18,
  },
  arabicWord: { fontSize: 40, lineHeight: 72, fontFamily: 'ScheherazadeNew-Regular' },
  arabicFull: {
    fontSize: 40,
    color: '#FFFFFF',
    textAlign: 'right',
    lineHeight: 72,
    writingDirection: 'rtl',
    fontFamily: 'ScheherazadeNew-Regular',
  },
  translation: {
    color: '#FFD4B8',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
    marginTop: 4,
  },
  feedbackCard: {
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.25)',
  },
  feedbackScore: {
    color: '#FF6B35',
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 10,
  },
  feedbackItem: { color: '#FFF2ED', fontSize: 15, marginBottom: 6, lineHeight: 22 },
  recordArea: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 108,
    alignItems: 'center',
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,107,53,0.2)',
  },
  recordStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F87171',
  },
  recordStatus: {
    color: '#FFF2ED',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: { color: '#FCA5A5', fontSize: 15, textAlign: 'center' },
  waveform: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 60 },
  waveBar: { width: 5, borderRadius: 3, backgroundColor: '#FF6B35', minHeight: 8 },
  micBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  micBtnActive: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
  },
  hintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,53,0.35)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  hintBtnText: {
    color: '#FFB899',
    fontSize: 15,
    fontWeight: '700',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  retryBtnText: { color: '#FF6B35', fontWeight: '800', fontSize: 16 },
  nextBtn: {
    flex: 1,
    backgroundColor: '#FF6B35',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FF6B35',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  nextBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 17 },
})
