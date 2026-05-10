import { describe, it, expect, beforeEach } from 'vitest'
import { buildTestApp } from './helpers/app.js'
import { cleanDb } from './helpers/db.js'

describe('POST /auth/register', () => {
  beforeEach(cleanDb)

  it('creates a user and returns tokens', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'parent@test.com', password: 'password123', name: 'Ahmad' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.accessToken).toBeDefined()
    expect(body.user.email).toBe('parent@test.com')
    await app.close()
  })

  it('rejects duplicate email', async () => {
    const app = buildTestApp()
    const payload = { email: 'parent@test.com', password: 'password123', name: 'Ahmad' }
    await app.inject({ method: 'POST', url: '/auth/register', payload })
    const res = await app.inject({ method: 'POST', url: '/auth/register', payload })
    expect(res.statusCode).toBe(409)
    await app.close()
  })
})

describe('POST /auth/login', () => {
  beforeEach(cleanDb)

  it('returns tokens for valid credentials', async () => {
    const app = buildTestApp()
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'parent@test.com', password: 'password123', name: 'Ahmad' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'parent@test.com', password: 'password123' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().accessToken).toBeDefined()
    await app.close()
  })

  it('rejects wrong password', async () => {
    const app = buildTestApp()
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'parent@test.com', password: 'password123', name: 'Ahmad' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'parent@test.com', password: 'wrongpassword' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})
