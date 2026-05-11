export const POINTS = {
  STORY_COMPLETED: 50,
  DAILY_STREAK: 20,
  THREE_STORIES_BONUS: 30,
}

export interface LevelInfo {
  level: number
  name: string
  minPoints: number
  maxPoints: number
}

export const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Santri Baru', minPoints: 0, maxPoints: 200 },
  { level: 2, name: 'Pencari Ilmu', minPoints: 201, maxPoints: 500 },
  { level: 3, name: 'Hafizh Muda', minPoints: 501, maxPoints: 1000 },
  { level: 4, name: 'Sahabat Sejati', minPoints: 1001, maxPoints: 2000 },
  { level: 5, name: 'Ulama Cilik', minPoints: 2001, maxPoints: Infinity },
]

export function getLevelInfo(points: number): LevelInfo {
  return LEVELS.find((l) => points >= l.minPoints && points <= l.maxPoints) ?? LEVELS[0]
}

export function getProgressToNextLevel(points: number): number {
  const current = getLevelInfo(points)
  if (current.maxPoints === Infinity) return 1
  const range = current.maxPoints - current.minPoints
  const progress = points - current.minPoints
  return Math.min(progress / range, 1)
}
