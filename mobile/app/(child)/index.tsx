import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfileStore } from '../../stores/profile-store'
import { useGamification } from '../../hooks/use-progress'
import { useStories } from '../../hooks/use-stories'
import { LevelBadge } from '../../components/LevelBadge'
import { StoryCard } from '../../components/StoryCard'

const CATEGORIES = [
  { value: 'sahabat_nabi', label: 'Sahabat Nabi', emoji: '⭐' },
  { value: 'kisah_quran', label: 'Al-Quran', emoji: '📜' },
  { value: 'akhlaq', label: 'Akhlaq', emoji: '💚' },
]

export default function HomeScreen() {
  const router = useRouter()
  const { activeProfile } = useProfileStore()
  const { data: gamificationData } = useGamification(activeProfile?.id)
  const { data: storiesData, isLoading } = useStories()

  const gamification = gamificationData?.gamification
  const stories = storiesData?.data?.slice(0, 4) ?? []

  return (
    <ScrollView
      className="flex-1 bg-amber-50"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Header */}
      <View className="bg-emerald-500 px-6 pt-14 pb-8 rounded-b-3xl">
        <Text className="text-emerald-100 text-sm">Assalamu'alaikum,</Text>
        <Text className="text-white text-2xl font-bold">
          {activeProfile?.name ?? 'Kawan'} 👋
        </Text>
      </View>

      <View className="px-4 -mt-4 gap-4">
        {/* Level Badge */}
        {gamification && (
          <LevelBadge
            points={gamification.totalPoints}
            streak={gamification.currentStreak}
          />
        )}

        {/* Categories */}
        <Text className="font-bold text-slate-800 text-lg mt-2">Kategori Kisah</Text>
        <View className="flex-row gap-3">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              onPress={() =>
                router.push({
                  pathname: '/(child)/stories/',
                  params: { category: cat.value },
                })
              }
              className="flex-1 bg-white rounded-2xl p-3 items-center shadow-sm"
              accessibilityLabel={`Lihat kisah ${cat.label}`}
            >
              <Text className="text-2xl">{cat.emoji}</Text>
              <Text className="text-xs text-slate-600 mt-1 text-center">{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Stories */}
        <Text className="font-bold text-slate-800 text-lg">Kisah Pilihan</Text>
        {isLoading ? (
          <ActivityIndicator color="#10b981" />
        ) : (
          <View className="gap-3">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onPress={() => router.push(`/(child)/stories/${story.slug}`)}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.push('/(child)/stories/')}
          className="items-center py-2"
          accessibilityLabel="Lihat semua kisah"
        >
          <Text className="text-emerald-600 font-semibold">Lihat semua kisah →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
