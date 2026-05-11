import { describe, it, expect, beforeEach } from 'vitest'
import { buildTestApp } from './helpers/app.js'
import { cleanDb } from './helpers/db.js'
import { prisma } from '../src/lib/prisma.js'

async function seedStory() {
  return prisma.story.create({
    data: {
      title: 'Kisah Abu Bakar',
      slug: 'kisah-abu-bakar',
      category: 'sahabat_nabi',
      isPremium: false,
      isPublished: true,
      totalPages: 1,
      pages: {
        create: [{ pageNumber: 1, textTranslation: 'Abu Bakar adalah sahabat setia...' }],
      },
    },
  })
}

describe('GET /stories', () => {
  beforeEach(async () => { await cleanDb(); await seedStory() })

  it('returns published stories', async () => {
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/stories' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].slug).toBe('kisah-abu-bakar')
    await app.close()
  })

  it('filters by category', async () => {
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/stories?category=kisah_quran' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(0)
    await app.close()
  })
})

describe('GET /stories/:slug', () => {
  beforeEach(async () => { await cleanDb(); await seedStory() })

  it('returns story detail', async () => {
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/stories/kisah-abu-bakar' })
    expect(res.statusCode).toBe(200)
    expect(res.json().slug).toBe('kisah-abu-bakar')
    await app.close()
  })

  it('returns 404 for unknown slug', async () => {
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/stories/unknown' })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})
