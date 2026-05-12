import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useProfileStore } from '../../stores/profile-store'
import { useGamification } from '../../hooks/use-progress'
import { BadgeCard } from '../../components/BadgeCard'
import { getLevelInfo, getProgressToNextLevel } from '../../constants/gamification'

function StreakCalendar({ streak }: { streak: number }) {
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#7C6FF1',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}
    >
      <Text style={{ fontWeight: '700', color: '#1A1A2E', fontSize: 15, marginBottom: 12 }}>
        Streak 7 Hari 🔥
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {days.map((day, i) => {
          const active = i < streak
          return (
            <View key={day} style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11, color: '#6B6B8A' }}>{day}</Text>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: active ? '#7C6FF1' : '#F0F0FA',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 16 }}>{active ? '🔥' : ''}</Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default function RewardsScreen() {
  const { activeProfile } = useProfileStore()
  const { data, isLoading, isError } = useGamification(activeProfile?.id)

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4FF' }}>
        <ActivityIndicator color="#7C6FF1" size="large" />
      </View>
    )
  }

  if (isError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4FF' }}>
        <Text style={{ color: '#EF4444', textAlign: 'center', paddingHorizontal: 24 }}>
          Gagal memuat data hadiah. Silakan coba lagi.
        </Text>
      </View>
    )
  }

  const gamification = data?.gamification
  const earnedBadges = data?.badges ?? []
  const allBadges = data?.allBadges ?? []
  const points = gamification?.totalPoints ?? 0
  const levelInfo = getLevelInfo(points)
  const progress = getProgressToNextLevel(points)
  const earnedIds = new Set(earnedBadges.map((b) => b.id))

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F4F4FF' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: '#7C6FF1',
          paddingHorizontal: 24,
          paddingTop: 56,
          paddingBottom: 32,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <Text style={{ color: '#D4D0FF', fontSize: 13 }}>Pencapaianku</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 2 }}>Hadiahku 🏆</Text>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 16 }}>
        {/* Points & Level */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 16,
            shadowColor: '#7C6FF1',
            shadowOpacity: 0.08,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 3 },
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ color: '#6B6B8A', fontSize: 12 }}>Level {levelInfo.level}</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A2E' }}>{levelInfo.name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#7C6FF1' }}>{points}</Text>
              <Text style={{ fontSize: 12, color: '#6B6B8A' }}>poin</Text>
            </View>
          </View>
          <View style={{ backgroundColor: '#EEF0FF', borderRadius: 8, height: 10, marginBottom: 6 }}>
            <View
              style={{
                backgroundColor: '#7C6FF1',
                borderRadius: 8,
                height: 10,
                width: `${Math.round(progress * 100)}%`,
              }}
            />
          </View>
          {levelInfo.maxPoints !== Infinity && (
            <Text style={{ fontSize: 12, color: '#6B6B8A' }}>
              {points} / {levelInfo.maxPoints} poin ke level berikutnya
            </Text>
          )}
        </View>

        {/* Streak Calendar */}
        <StreakCalendar streak={Math.min(gamification?.currentStreak ?? 0, 7)} />

        {/* Badges */}
        <Text style={{ fontWeight: '700', color: '#1A1A2E', fontSize: 17 }}>Koleksi Badge 🎖️</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {allBadges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} earned={earnedIds.has(badge.id)} />
          ))}
          {allBadges.length === 0 && (
            <Text style={{ color: '#94A3B8', fontSize: 14 }}>Belum ada badge tersedia.</Text>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
