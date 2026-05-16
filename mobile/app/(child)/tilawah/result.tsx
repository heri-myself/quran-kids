import { useEffect, useRef } from 'react'
import {
  View,
  
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native'
import { Text } from '../../../components/Text'
import { useLocalSearchParams, useRouter } from 'expo-router'
import LottieView from 'lottie-react-native'
import { useProfileStore } from '../../../stores/profile-store'
import { saveSession } from '../../../services/tilawah'
import { VerseResult } from '../../../hooks/use-tilawah'

export default function TilawahResultScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    chapterId: string
    totalScore: string
    stars: string
    pointsEarned: string
    verseResults: string
  }>()

  const { activeProfile } = useProfileStore()

  const starsRef = useRef<LottieView>(null)
  const confettiRef = useRef<LottieView>(null)

  const totalScore = Number(params.totalScore ?? 0)
  const stars = Number(params.stars ?? 1)
  const pointsEarned = Number(params.pointsEarned ?? 10)
  const verseResults: VerseResult[] = JSON.parse(params.verseResults ?? '[]')

  // Play animations on mount
  useEffect(() => {
    starsRef.current?.play()
    if (stars >= 2) {
      setTimeout(() => confettiRef.current?.play(), 600)
    }
  }, [])

  // Save session on mount
  useEffect(() => {
    if (!activeProfile?.id) return

    saveSession({
      profileId: activeProfile.id,
      chapterId: Number(params.chapterId),
      totalScore,
      stars,
      pointsEarned,
      verses: verseResults.map((v) => ({
        verseNumber: v.verseNumber,
        score: v.score,
        wordAccuracy: v.wordAccuracy,
        tajweedScore: v.tajweedScore,
        feedback: v.feedback,
      })),
    }).catch(console.error)
  }, [])

  const starEmojis = Array.from({ length: 3 }, (_, i) => (i < stars ? '⭐' : '☆'))

  return (
    <View style={styles.container}>
      {stars >= 2 && (
        <LottieView
          ref={confettiRef}
          source={require('../../../assets/animations/confetti.json')}
          style={StyleSheet.absoluteFillObject}
          loop={false}
          autoPlay={false}
        />
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.starsWrapper}>
          <LottieView
            ref={starsRef}
            source={require('../../../assets/animations/stars.json')}
            style={{ width: 200, height: 200 }}
            loop={false}
            autoPlay={false}
          />
          <Text style={styles.starEmojis}>{starEmojis.join(' ')}</Text>
        </View>

        <Text style={styles.title}>
          {stars === 3 ? 'Luar Biasa! 🎉' : stars === 2 ? 'Bagus Sekali! 👏' : 'Terus Berlatih! 💪'}
        </Text>
        <Text style={styles.score}>{totalScore}</Text>
        <Text style={styles.scoreLabel}>Skor Rata-rata</Text>

        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>+{pointsEarned} Poin</Text>
        </View>

        <View style={styles.recapCard}>
          <Text style={styles.recapTitle}>Rekap per Ayat</Text>
          {verseResults.map((v) => (
            <View key={v.verseNumber} style={styles.recapRow}>
              <Text style={styles.recapVerseLabel}>Ayat {v.verseNumber}</Text>
              <View style={styles.recapBarBg}>
                <View style={[styles.recapBarFill, { width: `${v.score}%` as any }]} />
              </View>
              <Text style={styles.recapScoreText}>{v.score}</Text>
            </View>
          ))}
        </View>

        {(() => {
          const tajweedFeedback = verseResults
            .flatMap((v) => v.feedback)
            .filter((f) => f.includes('mad') || f.includes('panjang'))
          const unique = [...new Set(tajweedFeedback)]
          if (unique.length === 0) return null
          return (
            <View style={styles.tajweedCard}>
              <Text style={styles.tajweedTitle}>📝 Catatan Tajweed</Text>
              {unique.map((f, i) => (
                <Text key={i} style={styles.tajweedItem}>• {f}</Text>
              ))}
            </View>
          )
        })()}

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.replace(`/(child)/tilawah/${params.chapterId}` as any)}
        >
          <Text style={styles.btnPrimaryText}>Ulangi Surah</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.replace('/(child)/' as any)}
        >
          <Text style={styles.btnSecondaryText}>Kembali ke Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  content: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  starsWrapper: { alignItems: 'center', marginBottom: 8 },
  starEmojis: { fontSize: 36, marginTop: -32 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  score: { color: '#FFD166', fontSize: 64, fontWeight: '900' },
  scoreLabel: { color: '#94A3B8', fontSize: 14, marginTop: -4, marginBottom: 16 },
  pointsBadge: {
    backgroundColor: '#7C6FF1',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 24,
  },
  pointsText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  recapCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  recapTitle: { color: '#D4D0FF', fontWeight: '700', fontSize: 15, marginBottom: 12 },
  recapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  recapVerseLabel: { color: '#94A3B8', fontSize: 12, width: 52 },
  recapBarBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
  recapBarFill: { height: 8, backgroundColor: '#7C6FF1', borderRadius: 4 },
  recapScoreText: { color: '#D4D0FF', fontSize: 12, width: 28, textAlign: 'right' },
  btnPrimary: {
    width: '100%',
    backgroundColor: '#7C6FF1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  btnSecondary: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#D4D0FF', fontWeight: '600', fontSize: 15 },
  tajweedCard: {
    width: '100%',
    backgroundColor: 'rgba(234,179,8,0.12)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
  },
  tajweedTitle: { color: '#854D0E', fontWeight: '700', fontSize: 14, marginBottom: 8 },
  tajweedItem: { color: '#92400E', fontSize: 13, lineHeight: 20 },
})
