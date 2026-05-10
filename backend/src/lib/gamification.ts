export const LEVEL_THRESHOLDS = [
  { level: 1, name: 'Santri Baru', min: 0, max: 200 },
  { level: 2, name: 'Pencari Ilmu', min: 201, max: 500 },
  { level: 3, name: 'Hafizh Muda', min: 501, max: 1000 },
  { level: 4, name: 'Sahabat Sejati', min: 1001, max: 2000 },
  { level: 5, name: 'Ulama Cilik', min: 2001, max: Infinity },
]

export const POINTS = {
  STORY_COMPLETE: 50,
  DAILY_STREAK: 20,
  THREE_STORIES_IN_DAY: 30,
}

export function getLevelFromPoints(points: number): number {
  const level = [...LEVEL_THRESHOLDS].reverse().find((t) => points >= t.min)
  return level?.level ?? 1
}

export function isNewDay(lastReadAt: Date | null): boolean {
  if (!lastReadAt) return true
  const last = new Date(lastReadAt)
  const now = new Date()
  return (
    last.getFullYear() !== now.getFullYear() ||
    last.getMonth() !== now.getMonth() ||
    last.getDate() !== now.getDate()
  )
}

export function isConsecutiveDay(lastReadAt: Date | null): boolean {
  if (!lastReadAt) return false
  const last = new Date(lastReadAt)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return (
    last.getFullYear() === yesterday.getFullYear() &&
    last.getMonth() === yesterday.getMonth() &&
    last.getDate() === yesterday.getDate()
  )
}
