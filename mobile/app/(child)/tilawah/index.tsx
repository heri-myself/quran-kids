import { useState, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

const RECOMMENDED_IDS = [112, 113, 114, 1]

interface SurahItem {
  id: number
  name_simple: string
  name_arabic: string
  verses_count: number
  translated_name: { name: string }
}

async function fetchChapterList(): Promise<SurahItem[]> {
  const res = await fetch('https://api.quran.com/api/v4/chapters?language=id')
  const data = await res.json()
  return data.chapters
}

function starRating(verseCount: number): string {
  if (verseCount <= 10) return '⭐⭐⭐'
  if (verseCount <= 30) return '⭐⭐'
  return ''
}

export default function TilawahIndexScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const { data: chapters = [], isLoading } = useQuery({
    queryKey: ['chapters'],
    queryFn: fetchChapterList,
    staleTime: Infinity,
  })

  const recommended = useMemo(
    () => chapters.filter((c) => RECOMMENDED_IDS.includes(c.id)),
    [chapters]
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (q === '') return chapters.filter((c) => !RECOMMENDED_IDS.includes(c.id))
    return chapters.filter(
      (c) =>
        c.name_simple.toLowerCase().includes(q) ||
        (c.translated_name?.name?.toLowerCase().includes(q) ?? false)
    )
  }, [chapters, query])

  const renderSurah = ({ item }: { item: SurahItem }) => {
    const stars = starRating(item.verses_count)
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(child)/tilawah/${item.id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{item.id}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.name_simple}</Text>
          <Text style={styles.cardSub}>
            {item.translated_name?.name} · {item.verses_count} ayat
          </Text>
        </View>
        {stars ? <Text style={{ fontSize: 12 }}>{stars}</Text> : null}
        <Text style={styles.cardArabic}>{item.name_arabic}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4FF' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎙️ Latihan Tilawah</Text>
        <Text style={styles.headerSub}>Pilih surah untuk berlatih membaca</Text>
        <TextInput
          style={styles.searchBar}
          placeholder="Cari surah..."
          placeholderTextColor="#BDB8FF"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#7C6FF1" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            query === '' ? (
              <View style={{ marginTop: 16, marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>Direkomendasikan ✨</Text>
                {recommended.map((item) => (
                  <View key={item.id}>{renderSurah({ item })}</View>
                ))}
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Semua Surah</Text>
              </View>
            ) : null
          }
          renderItem={renderSurah}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#7C6FF1',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  headerSub: { color: '#D4D0FF', fontSize: 13, marginBottom: 16 },
  searchBar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    shadowColor: '#7C6FF1',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadgeText: { color: '#7C6FF1', fontWeight: '700', fontSize: 13 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  cardSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  cardArabic: { fontSize: 18, color: '#7C6FF1', fontFamily: 'ScheherazadeNew-Regular' },
})
