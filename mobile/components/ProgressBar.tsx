import { View } from 'react-native'

interface ProgressBarProps {
  current: number
  total: number
  color?: string
}

export function ProgressBar({ current, total, color = '#10b981' }: ProgressBarProps) {
  const progress = total > 0 ? current / total : 0
  return (
    <View className="h-1.5 bg-slate-200 rounded-full flex-1">
      <View
        className="h-1.5 rounded-full"
        style={{ width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }}
      />
    </View>
  )
}
