import { describe, it, expect, beforeEach } from 'vitest'
import { buildTestApp } from './helpers/app.js'
import { cleanDb } from './helpers/db.js'

async function registerAndGetToken(app: ReturnType<typeof buildTestApp>) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email: 'parent@test.com', password: 'password123', name: 'Ahmad' },
  })
  return res.json().accessToken as string
}

describe('GET /profiles', () => {
  beforeEach(cleanDb)

  it('returns profiles for authenticated user', async () => {
    const app = buildTestApp()
    const token = await registerAndGetToken(app)
    const res = await app.inject({
      method: 'GET',
      url: '/profiles',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toBeInstanceOf(Array)
    await app.close()
  })

  it('returns 401 without token', async () => {
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/profiles' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('POST /profiles', () => {
  beforeEach(cleanDb)

  it('creates a child profile', async () => {
    const app = buildTestApp()
    const token = await registerAndGetToken(app)
    const res = await app.inject({
      method: 'POST',
      url: '/profiles',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Umar', avatar: 'avatar_2', age: 7 },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().name).toBe('Umar')
    await app.close()
  })
})
