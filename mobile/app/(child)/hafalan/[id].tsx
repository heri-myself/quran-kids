// mobile/app/(child)/hafalan/[id].tsx
import { useState, useEffect } from 'react'
import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  Linking,
} from 'react-native'
import { Text } from '../../../components/Text'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated'
import { useHafalan } from '../../../hooks/use-hafalan'
import { getSurahVerses } from '../../../services/quran'
import { HafalanWordResult } from '../../../services/hafalan'

interface Verse {
  verse_number: number
  text_uthmani: string
  translations: { text: string }[]
  words: { text_uthmani: string; position: number }[]
}

interface VerseResult {
  verseNumber: number
  score: number
  wordResults: HafalanWordResult[]
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
  return <Animated.View style={[styles.waveBar, style, { backgroundColor: '#EF4444' }]} />
}

function HiddenVerse({ wordCount }: { wordCount: number }) {
  return (
    <View style={styles.hiddenRow}>
      {Array.from({ length: wordCount }).map((_, i) => (
        <View key={i} style={[styles.hiddenChip, i % 3 === 0 && { width: 54 }, i % 3 === 1 && { width: 36 }]} />
      ))}
    </View>
  )
}

function WordResultRow({ words, wordResults }: { words: Verse['words']; wordResults: HafalanWordResult[] }) {
  return (
    <View style={styles.wordsRow}>
      {words.map((w, i) => {
        const result = wordResults[i]
        const isCorrect = !result || result.correct !== false
        return (
          <View
            key={i}
            style={[styles.wordChip, isCorrect ? styles.wordCorrect : styles.wordWrong]}
          >
            <Text style={[styles.wordText, { color: isCorrect ? '#16A34A' : '#DC2626' }]}>
              {w.text_uthmani}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export default function HafalanSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [verseResults, setVerseResults] = useState<VerseResult[]>([])

  const verses = getSurahVerses(Number(id)) as Verse[]
  const currentVerse = verses[currentIndex]

  const { hafalanState, currentEval, error, recordingDuration, startRecording, stopAndEvaluate, reset } =
    useHafalan(Number(id))

  const isRecording = hafalanState === 'recording'
  const isAnalyzing = hafalanState === 'analyzing'
  const isDone = hafalanState === 'done'

  const handleMicPress = async () => {
    if (hafalanState === 'idle' || hafalanState === 'error') {
      await startRecording()
    } else if (hafalanState === 'recording') {
      if (!currentVerse) return
      const result = await stopAndEvaluate(currentVerse.verse_number, currentVerse.text_uthmani)
      if (result) {
        setVerseResults((prev) => {
          const entry: VerseResult = {
            verseNumber: currentVerse.verse_number,
            score: result.score,
            wordResults: (result.wordResults ?? []) as HafalanWordResult[],
          }
          const idx = prev.findIndex((v) => v.verseNumber === currentVerse.verse_number)
          if (idx >= 0) {
            const updated = [...prev]
            if (result.score > prev[idx].score) updated[idx] = entry
            return updated
          }
          return [...prev, entry]
        })
      }
    }
  }

  const handleNext = () => {
    if (currentIndex + 1 >= verses.length) {
      router.replace({
        pathname: '/(child)/hafalan/result',
        params: {
          chapterId: id,
          verseResults: JSON.stringify(verseResults),
        },
      } as any)
    } else {
      setCurrentIndex((i) => i + 1)
      reset()
    }
  }

  const handleMicError = () => {
    Alert.alert(
      'Izin Mikrofon',
      'Aktifkan izin mikrofon di Pengaturan untuk menggunakan fitur ini.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
      ]
    )
  }

  if (!currentVerse) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#7C6FF1" size="large" />
      </View>
    )
  }

  const words = currentVerse.words ?? []
  const progressWidth = `${((currentIndex + 1) / verses.length) * 100}%`

  return (
    <View style={styles.container}>
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

          {isDone && currentEval ? (
            <WordResultRow
              words={words}
              wordResults={(currentEval.wordResults ?? []) as HafalanWordResult[]}
            />
          ) : (
            <HiddenVerse wordCount={words.length || 4} />
          )}

          {isDone && currentEval && (
            <View style={styles.scoreRow}>
              <Text style={styles.scoreText}>Skor: {currentEval.score}/100</Text>
              <Text style={styles.starsText}>
                {currentEval.score >= 85 ? '⭐⭐⭐' : currentEval.score >= 65 ? '⭐⭐' : '⭐'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.recordArea}>
        {error && error.includes('Izin') ? (
          <TouchableOpacity onPress={handleMicError}>
            <Text style={styles.errorText}>{error} (Tap untuk buka pengaturan)</Text>
          </TouchableOpacity>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <Text style={styles.recordStatus}>
          {hafalanState === 'idle' && 'Tekan untuk mulai merekam'}
          {hafalanState === 'recording' && `🔴 Merekam... ${recordingDuration}s`}
          {hafalanState === 'analyzing' && '⏳ Sedang dinilai...'}
          {hafalanState === 'done' && '✅ Selesai dibaca'}
          {hafalanState === 'error' && '❌ Coba lagi'}
        </Text>

        {isRecording && (
          <View style={styles.waveform}>
            {Array.from({ length: 12 }).map((_, i) => (
              <WaveformBar key={i} index={i} isActive={isRecording} />
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {isDone && (
            <TouchableOpacity style={styles.retryBtn} onPress={reset}>
              <Text style={styles.retryBtnText}>↺ Ulangi</Text>
            </TouchableOpacity>
          )}

          {!isDone && (
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnActive, isAnalyzing && { opacity: 0.6 }]}
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
                {currentIndex + 1 >= verses.length ? 'Lihat Hasil 🎉' : 'Ayat Berikutnya →'}
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
    minHeight: 160,
    justifyContent: 'center',
  },
  verseBadge: {
    alignSelf: 'flex-end',
    backgroundColor: '#7C6FF1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  verseBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  hiddenRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  hiddenChip: {
    width: 44,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  wordsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  wordChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  wordCorrect: { backgroundColor: '#E6FBF0', borderColor: '#86EFAC' },
  wordWrong: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  wordText: { fontSize: 24, fontFamily: 'ScheherazadeNew-Regular', lineHeight: 40 },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  scoreText: { color: '#D4D0FF', fontWeight: '700', fontSize: 14 },
  starsText: { fontSize: 18 },
  recordArea: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 100,
    alignItems: 'center',
    gap: 16,
  },
  recordStatus: { color: '#D4D0FF', fontSize: 14 },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center' },
  waveform: { flexDirection: 'row', gap: 4, alignItems: 'center', height: 48 },
  waveBar: { width: 4, borderRadius: 2, minHeight: 8 },
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
