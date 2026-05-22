import { useState } from 'react'
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Text } from '../../../components/Text'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useStories } from '../../../hooks/use-stories'
import { StoryCard } from '../../../components/StoryCard'

const CATEGORIES = [
  { value: undefined, label: 'Semua', emoji: '✨' },
  { value: 'sahabat_nabi', label: 'Sahabat Nabi', emoji: '⭐' },
  { value: 'kisah_quran', label: 'Al-Quran', emoji: '📜' },
  { value: 'akhlaq', label: 'Akhlaq', emoji: '💜' },
]

export default function StoryListScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ category?: string }>()
  const initialCategory = Array.isArray(params.category) ? params.category[0] : params.category
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(initialCategory)

  const { data, isLoading, isError } = useStories(
    selectedCategory ? { category: selectedCategory } : undefined,
  )

  const stories = data?.data ?? []

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4FF' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#7C6FF1',
          paddingHorizontal: 24,
          paddingTop: 56,
          paddingBottom: 24,
        }}
      >
        <Text style={{ color: '#D4D0FF', fontSize: 13, marginBottom: 4 }}>Perpustakaan</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800' }}>Daftar Kisah 📚</Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14, gap: 8 }}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.value
          return (
            <TouchableOpacity
              key={cat.label}
              onPress={() => setSelectedCategory(cat.value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: active ? '#7C6FF1' : '#FFFFFF',
                shadowColor: '#7C6FF1',
                shadowOpacity: active ? 0.25 : 0.06,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: active ? 4 : 1,
              }}
            >
              <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: active ? '#FFFFFF' : '#6B6B8A',
                }}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Story List */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <ActivityIndicator color="#7C6FF1" size="large" />
          </View>
        )}
        {isError && stories.length === 0 && (
          <Text style={{ color: '#EF4444', textAlign: 'center', paddingVertical: 32 }}>
            Gagal memuat kisah.
          </Text>
        )}
        {!isLoading && !isError && stories.length === 0 && (
          <Text style={{ color: '#94A3B8', textAlign: 'center', paddingVertical: 48 }}>
            Belum ada kisah di kategori ini.
          </Text>
        )}
        {stories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            onPress={() => router.push(`/(child)/stories/${story.slug}`)}
          />
        ))}
      </ScrollView>
    </View>
  )
}
