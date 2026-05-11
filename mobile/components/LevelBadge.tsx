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
    <View className="bg-white rounded-2xl p-4 shadow-sm">
      <View className="flex-row justify-between items-center mb-2">
        <View>
          <Text className="text-xs text-slate-400 uppercase tracking-wide">
            Level {levelInfo.level}
          </Text>
          <Text className="font-bold text-slate-800 text-base">{levelInfo.name}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-lg">🔥</Text>
          <Text className="font-bold text-orange-500 text-base">{streak}</Text>
          <Text className="text-xs text-slate-400"> hari</Text>
        </View>
      </View>
      <View className="bg-slate-100 rounded-full h-2 overflow-hidden">
        <View
          className="bg-emerald-500 rounded-full h-2"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </View>
      <Text className="text-xs text-slate-400 mt-1">{points} poin</Text>
    </View>
  )
}
