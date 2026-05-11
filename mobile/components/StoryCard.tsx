import { View, Text, TouchableOpacity, Image } from 'react-native'
import { Story } from '../services/stories'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000'

const CATEGORY_LABELS: Record<Story['category'], string> = {
  sahabat_nabi: 'Sahabat Nabi',
  kisah_quran: 'Kisah Al-Quran',
  akhlaq: 'Akhlaq',
}

interface StoryCardProps {
  story: Story
  onPress: () => void
}

export function StoryCard({ story, onPress }: StoryCardProps) {
  const coverUrl = story.coverImageUrl ? `${BASE_URL}${story.coverImageUrl}` : null

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden shadow-sm flex-row"
      accessibilityLabel={`Baca kisah ${story.title}`}
    >
      <View className="w-20 h-20 bg-emerald-100 items-center justify-center flex-shrink-0">
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={{ width: 80, height: 80 }}
            resizeMode="cover"
          />
        ) : (
          <Text className="text-3xl">📖</Text>
        )}
      </View>
      <View className="flex-1 px-3 py-2 justify-center">
        <View className="flex-row items-center gap-2 mb-1">
          {story.isPremium && (
            <View className="bg-violet-100 px-2 py-0.5 rounded-full">
              <Text className="text-violet-700 text-xs font-semibold">PREMIUM</Text>
            </View>
          )}
          <Text className="text-xs text-slate-400">{CATEGORY_LABELS[story.category]}</Text>
        </View>
        <Text className="font-semibold text-slate-800" numberOfLines={2}>
          {story.title}
        </Text>
        <Text className="text-xs text-slate-400 mt-1">{story.totalPages} halaman</Text>
      </View>
    </TouchableOpacity>
  )
}
