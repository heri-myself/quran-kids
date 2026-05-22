// mobile/app/(child)/hafalan/[id].tsx
import { useState, useEffect, useRef, useCallback } from 'react'
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
import { RiIcon } from '../../../components/RiIcon'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
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

const STATUS_INFO: Record<string, { label: string; tip: string; color: string; bg: string; border: string }> = {
  wrong:     { label: 'Salah ucap', tip: 'Perhatikan makhraj dan harakat kata ini', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  missing:   { label: 'Terlewat',   tip: 'Kata ini tidak terucap, pastikan dibaca lengkap', color: '#9333EA', bg: '#FAF5FF', border: '#E9D5FF' },
  mad_short: { label: 'Mad pendek', tip: 'Panjangkan bacaan huruf mad (minimal 2 harakat)', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
}

function WordResultRow({ words, wordResults }: { words: Verse['words']; wordResults: HafalanWordResult[] }) {
  const errorWords = words
    .map((w, i) => {
      const result = wordResults[i]
      const status = result?.status ?? (result?.correct === false ? 'wrong' : 'correct')
      return { word: w.text_uthmani, expected: result?.expected ?? w.text_uthmani, status, index: i }
    })
    .filter((w) => w.status === 'wrong' || w.status === 'missing' || w.status === 'mad_short')

  return (
    <View>
      {/* Arabic text with color per word */}
      <Text style={styles.arabicResult}>
        {words.map((w, i) => {
          const result = wordResults[i]
          const status = result?.status ?? (result?.correct === false ? 'wrong' : 'correct')
          const isMadShort = status === 'mad_short'
          const isCorrect = status === 'correct' || isMadShort
          const color = isMadShort ? '#F59E0B' : isCorrect ? '#10B981' : '#EF4444'
          return (
            <Text key={i} style={{ color }}>
              {w.text_uthmani}{i < words.length - 1 ? ' ' : ''}
            </Text>
          )
        })}
      </Text>

      {/* Error detail cards */}
      {errorWords.length > 0 && (
        <View style={styles.errorList}>
          {errorWords.map((w) => {
            const info = STATUS_INFO[w.status] ?? STATUS_INFO.wrong
            return (
              <View key={w.index} style={[styles.errorCard, { backgroundColor: info.bg, borderColor: info.border }]}>
                <View style={styles.errorCardHeader}>
                  <View style={[styles.errorBadge, { backgroundColor: info.color }]}>
                    <Text style={styles.errorBadgeText}>{info.label}</Text>
                  </View>
                  {w.status === 'mad_short' && (
                    <Text style={styles.errorMadIcon}>🔤</Text>
                  )}
                </View>
                {/* Correct form with harakat */}
                <Text style={[styles.errorArabic, { color: info.color }]}>{w.expected}</Text>
                <Text style={[styles.errorTip, { color: info.color }]}>{info.tip}</Text>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

function HiddenVerse({ wordCount, isActive }: { wordCount: number; isActive: boolean }) {
  return (
    <View style={[styles.hiddenRow, isActive && styles.hiddenRowActive]}>
      {Array.from({ length: wordCount }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.hiddenChip,
            i % 3 === 0 && { width: 54 },
            i % 3 === 1 && { width: 36 },
            isActive && { backgroundColor: 'rgba(124,111,241,0.25)' },
          ]}
        />
      ))}
    </View>
  )
}

export default function HafalanSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const scrollRef = useRef<ScrollView>(null)
  const cardRefs = useRef<{ [key: number]: number }>({})

  const [currentIndex, setCurrentIndex] = useState(0)
  const [verseResults, setVerseResults] = useState<VerseResult[]>([])
  const [allDone, setAllDone] = useState(false)

  const verses = getSurahVerses(Number(id)) as Verse[]

  const { hafalanState, currentEval, error, recordingDuration, startRecording, stopAndEvaluate, reset } =
    useHafalan(Number(id))

  const isRecording = hafalanState === 'recording'
  const isAnalyzing = hafalanState === 'analyzing'
  const isDone = hafalanState === 'done'

  // Reset state every time screen is focused (covers: new surah, same surah retry, back navigation)
  useFocusEffect(
    useCallback(() => {
      setCurrentIndex(0)
      setVerseResults([])
      setAllDone(false)
      cardRefs.current = {}
      reset()
    }, [id])
  )

  // Auto-scroll to active verse card
  useEffect(() => {
    const y = cardRefs.current[currentIndex]
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true })
    }
  }, [currentIndex])

  // After evaluation — save result and advance
  useEffect(() => {
    if (!isDone || !currentEval) return
    const verse = verses[currentIndex]
    if (!verse) return

    const entry: VerseResult = {
      verseNumber: verse.verse_number,
      score: currentEval.score,
      wordResults: (currentEval.wordResults ?? []) as HafalanWordResult[],
    }

    setVerseResults((prev) => {
      const idx = prev.findIndex((v) => v.verseNumber === verse.verse_number)
      if (idx >= 0) {
        const updated = [...prev]
        if (currentEval.score > prev[idx].score) updated[idx] = entry
        return updated
      }
      return [...prev, entry]
    })

    const isLast = currentIndex + 1 >= verses.length
    if (isLast) {
      setAllDone(true)
    }
  }, [isDone, currentEval])

  const handleMicPress = async () => {
    if (hafalanState === 'idle' || hafalanState === 'error') {
      await startRecording()
    } else if (hafalanState === 'recording') {
      const verse = verses[currentIndex]
      if (!verse) return
      await stopAndEvaluate(verse.verse_number, verse.text_uthmani)
    }
  }

  const handleNextVerse = () => {
    if (currentIndex + 1 < verses.length) {
      setCurrentIndex((i) => i + 1)
      reset()
    }
  }

  const handleRetry = () => {
    reset()
  }

  const handleFinish = () => {
    router.replace({
      pathname: '/(child)/hafalan/result',
      params: {
        chapterId: id,
        verseResults: JSON.stringify(verseResults),
      },
    } as any)
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

  const doneCount = verseResults.length
  const progressPct = verses.length > 0 ? (doneCount / verses.length) * 100 : 0

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
      </View>
      <Text style={styles.progressLabel}>
        {doneCount} / {verses.length} ayat selesai
      </Text>

      {/* All verses */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {verses.map((verse, index) => {
          const result = verseResults.find((r) => r.verseNumber === verse.verse_number)
          const isActive = index === currentIndex && !allDone
          const isPast = !!result
          const isFuture = index > currentIndex && !result

          return (
            <View
              key={verse.verse_number}
              style={[
                styles.verseCard,
                isActive && styles.verseCardActive,
                isFuture && styles.verseCardFuture,
              ]}
              onLayout={(e) => {
                cardRefs.current[index] = e.nativeEvent.layout.y
              }}
            >
              {/* Header row */}
              <View style={styles.verseHeader}>
                <View style={[styles.verseBadge, isPast && styles.verseBadgeDone, isFuture && styles.verseBadgeFuture]}>
                  <Text style={styles.verseBadgeText}>
                    {isPast ? '✓' : verse.verse_number}
                  </Text>
                </View>
                {isPast && (
                  <View style={styles.scoreChip}>
                    <Text style={styles.scoreChipText}>{result!.score}/100</Text>
                  </View>
                )}
                {isActive && !isDone && (
                  <View style={styles.activeChip}>
                    <Text style={styles.activeChipText}>● Aktif</Text>
                  </View>
                )}
              </View>

              {/* Verse content */}
              {isPast ? (
                <WordResultRow words={verse.words ?? []} wordResults={result!.wordResults} />
              ) : isActive && isDone && currentEval ? (
                <WordResultRow
                  words={verse.words ?? []}
                  wordResults={(currentEval.wordResults ?? []) as HafalanWordResult[]}
                />
              ) : (
                <HiddenVerse wordCount={(verse.words ?? []).length || 4} isActive={isActive} />
              )}

              {/* Retry / next button for active verse after evaluation */}
              {isActive && isDone && (
                <View style={styles.verseActions}>
                  <TouchableOpacity style={styles.retrySmallBtn} onPress={handleRetry}>
                    <Text style={styles.retrySmallText}>↺ Ulangi</Text>
                  </TouchableOpacity>
                  {!allDone && (
                    <TouchableOpacity style={styles.nextSmallBtn} onPress={handleNextVerse}>
                      <Text style={styles.nextSmallText}>Ayat Selanjutnya →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )
        })}

        <View style={{ height: 220 }} />
      </ScrollView>

      {/* Bottom record area */}
      <View style={styles.recordArea}>
        {error && error.includes('Izin') ? (
          <TouchableOpacity onPress={handleMicError}>
            <Text style={styles.errorText}>{error} (Tap untuk buka pengaturan)</Text>
          </TouchableOpacity>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {!allDone && (
          <Text style={styles.recordStatus}>
            {hafalanState === 'idle' && `Tekan untuk membaca Ayat ${currentIndex + 1}`}
            {hafalanState === 'recording' && `Merekam... ${recordingDuration}s`}
            {hafalanState === 'analyzing' && 'Sedang dinilai...'}
            {hafalanState === 'done' && 'Selesai — ulangi atau lanjut ke ayat berikutnya'}
            {hafalanState === 'error' && 'Coba lagi'}
          </Text>
        )}

        {isRecording && (
          <View style={styles.waveform}>
            {Array.from({ length: 12 }).map((_, i) => (
              <WaveformBar key={i} index={i} isActive={isRecording} />
            ))}
          </View>
        )}

        {allDone ? (
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <RiIcon name="trophy-fill" size={18} color="#fff" />
              <Text style={styles.finishBtnText}>Lihat Hasil</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.micBtn,
              isRecording && styles.micBtnActive,
              (isAnalyzing || isDone) && { opacity: 0.5 },
            ]}
            onPress={handleMicPress}
            disabled={isAnalyzing || isDone}
          >
            {isAnalyzing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <RiIcon name={isRecording ? 'stop-circle-fill' : 'mic-fill'} size={30} color="#fff" />
            )}
          </TouchableOpacity>
        )}
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
  progressLabel: { color: '#BDB8FF', fontSize: 12, textAlign: 'center', marginTop: 6, marginBottom: 4 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },

  verseCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  verseCardActive: {
    borderColor: '#7C6FF1',
    backgroundColor: 'rgba(124,111,241,0.08)',
  },
  verseCardFuture: {
    opacity: 0.45,
  },

  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  verseBadge: {
    backgroundColor: '#7C6FF1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  verseBadgeDone: { backgroundColor: '#10B981' },
  verseBadgeFuture: { backgroundColor: 'rgba(255,255,255,0.15)' },
  verseBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  scoreChip: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  scoreChipText: { color: '#10B981', fontWeight: '700', fontSize: 12 },

  activeChip: {
    backgroundColor: 'rgba(124,111,241,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(124,111,241,0.4)',
  },
  activeChipText: { color: '#A5B4FC', fontWeight: '600', fontSize: 12 },

  arabicResult: {
    fontSize: 26,
    lineHeight: 50,
    fontFamily: 'ScheherazadeNew-Regular',
    textAlign: 'right',
    writingDirection: 'rtl',
    color: '#FFFFFF',
    marginBottom: 8,
  },

  errorList: { gap: 8, marginTop: 4 },
  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  errorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  errorBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  errorBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  errorMadIcon: { fontSize: 14 },
  errorArabic: {
    fontSize: 24,
    lineHeight: 44,
    fontFamily: 'ScheherazadeNew-Regular',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '700',
  },
  errorTip: { fontSize: 12, lineHeight: 18, opacity: 0.85 },

  hiddenRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  hiddenRowActive: {},
  hiddenChip: {
    width: 44,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 7,
  },

  verseActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  retrySmallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(124,111,241,0.5)',
  },
  retrySmallText: { color: '#A5B4FC', fontWeight: '600', fontSize: 13 },
  nextSmallBtn: {
    flex: 1,
    backgroundColor: '#7C6FF1',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  nextSmallText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  recordArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26,26,46,0.97)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    alignItems: 'center',
    gap: 12,
  },
  recordStatus: { color: '#D4D0FF', fontSize: 13, textAlign: 'center' },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center' },
  waveform: { flexDirection: 'row', gap: 4, alignItems: 'center', height: 40 },
  waveBar: { width: 4, borderRadius: 2, minHeight: 8 },
  micBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#7C6FF1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C6FF1',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  micBtnActive: { backgroundColor: '#EF4444' },
  finishBtn: {
    width: '100%',
    backgroundColor: '#7C6FF1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  finishBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
})
