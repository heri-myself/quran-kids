export const POINTS = {
  STORY_COMPLETED: 50,
  DAILY_STREAK: 20,
  THREE_STORIES_BONUS: 30,
}

export interface LevelInfo {
  level: number
  name: string
  title: string
  icon: string
  minPoints: number
  maxPoints: number
}

export const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Santri Baru',    title: 'Santri Baru',    icon: '🌱', minPoints: 0,    maxPoints: 200 },
  { level: 2, name: 'Pencari Ilmu',   title: 'Pencari Ilmu',   icon: '📖', minPoints: 200,  maxPoints: 500 },
  { level: 3, name: 'Hafizh Muda',    title: 'Hafizh Muda',    icon: '🌟', minPoints: 500,  maxPoints: 1000 },
  { level: 4, name: 'Sahabat Sejati', title: 'Sahabat Sejati', icon: '🏅', minPoints: 1000, maxPoints: 2000 },
  { level: 5, name: 'Ulama Cilik',    title: 'Ulama Cilik',    icon: '👑', minPoints: 2000, maxPoints: Infinity },
]

export function getLevelInfo(points: number): LevelInfo {
  // Use exclusive upper bound (< maxPoints), except the last level
  const level = [...LEVELS].reverse().find((l) => points >= l.minPoints)
  return level ?? LEVELS[0]
}

export function getProgressToNextLevel(points: number): number {
  const current = getLevelInfo(points)
  if (current.maxPoints === Infinity) return 1
  const range = current.maxPoints - current.minPoints
  const progress = points - current.minPoints
  return Math.min(progress / range, 1)
}
