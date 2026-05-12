import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated'
import { useTilawah, calcStars, calcPoints, VerseResult } from '../../../hooks/use-tilawah'
import { getSurahVerses } from '../../../services/quran'

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
          withTiming(8 + (index % 5) * 5, { duration: 200 + index * 40 }),
          withTiming(8, { duration: 200 + index * 40 })
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

export default function TilawahLatihanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [verseResults, setVerseResults] = useState<VerseResult[]>([])

  const verses = getSurahVerses(Number(id)) as Verse[]
  const isLoading = false

  const { recordingState, currentEval, error, startRecording, stopAndEvaluate, reset } =
    useTilawah(Number(id))

  const currentVerse = verses[currentIndex]
  const isRecording = recordingState === 'recording'
  const isAnalyzing = recordingState === 'analyzing'
  const isDone = recordingState === 'done'

  const handleMicPress = async () => {
    if (recordingState === 'idle' || recordingState === 'error') {
      await startRecording()
    } else if (recordingState === 'recording') {
      if (!currentVerse) return
      const result = await stopAndEvaluate(currentVerse.verse_number, currentVerse.text_uthmani)
      if (result) {
        setVerseResults((prev) => [
          ...prev,
          {
            verseNumber: currentVerse.verse_number,
            score: result.score,
            wordAccuracy: result.wordAccuracy,
            tajweedScore: result.tajweedScore,
            feedback: result.feedback,
            evaluation: result,
          },
        ])
      }
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
      reset()
    }
  }

  if (isLoading || !currentVerse) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#7C6FF1" size="large" />
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
                const isCorrect = !wordResult || wordResult.correct !== false
                return (
                  <Text
                    key={i}
                    style={[styles.arabicWord, { color: isCorrect ? '#10B981' : '#EF4444' }]}
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
            <Text style={styles.feedbackScore}>Skor: {currentEval.score}/100</Text>
            {currentEval.feedback.map((f, i) => (
              <Text key={i} style={styles.feedbackItem}>
                • {f}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Recording Area */}
      <View style={styles.recordArea}>
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.recordStatus}>
          {recordingState === 'idle' && 'Tap untuk mulai rekam'}
          {recordingState === 'recording' && '🔴 Sedang merekam...'}
          {recordingState === 'analyzing' && '⏳ Menganalisis...'}
          {recordingState === 'done' && `✅ Skor: ${currentEval?.score ?? 0}`}
          {recordingState === 'error' && '❌ Coba lagi'}
        </Text>

        {isRecording && (
          <View style={styles.waveform}>
            {Array.from({ length: 20 }).map((_, i) => (
              <WaveformBar key={i} index={i} isActive={isRecording} />
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {isDone && (
            <TouchableOpacity style={styles.retryBtn} onPress={reset}>
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
              ) : (
                <Text style={{ fontSize: 32 }}>{isRecording ? '⏹' : '🎙️'}</Text>
              )}
            </TouchableOpacity>
          )}

          {isDone && (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>
                {currentIndex + 1 >= verses.length ? 'Selesai 🎉' : 'Ayat Berikutnya →'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: Platform.OS === 'ios' ? 52 : 32,
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressFill: { height: 4, backgroundColor: '#7C6FF1', borderRadius: 2 },
  progressLabel: { color: '#BDB8FF', fontSize: 12, textAlign: 'center', marginTop: 6 },
  verseCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  verseBadge: {
    alignSelf: 'flex-end',
    backgroundColor: '#7C6FF1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  verseBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  arabicRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  arabicWord: { fontSize: 30, lineHeight: 56, fontFamily: 'ScheherazadeNew-Regular' },
  arabicFull: {
    fontSize: 30,
    color: '#FFFFFF',
    textAlign: 'right',
    lineHeight: 56,
    writingDirection: 'rtl',
    fontFamily: 'ScheherazadeNew-Regular',
  },
  translation: { color: '#94A3B8', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  feedbackCard: {
    backgroundColor: 'rgba(124,111,241,0.15)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  feedbackScore: { color: '#7C6FF1', fontWeight: '700', fontSize: 15, marginBottom: 8 },
  feedbackItem: { color: '#D4D0FF', fontSize: 13, marginBottom: 4 },
  recordArea: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  recordStatus: { color: '#D4D0FF', fontSize: 14 },
  errorText: { color: '#EF4444', fontSize: 13 },
  waveform: { flexDirection: 'row', gap: 4, alignItems: 'center', height: 48 },
  waveBar: { width: 4, borderRadius: 2, backgroundColor: '#7C6FF1', minHeight: 8 },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7C6FF1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C6FF1',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  micBtnActive: { backgroundColor: '#EF4444' },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#7C6FF1',
  },
  retryBtnText: { color: '#7C6FF1', fontWeight: '700', fontSize: 14 },
  nextBtn: {
    flex: 1,
    backgroundColor: '#7C6FF1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
})
