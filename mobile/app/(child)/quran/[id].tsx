import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useChapters, useSurahVerses } from '../../../hooks/use-quran'
import type { Verse, Word } from '../../../services/quran'

function WordBox({ word }: { word: Word }) {
  return (
    <View style={{
      alignItems: 'center',
      backgroundColor: '#F4F4FF',
      borderWidth: 1, borderColor: '#DDD8FF',
      borderRadius: 8, padding: 8, minWidth: 60,
    }}>
      <Text style={{ fontSize: 20, color: '#1A1A2E', lineHeight: 28 }}>
        {word.text_uthmani}
      </Text>
      <Text style={{ fontSize: 9, color: '#B0B0C8', textAlign: 'center', marginTop: 3 }}>
        {word.translation?.text ?? ''}
      </Text>
    </View>
  )
}

function AyatCard({ verse }: { verse: Verse }) {
  const translation = verse.translations?.[0]?.text ?? ''
  const cleanTranslation = translation.replace(/<[^>]*>/g, '')

  return (
    <View style={{
      backgroundColor: '#FFFFFF', borderRadius: 12,
      borderWidth: 1, borderColor: '#E8E8FF',
      padding: 16, marginBottom: 12,
    }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
      }}>
        <View style={{
          width: 30, height: 30, borderRadius: 15,
          backgroundColor: '#7C6FF1',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
            {verse.verse_number}
          </Text>
        </View>
      </View>

      <View style={{
        flexDirection: 'row', flexWrap: 'wrap',
        justifyContent: 'flex-end', gap: 6,
        marginBottom: 14,
      }}>
        {[...verse.words].reverse().map(word => (
          <WordBox key={word.id} word={word} />
        ))}
      </View>

      <View style={{ height: 1, backgroundColor: '#F0F0FF', marginBottom: 10 }} />

      <Text style={{ fontSize: 13, color: '#6B6B8A', lineHeight: 20 }}>
        {cleanTranslation}
      </Text>
    </View>
  )
}

export default function QuranReaderScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const chapterId = Number(id)

  const { data: chapters = [] } = useChapters()
  const { data: verses = [], isLoading, isError } = useSurahVerses(chapterId)

  const chapter = chapters.find(c => c.id === chapterId)

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4FF' }}>
      <View style={{
        backgroundColor: '#7C6FF1',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 34, height: 34,
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
              {chapter?.name_simple ?? `Surah ${chapterId}`}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
              Surah {chapterId} · {chapter?.verses_count ?? '?'} Ayat
            </Text>
          </View>
        </View>
      </View>

      {isLoading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#7C6FF1" size="large" />
        </View>
      )}

      {isError && (
        <Text style={{ textAlign: 'center', color: '#EF4444', padding: 32 }}>
          Gagal memuat surah. Periksa koneksi internet.
        </Text>
      )}

      {!isLoading && !isError && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {chapterId !== 9 && chapterId !== 1 && (
            <View style={{
              alignItems: 'center', paddingVertical: 16,
              marginBottom: 8,
              borderBottomWidth: 1, borderBottomColor: '#EEEEFF',
            }}>
              <Text style={{ fontSize: 22, color: '#1A1A2E' }}>
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </Text>
              <Text style={{ fontSize: 11, color: '#B0B0C8', marginTop: 6 }}>
                Bismillahirrahmanirrahim
              </Text>
            </View>
          )}

          {verses.map(verse => (
            <AyatCard key={verse.id} verse={verse} />
          ))}
        </ScrollView>
      )}
    </View>
  )
}
