import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useStories } from '../../../hooks/use-stories'
import { StoryCard } from '../../../components/StoryCard'

const CATEGORIES = [
  { value: undefined, label: 'Semua' },
  { value: 'sahabat_nabi', label: 'Sahabat Nabi' },
  { value: 'kisah_quran', label: 'Al-Quran' },
  { value: 'akhlaq', label: 'Akhlaq' },
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
    <View className="flex-1 bg-amber-50">
      {/* Header */}
      <View className="bg-emerald-500 px-6 pt-14 pb-6">
        <Text className="text-white text-2xl font-bold">Daftar Kisah</Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 py-3 gap-2"
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.label}
            onPress={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-full ${
              selectedCategory === cat.value
                ? 'bg-emerald-500'
                : 'bg-white border border-slate-200'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                selectedCategory === cat.value ? 'text-white' : 'text-slate-600'
              }`}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Story List */}
      <ScrollView contentContainerClassName="px-4 pb-8 gap-3">
        {isLoading && (
          <View className="py-12 items-center">
            <ActivityIndicator color="#10b981" size="large" />
          </View>
        )}
        {isError && stories.length === 0 && (
          <Text className="text-red-500 text-center py-8">Gagal memuat kisah.</Text>
        )}
        {!isLoading && !isError && stories.length === 0 && (
          <Text className="text-slate-400 text-center py-12">Belum ada kisah di kategori ini.</Text>
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
