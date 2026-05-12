import { View, Text } from 'react-native'
import { getLevelInfo, getProgressToNextLevel } from '../constants/gamification'

interface LevelBadgeProps {
  points: number
  streak: number
}

export function LevelBadge({ points, streak }: LevelBadgeProps) {
  const levelInfo = getLevelInfo(points)
  const progress = getProgressToNextLevel(points)

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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View>
          <Text style={{ fontSize: 11, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: 1 }}>
            Level {levelInfo.level}
          </Text>
          <Text style={{ fontWeight: '700', color: '#1A1A2E', fontSize: 16 }}>{levelInfo.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 18 }}>🔥</Text>
          <Text style={{ fontWeight: '800', color: '#FF6B6B', fontSize: 18 }}>{streak}</Text>
          <Text style={{ fontSize: 12, color: '#6B6B8A' }}>hari</Text>
        </View>
      </View>
      <View style={{ backgroundColor: '#EEF0FF', borderRadius: 8, height: 8, overflow: 'hidden' }}>
        <View
          style={{
            backgroundColor: '#7C6FF1',
            borderRadius: 8,
            height: 8,
            width: `${Math.round(progress * 100)}%`,
          }}
        />
      </View>
      <Text style={{ fontSize: 12, color: '#6B6B8A', marginTop: 6 }}>{points} poin</Text>
    </View>
  )
}
