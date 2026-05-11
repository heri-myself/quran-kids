import { View, Text } from 'react-native'
import { Badge } from '../services/progress'

interface BadgeCardProps {
  badge: Badge
  earned: boolean
}

const BADGE_EMOJIS: Record<string, string> = {
  stories_completed: '📚',
  streak_days: '🔥',
  points: '⭐',
}

export function BadgeCard({ badge, earned }: BadgeCardProps) {
  const emoji = BADGE_EMOJIS[badge.requirementType] ?? '🏅'

  return (
    <View
      className={`items-center p-3 rounded-2xl ${
        earned ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-100'
      }`}
      style={{ width: '30%' }}
    >
      <Text className={`text-3xl ${earned ? '' : 'opacity-30'}`}>{emoji}</Text>
      <Text
        className={`text-xs font-semibold text-center mt-1 ${
          earned ? 'text-slate-700' : 'text-slate-400'
        }`}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
      {earned && badge.earnedAt && (
        <Text className="text-xs text-amber-500 mt-0.5">✓ Dapat!</Text>
      )}
    </View>
  )
}
