import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useProfileStore } from '../../stores/profile-store'
import { useGamification } from '../../hooks/use-progress'
import { BadgeCard } from '../../components/BadgeCard'
import { getLevelInfo, getProgressToNextLevel } from '../../constants/gamification'

function StreakCalendar({ streak }: { streak: number }) {
  const days = Array.from({ length: 7 }, (_, i) => ({
    day: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][i],
    active: i < streak,
  }))

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm">
      <Text className="font-semibold text-slate-700 mb-3">Streak 7 Hari</Text>
      <View className="flex-row justify-between">
        {days.map((day) => (
          <View key={day.day} className="items-center gap-1">
            <Text className="text-xs text-slate-400">{day.day}</Text>
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                day.active ? 'bg-orange-400' : 'bg-slate-100'
              }`}
            >
              <Text className="text-sm">{day.active ? '🔥' : ''}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

export default function RewardsScreen() {
  const { activeProfile } = useProfileStore()
  const { data, isLoading } = useGamification(activeProfile?.id)

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-amber-50">
        <ActivityIndicator color="#10b981" size="large" />
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
    <ScrollView className="flex-1 bg-amber-50" contentContainerClassName="pb-10">
      {/* Header */}
      <View className="bg-amber-400 px-6 pt-14 pb-8 rounded-b-3xl">
        <Text className="text-white text-2xl font-bold">Hadiahku 🏆</Text>
      </View>

      <View className="px-4 gap-4 -mt-4">
        {/* Points & Level */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <View>
              <Text className="text-slate-400 text-xs">Level {levelInfo.level}</Text>
              <Text className="text-xl font-bold text-slate-800">{levelInfo.name}</Text>
            </View>
            <View className="items-end">
              <Text className="text-2xl font-bold text-emerald-600">{points}</Text>
              <Text className="text-xs text-slate-400">poin</Text>
            </View>
          </View>
          <View className="bg-slate-100 rounded-full h-3 mb-1">
            <View
              className="bg-emerald-500 rounded-full h-3"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </View>
          {levelInfo.maxPoints !== Infinity && (
            <Text className="text-xs text-slate-400">
              {points} / {levelInfo.maxPoints} poin ke level berikutnya
            </Text>
          )}
        </View>

        {/* Streak Calendar */}
        <StreakCalendar streak={Math.min(gamification?.currentStreak ?? 0, 7)} />

        {/* Badges */}
        <Text className="font-bold text-slate-800 text-lg">Koleksi Badge</Text>
        <View className="flex-row flex-wrap gap-3">
          {allBadges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              earned={earnedIds.has(badge.id)}
            />
          ))}
          {allBadges.length === 0 && (
            <Text className="text-slate-400 text-sm">Belum ada badge tersedia.</Text>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
