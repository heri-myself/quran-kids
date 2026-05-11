import { describe, it, expect, beforeEach } from 'vitest'
import { buildTestApp } from './helpers/app.js'
import { cleanDb } from './helpers/db.js'
import { prisma } from '../src/lib/prisma.js'
import { hashPassword } from '../src/lib/password.js'

async function createAdmin() {
  const app = buildTestApp()
  await app.ready()
  const user = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      passwordHash: await hashPassword('admin1234'),
      role: 'admin',
    },
  })
  const token = app.jwt.sign({ userId: user.id, role: 'admin' })
  return { app, token }
}

describe('POST /admin/stories', () => {
  beforeEach(cleanDb)

  it('creates a story as admin', async () => {
    const { app, token } = await createAdmin()
    const res = await app.inject({
      method: 'POST',
      url: '/admin/stories',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: 'Kisah Umar',
        slug: 'kisah-umar',
        category: 'sahabat_nabi',
        isPremium: false,
      },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().slug).toBe('kisah-umar')
    await app.close()
  })

  it('rejects non-admin (no token)', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/admin/stories',
      payload: { title: 'X', slug: 'x', category: 'akhlaq' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})
