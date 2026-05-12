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
      style={{
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        backgroundColor: earned ? '#EEF0FF' : '#F6F6FA',
        borderWidth: 1.5,
        borderColor: earned ? '#A89DF5' : '#E8E8F0',
        width: '30%',
        opacity: earned ? 1 : 0.5,
      }}
    >
      <Text style={{ fontSize: 28 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          textAlign: 'center',
          marginTop: 6,
          color: earned ? '#5B52D4' : '#6B6B8A',
        }}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
      {earned && badge.earnedAt && (
        <Text style={{ fontSize: 10, color: '#7C6FF1', marginTop: 2, fontWeight: '700' }}>
          ✓ Dapat!
        </Text>
      )}
    </View>
  )
}
