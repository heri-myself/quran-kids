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
    from?: string
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

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => params.from === 'membaca'
            ? router.replace(`/(child)/hafalan/continuous/${params.chapterId}` as any)
            : router.replace(`/(child)/hafalan/${params.chapterId}` as any)
          }
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
  container: { flex: 1, backgroundColor: '#F0FDF4' },
  content: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  starEmojis: { fontSize: 48, marginBottom: 12 },
  title: { color: '#065F46', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  score: { color: '#059669', fontSize: 72, fontWeight: '900' },
  scoreLabel: { color: '#6B7280', fontSize: 14, marginTop: -4, marginBottom: 16 },
  pointsBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#4ADE80',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 9,
    marginBottom: 28,
  },
  pointsText: { color: '#15803D', fontWeight: '800', fontSize: 16 },
  recapCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    shadowColor: '#059669',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  recapTitle: { color: '#065F46', fontWeight: '800', fontSize: 15, marginBottom: 14 },
  recapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  recapLabel: { color: '#6B7280', fontSize: 12, width: 52 },
  recapBarBg: { flex: 1, height: 10, backgroundColor: '#F1F5F9', borderRadius: 5 },
  recapBarFill: { height: 10, backgroundColor: '#34D399', borderRadius: 5 },
  recapScore: { color: '#059669', fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right' },
  btnPrimary: {
    width: '100%',
    backgroundColor: '#059669',
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  btnSecondary: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  btnSecondaryText: { color: '#059669', fontWeight: '700', fontSize: 15 },
})
