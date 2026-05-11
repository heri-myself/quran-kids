import { getLevelInfo, getProgressToNextLevel } from '../constants/gamification'

describe('getLevelInfo', () => {
  it('returns level 1 for 0 points', () => {
    expect(getLevelInfo(0).level).toBe(1)
    expect(getLevelInfo(0).name).toBe('Santri Baru')
  })

  it('returns level 2 for 300 points', () => {
    expect(getLevelInfo(300).level).toBe(2)
  })

  it('returns level 5 for 5000 points', () => {
    expect(getLevelInfo(5000).level).toBe(5)
    expect(getLevelInfo(5000).name).toBe('Ulama Cilik')
  })
})

describe('getProgressToNextLevel', () => {
  it('returns 0 at start of level 1', () => {
    expect(getProgressToNextLevel(0)).toBe(0)
  })

  it('returns 0.5 at midpoint of level 1 (100 points)', () => {
    expect(getProgressToNextLevel(100)).toBeCloseTo(0.5)
  })

  it('returns 1 for max level', () => {
    expect(getProgressToNextLevel(5000)).toBe(1)
  })
})
