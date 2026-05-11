import { describe, it, expect, beforeEach } from 'vitest'
import { buildTestApp } from './helpers/app.js'
import { cleanDb } from './helpers/db.js'
import { prisma } from '../src/lib/prisma.js'

async function setup() {
  const app = buildTestApp()
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'parent@test.com', password: 'password123', name: 'Ahmad' },
  })
  const token = res.json().accessToken as string
  const userId = res.json().user.id as string

  const profile = await prisma.profile.create({
    data: { userId, name: 'Umar', role: 'child' },
  })
  await prisma.gamification.create({ data: { profileId: profile.id } })
  const story = await prisma.story.create({
    data: { title: 'Test', slug: 'test', category: 'akhlaq', isPublished: true, totalPages: 5 },
  })
  return { app, token, profile, story }
}

describe('POST /progress', () => {
  beforeEach(cleanDb)

  it('saves reading progress', async () => {
    const { app, token, profile, story } = await setup()
    const res = await app.inject({
      method: 'POST',
      url: '/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { profileId: profile.id, storyId: story.id, lastPage: 3, isCompleted: false },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().lastPage).toBe(3)
    await app.close()
  })

  it('awards points when story completed', async () => {
    const { app, token, profile, story } = await setup()
    await app.inject({
      method: 'POST',
      url: '/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { profileId: profile.id, storyId: story.id, lastPage: 5, isCompleted: true },
    })
    const gamification = await prisma.gamification.findUnique({ where: { profileId: profile.id } })
    expect(gamification!.totalPoints).toBeGreaterThanOrEqual(50)
    await app.close()
  })
})
