// mobile/app/(child)/hafalan/result.tsx
import { useEffect, useRef, useState } from 'react'
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native'
import { Text } from '../../../components/Text'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useProfileStore } from '../../../stores/profile-store'
import { saveHafalanSession, HafalanWordResult } from '../../../services/hafalan'

interface VerseResult {
  verseNumber: number
  score: number
  wordResults: HafalanWordResult[]
}

export default function HafalanResultScreen() {
  const router = useRouter()
  const { activeProfile } = useProfileStore()
  const params = useLocalSearchParams<{
    chapterId: string
    verseResults: string
  }>()

  let verseResults: VerseResult[] = []
  try {
    verseResults = JSON.parse(params.verseResults ?? '[]')
  } catch {
    verseResults = []
  }
  const avgScore =
    verseResults.length > 0
      ? Math.round(verseResults.reduce((s, v) => s + v.score, 0) / verseResults.length)
      : 0
  const [pointsEarned, setPointsEarned] = useState(avgScore >= 90 ? 50 : avgScore >= 70 ? 30 : 15)
  const stars = avgScore >= 85 ? 3 : avgScore >= 65 ? 2 : 1
  const madShortCount = verseResults.reduce(
    (total, v) => total + (v.wordResults ?? []).filter((w) => w.status === 'mad_short').length,
    0
  )
  const starEmojis = Array.from({ length: 3 }, (_, i) => (i < stars ? '⭐' : '☆')).join(' ')

  const hasSavedRef = useRef(false)

  useEffect(() => {
    if (hasSavedRef.current || !activeProfile?.id || verseResults.length === 0) return
    hasSavedRef.current = true

    const save = async () => {
      try {
        const response = await saveHafalanSession({
          profileId: activeProfile.id,
          chapterId: Number(params.chapterId),
          verses: verseResults.map((v) => ({
            verseNumber: v.verseNumber,
            score: v.score,
            wordResults: v.wordResults,
          })),
        })
        setPointsEarned(response.pointsEarned)
      } catch (e) {
        console.error('Gagal simpan sesi hafalan:', e)
      }
    }

    save()
  }, [])

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.starEmojis}>{starEmojis}</Text>

        <Text style={styles.title}>
          {stars === 3 ? 'Masya Allah! 🎉' : stars === 2 ? 'Bagus Sekali! 👏' : 'Terus Berlatih! 💪'}
        </Text>

        <Text style={styles.score}>{avgScore}</Text>
        <Text style={styles.scoreLabel}>Skor Rata-rata</Text>

        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>+{pointsEarned} Poin</Text>
        </View>

        <View style={styles.recapCard}>
          <Text style={styles.recapTitle}>Rekap per Ayat</Text>
          {verseResults.map((v) => (
            <View key={v.verseNumber} style={styles.recapRow}>
              <Text style={styles.recapLabel}>Ayat {v.verseNumber}</Text>
              <View style={styles.recapBarBg}>
                <View style={[styles.recapBarFill, { width: `${v.score}%` as any }]} />
              </View>
              <Text style={styles.recapScore}>{v.score}</Text>
            </View>
          ))}
        </View>

        {madShortCount > 0 && (
          <View style={styles.tajweedCard}>
            <Text style={styles.tajweedTitle}>📝 Catatan Tajweed</Text>
            <Text style={styles.tajweedItem}>
              • Ada {madShortCount} kata dengan mad (huruf panjang) yang terlalu pendek.
              Perhatikan kata yang ditandai kuning.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.replace(`/(child)/hafalan/${params.chapterId}` as any)}
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
  starEmojis: { fontSize: 42, marginBottom: 12 },
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
  recapLabel: { color: '#94A3B8', fontSize: 12, width: 52 },
  recapBarBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
  recapBarFill: { height: 8, backgroundColor: '#7C6FF1', borderRadius: 4 },
  recapScore: { color: '#D4D0FF', fontSize: 12, width: 28, textAlign: 'right' },
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
  tajweedTitle: { color: '#FCD34D', fontWeight: '700', fontSize: 14, marginBottom: 8 },
  tajweedItem: { color: '#FDE68A', fontSize: 13, lineHeight: 20 },
})
