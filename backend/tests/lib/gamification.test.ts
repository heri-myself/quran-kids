import { describe, it, expect } from 'vitest'
import { getLevelFromPoints, isNewDay, isConsecutiveDay } from '../../src/lib/gamification.js'

describe('getLevelFromPoints', () => {
  it('returns level 1 for 0 points', () => {
    expect(getLevelFromPoints(0)).toBe(1)
  })

  it('returns level 2 for 201 points', () => {
    expect(getLevelFromPoints(201)).toBe(2)
  })

  it('returns level 5 for 9999 points', () => {
    expect(getLevelFromPoints(9999)).toBe(5)
  })
})

describe('isNewDay', () => {
  it('returns true if lastReadAt is null', () => {
    expect(isNewDay(null)).toBe(true)
  })

  it('returns false if lastReadAt is today', () => {
    expect(isNewDay(new Date())).toBe(false)
  })
})
