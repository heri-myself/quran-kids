import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfileStore } from '../../stores/profile-store'
import { useGamification } from '../../hooks/use-progress'
import { useStories } from '../../hooks/use-stories'
import { StoryCard } from '../../components/StoryCard'

const FEATURES = [
  {
    id: 'quran',
    label: 'Al-Quran',
    subtitle: '114 Surah',
    emoji: '📖',
    bg: '#EEF0FF',
    accent: '#7C6FF1',
    route: '/(child)/quran/' as const,
  },
  {
    id: 'hadist',
    label: 'Hadits',
    subtitle: 'Hadits Pilihan',
    emoji: '📜',
    bg: '#FFF4E6',
    accent: '#F59E0B',
    route: '/(child)/hadits/' as const,
  },
  {
    id: 'kisah',
    label: 'Kisah Teladan',
    subtitle: 'Kisah Islami',
    emoji: '⭐',
    bg: '#F0FFF4',
    accent: '#10B981',
    route: '/(child)/stories/' as const,
  },
]

export default function HomeScreen() {
  const router = useRouter()
  const { activeProfile } = useProfileStore()
  const { data: gamificationData } = useGamification(activeProfile?.id)
  const { data: storiesData, isLoading, isError } = useStories({ limit: 4 })

  const gamification = gamificationData?.gamification
  const stories = storiesData?.data ?? []
  const points = gamification?.totalPoints ?? 0
  const streak = gamification?.currentStreak ?? 0

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F4F4FF' }}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: '#7C6FF1',
          paddingHorizontal: 24,
          paddingTop: 56,
          paddingBottom: 48,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ color: '#D4D0FF', fontSize: 14, marginBottom: 2 }}>Assalamu'alaikum 👋</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800' }}>
              {activeProfile?.name ?? 'Anak Shaleh, Shalehah!'}
            </Text>
            <Text style={{ color: '#BDB8FF', fontSize: 13, marginTop: 4 }}>
              Mau belajar apa hari ini?
            </Text>
          </View>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 20 }}>🔥</Text>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>{streak}</Text>
            <Text style={{ color: '#D4D0FF', fontSize: 10 }}>streak</Text>
          </View>
        </View>

        {/* Points bar */}
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: 12,
            marginTop: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 20 }}>⭐</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
              {points} Poin
            </Text>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, height: 6, marginTop: 4 }}>
              <View
                style={{
                  backgroundColor: '#FFD166',
                  borderRadius: 4,
                  height: 6,
                  width: `${Math.min((points % 200) / 2, 100)}%`,
                }}
              />
            </View>
          </View>
          <Text style={{ color: '#D4D0FF', fontSize: 11 }}>Level {Math.floor(points / 200) + 1}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: -20 }}>
        {/* Feature Menu */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24, marginTop: 20 }}>
          {FEATURES.map((feat) => (
            <TouchableOpacity
              key={feat.id}
              onPress={() => feat.route && router.push(feat.route)}
              activeOpacity={feat.route ? 0.7 : 1}
              style={{
                flex: 1,
                backgroundColor: feat.bg,
                borderRadius: 20,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: feat.route ? feat.accent + '33' : '#E5E7EB',
                opacity: feat.route ? 1 : 0.6,
                shadowColor: feat.accent,
                shadowOpacity: 0.12,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: feat.route ? 3 : 0,
              }}
            >
              <Text style={{ fontSize: 32, marginBottom: 8 }}>{feat.emoji}</Text>
              <Text style={{ fontSize: 13, color: feat.accent, fontWeight: '800', textAlign: 'center' }}>
                {feat.label}
              </Text>
              <Text style={{ fontSize: 10, color: feat.accent + 'AA', marginTop: 3, textAlign: 'center' }}>
                {feat.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Stories */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontWeight: '700', color: '#1A1A2E', fontSize: 17 }}>Kisah Pilihan 📖</Text>
          <TouchableOpacity onPress={() => router.push('/(child)/stories/')}>
            <Text style={{ color: '#7C6FF1', fontSize: 13, fontWeight: '600' }}>Lihat semua →</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color="#7C6FF1" size="large" />
          </View>
        ) : isError ? (
          <Text style={{ color: '#94A3B8', textAlign: 'center', paddingVertical: 16 }}>
            Gagal memuat kisah.
          </Text>
        ) : stories.length === 0 ? (
          <Text style={{ color: '#94A3B8', textAlign: 'center', paddingVertical: 16 }}>
            Belum ada kisah tersedia.
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onPress={() => router.push(`/(child)/stories/${story.slug}`)}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}
