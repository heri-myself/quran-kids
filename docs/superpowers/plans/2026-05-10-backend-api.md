# Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready REST API with Fastify + PostgreSQL + Prisma that powers the Quran Kids app — handling auth, stories, gamification, subscriptions, and file uploads.

**Architecture:** Fastify v5 with TypeScript, Prisma ORM connected to PostgreSQL 16, JWT-based auth with role separation (parent/child/admin). Files (audio, images) stored on disk and served as static assets. All endpoints validate input with Zod.

**Tech Stack:** Node.js 22, Fastify v5, Prisma ORM, PostgreSQL 16, JWT, Zod, Vitest, @fastify/multipart, @fastify/static, @fastify/jwt, Midtrans Node SDK.

---

## File Map

```
backend/
├── src/
│   ├── app.ts                        # Fastify instance, plugin registration
│   ├── server.ts                     # Entry point, listen
│   ├── config.ts                     # Env vars (typed)
│   ├── plugins/
│   │   ├── jwt.ts                    # @fastify/jwt registration
│   │   ├── multipart.ts              # @fastify/multipart registration
│   │   └── static.ts                 # @fastify/static registration
│   ├── hooks/
│   │   └── authenticate.ts           # JWT preHandler hook (role-aware)
│   ├── routes/
│   │   ├── auth.ts                   # POST /auth/register, /login, /refresh
│   │   ├── profiles.ts               # CRUD /profiles
│   │   ├── stories.ts                # GET /stories, /stories/:slug, /stories/:slug/pages
│   │   ├── progress.ts               # POST /progress, GET /gamification/:profileId
│   │   ├── subscription.ts           # GET /subscription, POST /subscription/activate
│   │   └── admin/
│   │       └── stories.ts            # Admin CRUD + file upload
│   ├── schemas/
│   │   ├── auth.schema.ts            # Zod schemas for auth routes
│   │   ├── profile.schema.ts
│   │   ├── story.schema.ts
│   │   ├── progress.schema.ts
│   │   └── subscription.schema.ts
│   └── lib/
│       ├── prisma.ts                 # Prisma client singleton
│       ├── password.ts               # bcrypt hash/verify
│       ├── gamification.ts           # points/level/streak logic
│       └── midtrans.ts               # Midtrans client wrapper
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                       # Seed sample stories + admin user
├── uploads/                          # Runtime: audio + image files
├── tests/
│   ├── helpers/
│   │   ├── app.ts                    # Build test app instance
│   │   └── db.ts                     # Reset DB between tests
│   ├── auth.test.ts
│   ├── profiles.test.ts
│   ├── stories.test.ts
│   ├── progress.test.ts
│   └── admin.test.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Task 1: Project Setup

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `backend/src/config.ts`

- [ ] **Step 1: Scaffold project**

```bash
mkdir backend && cd backend
npm init -y
npm install fastify @fastify/jwt @fastify/multipart @fastify/static @fastify/cors
npm install @prisma/client zod bcryptjs jsonwebtoken
npm install midtrans-client
npm install -D typescript tsx vitest @types/node @types/bcryptjs prisma
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests", "prisma/seed.ts"]
}
```

- [ ] **Step 3: Create .env.example**

```env
DATABASE_URL="postgresql://user:password@localhost:5432/quran_kids"
JWT_SECRET="change-me-to-a-long-random-string"
JWT_REFRESH_SECRET="another-long-random-string"
PORT=3000
UPLOAD_DIR="./uploads"
BASE_URL="http://localhost:3000"
MIDTRANS_SERVER_KEY="your-midtrans-server-key"
MIDTRANS_CLIENT_KEY="your-midtrans-client-key"
MIDTRANS_IS_PRODUCTION=false
```

- [ ] **Step 4: Create src/config.ts**

```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  PORT: z.coerce.number().default(3000),
  UPLOAD_DIR: z.string().default('./uploads'),
  BASE_URL: z.string().default('http://localhost:3000'),
  MIDTRANS_SERVER_KEY: z.string(),
  MIDTRANS_CLIENT_KEY: z.string(),
  MIDTRANS_IS_PRODUCTION: z.coerce.boolean().default(false),
})

export const config = envSchema.parse(process.env)
```

- [ ] **Step 5: Update package.json scripts**

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  },
  "type": "module"
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: backend project scaffold"
```

---

## Task 2: Database Schema

**Files:**
- Create: `backend/prisma/schema.prisma`

- [ ] **Step 1: Init Prisma**

```bash
cd backend && npx prisma init
```

- [ ] **Step 2: Write schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  parent
  child
  admin
}

enum Category {
  sahabat_nabi
  kisah_quran
  akhlaq
}

enum Difficulty {
  easy
  medium
  hard
}

enum SubscriptionPlan {
  monthly
  yearly
}

enum SubscriptionStatus {
  active
  expired
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  role         Role      @default(parent)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  profiles     Profile[]
  subscription Subscription?
}

model Profile {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  avatar          String    @default("avatar_1")
  age             Int?
  role            Role      @default(child)
  parentId        String?
  parent          Profile?  @relation("ParentChild", fields: [parentId], references: [id])
  children        Profile[] @relation("ParentChild")
  gamification    Gamification?
  readingProgress ReadingProgress[]
  userBadges      UserBadge[]
  createdAt       DateTime  @default(now())
}

model Story {
  id             String        @id @default(cuid())
  title          String
  slug           String        @unique
  category       Category
  difficultyLevel Difficulty   @default(easy)
  isPremium      Boolean       @default(false)
  coverImageUrl  String?
  totalPages     Int           @default(0)
  isPublished    Boolean       @default(false)
  createdAt      DateTime      @default(now())
  pages          StoryPage[]
  readingProgress ReadingProgress[]
}

model StoryPage {
  id              String   @id @default(cuid())
  storyId         String
  story           Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  pageNumber      Int
  textArabic      String?
  textLatin       String?
  textTranslation String
  illustrationUrl String?
  audioUrl        String?
  durationSeconds Int?
  createdAt       DateTime @default(now())

  @@unique([storyId, pageNumber])
}

model Gamification {
  id            String   @id @default(cuid())
  profileId     String   @unique
  profile       Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  totalPoints   Int      @default(0)
  currentLevel  Int      @default(1)
  currentStreak Int      @default(0)
  lastReadAt    DateTime?
  updatedAt     DateTime @updatedAt
}

model Badge {
  id               String      @id @default(cuid())
  name             String      @unique
  description      String
  iconUrl          String?
  requirementType  String
  requirementValue Int
  userBadges       UserBadge[]
}

model UserBadge {
  id        String   @id @default(cuid())
  profileId String
  profile   Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  badgeId   String
  badge     Badge    @relation(fields: [badgeId], references: [id])
  earnedAt  DateTime @default(now())

  @@unique([profileId, badgeId])
}

model ReadingProgress {
  id          String    @id @default(cuid())
  profileId   String
  profile     Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)
  storyId     String
  story       Story     @relation(fields: [storyId], references: [id], onDelete: Cascade)
  lastPage    Int       @default(1)
  isCompleted Boolean   @default(false)
  completedAt DateTime?
  updatedAt   DateTime  @updatedAt

  @@unique([profileId, storyId])
}

model Subscription {
  id        String             @id @default(cuid())
  userId    String             @unique
  user      User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan      SubscriptionPlan
  status    SubscriptionStatus @default(active)
  startedAt DateTime           @default(now())
  expiresAt DateTime
  createdAt DateTime           @default(now())
}
```

- [ ] **Step 3: Run migration**

```bash
cp .env.example .env
# Edit .env with real DATABASE_URL
npx prisma migrate dev --name init
npx prisma generate
```

Expected: Migration created and applied, Prisma client generated.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: prisma schema with all models"
```

---

## Task 3: Prisma Client & Core Libs

**Files:**
- Create: `backend/src/lib/prisma.ts`
- Create: `backend/src/lib/password.ts`
- Create: `backend/src/lib/gamification.ts`

- [ ] **Step 1: Create src/lib/prisma.ts**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Create src/lib/password.ts**

```typescript
import bcrypt from 'bcryptjs'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

- [ ] **Step 3: Create src/lib/gamification.ts**

```typescript
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
  const level = LEVEL_THRESHOLDS.findLast((t) => points >= t.min)
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
```

- [ ] **Step 4: Write unit tests for gamification.ts**

Create `tests/lib/gamification.test.ts`:

```typescript
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
```

- [ ] **Step 5: Run tests**

```bash
cd backend && npm test tests/lib/gamification.test.ts
```

Expected: 4 passing tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ tests/lib/
git commit -m "feat: core libs — prisma, password, gamification"
```

---

## Task 4: Fastify App & Plugins

**Files:**
- Create: `backend/src/plugins/jwt.ts`
- Create: `backend/src/plugins/multipart.ts`
- Create: `backend/src/plugins/static.ts`
- Create: `backend/src/hooks/authenticate.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/server.ts`
- Create: `backend/tests/helpers/app.ts`

- [ ] **Step 1: Create src/plugins/jwt.ts**

```typescript
import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { config } from '../config.js'

export default fp(async (app) => {
  app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
  })
})
```

- [ ] **Step 2: Create src/plugins/multipart.ts**

```typescript
import fp from 'fastify-plugin'
import fastifyMultipart from '@fastify/multipart'

export default fp(async (app) => {
  app.register(fastifyMultipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  })
})
```

- [ ] **Step 3: Create src/plugins/static.ts**

```typescript
import fp from 'fastify-plugin'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { config } from '../config.js'

export default fp(async (app) => {
  app.register(fastifyStatic, {
    root: path.resolve(config.UPLOAD_DIR),
    prefix: '/uploads/',
  })
})
```

- [ ] **Step 4: Create src/hooks/authenticate.ts**

```typescript
import { FastifyRequest, FastifyReply } from 'fastify'

export type JwtPayload = {
  userId: string
  role: string
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply)
  const payload = request.user as JwtPayload
  if (payload.role !== 'admin') {
    reply.code(403).send({ error: 'Forbidden' })
  }
}
```

- [ ] **Step 5: Create src/app.ts**

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwtPlugin from './plugins/jwt.js'
import multipartPlugin from './plugins/multipart.js'
import staticPlugin from './plugins/static.js'
import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profiles.js'
import storyRoutes from './routes/stories.js'
import progressRoutes from './routes/progress.js'
import subscriptionRoutes from './routes/subscription.js'
import adminStoryRoutes from './routes/admin/stories.js'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: true })
  app.register(jwtPlugin)
  app.register(multipartPlugin)
  app.register(staticPlugin)

  app.register(authRoutes, { prefix: '/auth' })
  app.register(profileRoutes, { prefix: '/profiles' })
  app.register(storyRoutes, { prefix: '/stories' })
  app.register(progressRoutes)
  app.register(subscriptionRoutes, { prefix: '/subscription' })
  app.register(adminStoryRoutes, { prefix: '/admin' })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
```

- [ ] **Step 6: Create src/server.ts**

```typescript
import { buildApp } from './app.js'
import { config } from './config.js'
import fs from 'fs'

fs.mkdirSync(config.UPLOAD_DIR, { recursive: true })

const app = buildApp()

app.listen({ port: config.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
```

- [ ] **Step 7: Create tests/helpers/app.ts**

```typescript
import { buildApp } from '../../src/app.js'

export function buildTestApp() {
  return buildApp()
}
```

- [ ] **Step 8: Install missing deps**

```bash
npm install fastify-plugin @fastify/cors
```

- [ ] **Step 9: Commit**

```bash
git add src/ tests/helpers/app.ts
git commit -m "feat: fastify app with plugins and hooks"
```

---

## Task 5: Auth Routes

**Files:**
- Create: `backend/src/schemas/auth.schema.ts`
- Create: `backend/src/routes/auth.ts`
- Create: `backend/tests/auth.test.ts`
- Create: `backend/tests/helpers/db.ts`

- [ ] **Step 1: Create tests/helpers/db.ts**

```typescript
import { prisma } from '../../src/lib/prisma.js'

export async function cleanDb() {
  await prisma.subscription.deleteMany()
  await prisma.userBadge.deleteMany()
  await prisma.readingProgress.deleteMany()
  await prisma.gamification.deleteMany()
  await prisma.profile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.storyPage.deleteMany()
  await prisma.story.deleteMany()
  await prisma.badge.deleteMany()
}
```

- [ ] **Step 2: Create src/schemas/auth.schema.ts**

```typescript
import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
```

- [ ] **Step 3: Write failing auth tests**

Create `tests/auth.test.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests — expect FAIL**

```bash
npm test tests/auth.test.ts
```

Expected: FAIL — routes not defined yet.

- [ ] **Step 5: Create src/routes/auth.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { registerSchema, loginSchema } from '../schemas/auth.schema.js'

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const existing = await prisma.user.findUnique({ where: { email: body.data.email } })
    if (existing) return reply.code(409).send({ error: 'Email already registered' })

    const passwordHash = await hashPassword(body.data.password)
    const user = await prisma.user.create({
      data: { email: body.data.email, passwordHash },
    })

    await prisma.profile.create({
      data: { userId: user.id, name: body.data.name, role: 'parent' },
    })

    const accessToken = app.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: '7d' })

    return reply.code(201).send({
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    })
  })

  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const user = await prisma.user.findUnique({ where: { email: body.data.email } })
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' })

    const valid = await verifyPassword(body.data.password, user.passwordHash)
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })

    const accessToken = app.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: '7d' })

    return reply.send({
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    })
  })

  app.post('/refresh', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as { userId: string; role: string }
    const accessToken = app.jwt.sign(
      { userId: payload.userId, role: payload.role },
      { expiresIn: '7d' },
    )
    return reply.send({ accessToken })
  })
}

export default authRoutes
```

- [ ] **Step 6: Add authenticate decorator to app.ts**

In `src/app.ts`, add after plugin registrations:

```typescript
app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
})
```

Also add imports at top of app.ts:
```typescript
import { FastifyRequest, FastifyReply } from 'fastify'
```

- [ ] **Step 7: Run tests — expect PASS**

```bash
npm test tests/auth.test.ts
```

Expected: 4 passing.

- [ ] **Step 8: Commit**

```bash
git add src/routes/auth.ts src/schemas/auth.schema.ts tests/auth.test.ts tests/helpers/db.ts
git commit -m "feat: auth routes — register, login, refresh"
```

---

## Task 6: Profiles Routes

**Files:**
- Create: `backend/src/schemas/profile.schema.ts`
- Create: `backend/src/routes/profiles.ts`
- Create: `backend/tests/profiles.test.ts`

- [ ] **Step 1: Create src/schemas/profile.schema.ts**

```typescript
import { z } from 'zod'

export const createProfileSchema = z.object({
  name: z.string().min(1),
  avatar: z.string().optional(),
  age: z.number().int().min(1).max(18).optional(),
})

export const updateProfileSchema = createProfileSchema.partial()

export type CreateProfileInput = z.infer<typeof createProfileSchema>
```

- [ ] **Step 2: Write failing tests**

Create `tests/profiles.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
npm test tests/profiles.test.ts
```

- [ ] **Step 4: Create src/routes/profiles.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { createProfileSchema, updateProfileSchema } from '../schemas/profile.schema.js'
import { authenticate, JwtPayload } from '../hooks/authenticate.js'

const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user as JwtPayload
    const profiles = await prisma.profile.findMany({
      where: { userId },
      include: { gamification: true },
    })
    return reply.send(profiles)
  })

  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user as JwtPayload
    const body = createProfileSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const parentProfile = await prisma.profile.findFirst({
      where: { userId, role: 'parent' },
    })

    const profile = await prisma.profile.create({
      data: {
        userId,
        name: body.data.name,
        avatar: body.data.avatar ?? 'avatar_1',
        age: body.data.age,
        role: 'child',
        parentId: parentProfile?.id,
      },
    })

    await prisma.gamification.create({
      data: { profileId: profile.id },
    })

    return reply.code(201).send(profile)
  })

  app.put('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const body = updateProfileSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const existing = await prisma.profile.findFirst({ where: { id, userId } })
    if (!existing) return reply.code(404).send({ error: 'Profile not found' })

    const profile = await prisma.profile.update({ where: { id }, data: body.data })
    return reply.send(profile)
  })

  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user as JwtPayload
    const { id } = request.params as { id: string }

    const existing = await prisma.profile.findFirst({ where: { id, userId, role: 'child' } })
    if (!existing) return reply.code(404).send({ error: 'Profile not found' })

    await prisma.profile.delete({ where: { id } })
    return reply.code(204).send()
  })
}

export default profileRoutes
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test tests/profiles.test.ts
```

Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add src/routes/profiles.ts src/schemas/profile.schema.ts tests/profiles.test.ts
git commit -m "feat: profiles CRUD routes"
```

---

## Task 7: Stories Routes

**Files:**
- Create: `backend/src/schemas/story.schema.ts`
- Create: `backend/src/routes/stories.ts`
- Create: `backend/tests/stories.test.ts`

- [ ] **Step 1: Create src/schemas/story.schema.ts**

```typescript
import { z } from 'zod'

export const storyFilterSchema = z.object({
  category: z.enum(['sahabat_nabi', 'kisah_quran', 'akhlaq']).optional(),
  premium: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
})

export const createStorySchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  category: z.enum(['sahabat_nabi', 'kisah_quran', 'akhlaq']),
  difficultyLevel: z.enum(['easy', 'medium', 'hard']).default('easy'),
  isPremium: z.boolean().default(false),
})

export const createPageSchema = z.object({
  pageNumber: z.number().int().min(1),
  textArabic: z.string().optional(),
  textLatin: z.string().optional(),
  textTranslation: z.string().min(1),
  durationSeconds: z.number().optional(),
})
```

- [ ] **Step 2: Write failing tests**

Create `tests/stories.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
npm test tests/stories.test.ts
```

- [ ] **Step 4: Create src/routes/stories.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { storyFilterSchema } from '../schemas/story.schema.js'

const storyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const query = storyFilterSchema.safeParse(request.query)
    if (!query.success) return reply.code(400).send({ error: query.error.flatten() })

    const { category, premium, page, limit } = query.data
    const skip = (page - 1) * limit

    const where = {
      isPublished: true,
      ...(category && { category }),
      ...(premium !== undefined && { isPremium: premium === 'true' }),
    }

    const [data, total] = await Promise.all([
      prisma.story.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.story.count({ where }),
    ])

    return reply.send({ data, total, page, limit })
  })

  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const story = await prisma.story.findUnique({
      where: { slug, isPublished: true },
    })
    if (!story) return reply.code(404).send({ error: 'Story not found' })
    return reply.send(story)
  })

  app.get('/:slug/pages', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const story = await prisma.story.findUnique({
      where: { slug, isPublished: true },
      include: { pages: { orderBy: { pageNumber: 'asc' } } },
    })
    if (!story) return reply.code(404).send({ error: 'Story not found' })
    return reply.send(story.pages)
  })
}

export default storyRoutes
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test tests/stories.test.ts
```

Expected: 4 passing.

- [ ] **Step 6: Commit**

```bash
git add src/routes/stories.ts src/schemas/story.schema.ts tests/stories.test.ts
git commit -m "feat: stories list, detail, and pages routes"
```

---

## Task 8: Progress & Gamification Routes

**Files:**
- Create: `backend/src/schemas/progress.schema.ts`
- Create: `backend/src/routes/progress.ts`
- Create: `backend/tests/progress.test.ts`

- [ ] **Step 1: Create src/schemas/progress.schema.ts**

```typescript
import { z } from 'zod'

export const updateProgressSchema = z.object({
  profileId: z.string(),
  storyId: z.string(),
  lastPage: z.number().int().min(1),
  isCompleted: z.boolean().default(false),
})
```

- [ ] **Step 2: Write failing tests**

Create `tests/progress.test.ts`:

```typescript
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
  const profile = await prisma.profile.create({
    data: { userId: res.json().user.id, name: 'Umar', role: 'child' },
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
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
npm test tests/progress.test.ts
```

- [ ] **Step 4: Create src/routes/progress.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { updateProgressSchema } from '../schemas/progress.schema.js'
import { authenticate, JwtPayload } from '../hooks/authenticate.js'
import {
  POINTS,
  getLevelFromPoints,
  isNewDay,
  isConsecutiveDay,
} from '../lib/gamification.js'

const progressRoutes: FastifyPluginAsync = async (app) => {
  app.post('/progress', { preHandler: [authenticate] }, async (request, reply) => {
    const body = updateProgressSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { profileId, storyId, lastPage, isCompleted } = body.data

    const progress = await prisma.readingProgress.upsert({
      where: { profileId_storyId: { profileId, storyId } },
      create: { profileId, storyId, lastPage, isCompleted },
      update: {
        lastPage,
        isCompleted,
        ...(isCompleted && { completedAt: new Date() }),
      },
    })

    if (isCompleted) {
      const gamification = await prisma.gamification.findUnique({ where: { profileId } })
      if (gamification) {
        let pointsToAdd = POINTS.STORY_COMPLETE
        let newStreak = gamification.currentStreak

        if (isNewDay(gamification.lastReadAt)) {
          if (isConsecutiveDay(gamification.lastReadAt)) {
            newStreak += 1
            pointsToAdd += POINTS.DAILY_STREAK
          } else {
            newStreak = 1
          }
        }

        const newTotal = gamification.totalPoints + pointsToAdd
        await prisma.gamification.update({
          where: { profileId },
          data: {
            totalPoints: newTotal,
            currentLevel: getLevelFromPoints(newTotal),
            currentStreak: newStreak,
            lastReadAt: new Date(),
          },
        })

        await checkAndAwardBadges(profileId, newTotal, newStreak)
      }
    }

    return reply.send(progress)
  })

  app.get('/gamification/:profileId', { preHandler: [authenticate] }, async (request, reply) => {
    const { profileId } = request.params as { profileId: string }
    const gamification = await prisma.gamification.findUnique({
      where: { profileId },
      include: { profile: { include: { userBadges: { include: { badge: true } } } } },
    })
    if (!gamification) return reply.code(404).send({ error: 'Not found' })
    return reply.send(gamification)
  })
}

async function checkAndAwardBadges(profileId: string, totalPoints: number, streak: number) {
  const completedCount = await prisma.readingProgress.count({
    where: { profileId, isCompleted: true },
  })

  const badges = await prisma.badge.findMany()

  for (const badge of badges) {
    const alreadyHas = await prisma.userBadge.findUnique({
      where: { profileId_badgeId: { profileId, badgeId: badge.id } },
    })
    if (alreadyHas) continue

    let earned = false
    if (badge.requirementType === 'stories_completed' && completedCount >= badge.requirementValue) earned = true
    if (badge.requirementType === 'streak_days' && streak >= badge.requirementValue) earned = true
    if (badge.requirementType === 'points' && totalPoints >= badge.requirementValue) earned = true

    if (earned) {
      await prisma.userBadge.create({ data: { profileId, badgeId: badge.id } })
    }
  }
}

export default progressRoutes
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test tests/progress.test.ts
```

Expected: 2 passing.

- [ ] **Step 6: Commit**

```bash
git add src/routes/progress.ts src/schemas/progress.schema.ts tests/progress.test.ts
git commit -m "feat: reading progress and gamification routes"
```

---

## Task 9: Subscription Route

**Files:**
- Create: `backend/src/lib/midtrans.ts`
- Create: `backend/src/schemas/subscription.schema.ts`
- Create: `backend/src/routes/subscription.ts`

- [ ] **Step 1: Create src/lib/midtrans.ts**

```typescript
import Midtrans from 'midtrans-client'
import { config } from '../config.js'

export const snap = new Midtrans.Snap({
  isProduction: config.MIDTRANS_IS_PRODUCTION,
  serverKey: config.MIDTRANS_SERVER_KEY,
  clientKey: config.MIDTRANS_CLIENT_KEY,
})

export const coreApi = new Midtrans.CoreApi({
  isProduction: config.MIDTRANS_IS_PRODUCTION,
  serverKey: config.MIDTRANS_SERVER_KEY,
  clientKey: config.MIDTRANS_CLIENT_KEY,
})
```

- [ ] **Step 2: Create src/schemas/subscription.schema.ts**

```typescript
import { z } from 'zod'

export const activateSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
})

export const midtransWebhookSchema = z.object({
  order_id: z.string(),
  transaction_status: z.string(),
  fraud_status: z.string().optional(),
})
```

- [ ] **Step 3: Create src/routes/subscription.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate, JwtPayload } from '../hooks/authenticate.js'
import { activateSchema, midtransWebhookSchema } from '../schemas/subscription.schema.js'
import { snap } from '../lib/midtrans.js'

const PLAN_PRICES = {
  monthly: { amount: 29000, durationDays: 30 },
  yearly: { amount: 249000, durationDays: 365 },
}

const subscriptionRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user as JwtPayload
    const subscription = await prisma.subscription.findUnique({ where: { userId } })
    return reply.send(subscription ?? { status: 'none' })
  })

  app.post('/checkout', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user as JwtPayload
    const body = activateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.code(404).send({ error: 'User not found' })

    const { amount } = PLAN_PRICES[body.data.plan]
    const orderId = `QK-${userId}-${Date.now()}`

    const transaction = await snap.createTransaction({
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: { email: user.email },
      metadata: { userId, plan: body.data.plan },
    })

    return reply.send({ snapToken: transaction.token, redirectUrl: transaction.redirect_url })
  })

  // Midtrans webhook
  app.post('/activate', async (request, reply) => {
    const body = midtransWebhookSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid webhook' })

    const { order_id, transaction_status, fraud_status } = body.data

    const isSuccess =
      transaction_status === 'capture' && fraud_status === 'accept' ||
      transaction_status === 'settlement'

    if (!isSuccess) return reply.send({ received: true })

    const parts = order_id.split('-')
    const userId = parts[1]
    const planRaw = (request.body as Record<string, string>).metadata?.plan ?? 'monthly'
    const plan = planRaw as 'monthly' | 'yearly'

    const { durationDays } = PLAN_PRICES[plan]
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + durationDays)

    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan, status: 'active', expiresAt },
      update: { plan, status: 'active', expiresAt, startedAt: new Date() },
    })

    return reply.send({ received: true })
  })
}

export default subscriptionRoutes
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/subscription.ts src/schemas/subscription.schema.ts src/lib/midtrans.ts
git commit -m "feat: subscription routes with Midtrans checkout and webhook"
```

---

## Task 10: Admin Stories Routes (File Upload)

**Files:**
- Create: `backend/src/routes/admin/stories.ts`
- Create: `backend/tests/admin.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/admin.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { buildTestApp } from './helpers/app.js'
import { cleanDb } from './helpers/db.js'
import { prisma } from '../src/lib/prisma.js'
import { hashPassword } from '../src/lib/password.js'

async function createAdmin() {
  const app = buildTestApp()
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

  it('rejects non-admin', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/admin/stories',
      headers: { authorization: `Bearer invalid` },
      payload: { title: 'X', slug: 'x', category: 'akhlaq' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test tests/admin.test.ts
```

- [ ] **Step 3: Create src/routes/admin/stories.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { requireAdmin } from '../../hooks/authenticate.js'
import { createStorySchema, createPageSchema } from '../../schemas/story.schema.js'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import { config } from '../../config.js'
import { randomUUID } from 'crypto'

const adminStoryRoutes: FastifyPluginAsync = async (app) => {
  app.post('/stories', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = createStorySchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const story = await prisma.story.create({ data: body.data })
    return reply.code(201).send(story)
  })

  app.put('/stories/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createStorySchema.partial().safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const story = await prisma.story.update({ where: { id }, data: body.data })
    return reply.send(story)
  })

  app.delete('/stories/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.story.delete({ where: { id } })
    return reply.code(204).send()
  })

  // Upload page with optional audio + illustration files
  app.post('/stories/:id/pages', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parts = request.parts()

    const fields: Record<string, string> = {}
    let illustrationUrl: string | undefined
    let audioUrl: string | undefined

    for await (const part of parts) {
      if (part.type === 'file') {
        const ext = path.extname(part.filename)
        const filename = `${randomUUID()}${ext}`
        const dest = path.join(config.UPLOAD_DIR, filename)
        await pipeline(part.file, fs.createWriteStream(dest))
        const url = `${config.BASE_URL}/uploads/${filename}`
        if (part.fieldname === 'illustration') illustrationUrl = url
        if (part.fieldname === 'audio') audioUrl = url
      } else {
        fields[part.fieldname] = part.value as string
      }
    }

    const pageData = createPageSchema.safeParse({
      ...fields,
      pageNumber: Number(fields.pageNumber),
      durationSeconds: fields.durationSeconds ? Number(fields.durationSeconds) : undefined,
    })
    if (!pageData.success) return reply.code(400).send({ error: pageData.error.flatten() })

    const page = await prisma.storyPage.create({
      data: { storyId: id, ...pageData.data, illustrationUrl, audioUrl },
    })

    await prisma.story.update({
      where: { id },
      data: { totalPages: { increment: 1 } },
    })

    return reply.code(201).send(page)
  })

  app.put('/stories/:id/publish', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const story = await prisma.story.update({ where: { id }, data: { isPublished: true } })
    return reply.send(story)
  })
}

export default adminStoryRoutes
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test tests/admin.test.ts
```

Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin/ tests/admin.test.ts
git commit -m "feat: admin routes for story and page management with file upload"
```

---

## Task 11: Database Seed

**Files:**
- Create: `backend/prisma/seed.ts`

- [ ] **Step 1: Create prisma/seed.ts**

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@qurankids.com' },
    update: {},
    create: {
      email: 'admin@qurankids.com',
      passwordHash: await bcrypt.hash('admin123456', 12),
      role: 'admin',
    },
  })

  // Badges
  const badges = [
    { name: 'Pembaca Perdana', description: 'Selesaikan kisah pertamamu', requirementType: 'stories_completed', requirementValue: 1 },
    { name: 'Api Semangat', description: 'Streak 7 hari berturut-turut', requirementType: 'streak_days', requirementValue: 7 },
    { name: 'Pencari Ilmu', description: 'Kumpulkan 500 poin', requirementType: 'points', requirementValue: 500 },
    { name: 'Khatam Perdana', description: 'Selesaikan 10 kisah', requirementType: 'stories_completed', requirementValue: 10 },
  ]

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge,
    })
  }

  // Sample story
  await prisma.story.upsert({
    where: { slug: 'kisah-abu-bakar-ash-shiddiq' },
    update: {},
    create: {
      title: 'Kisah Abu Bakar Ash-Shiddiq',
      slug: 'kisah-abu-bakar-ash-shiddiq',
      category: 'sahabat_nabi',
      difficultyLevel: 'easy',
      isPremium: false,
      isPublished: true,
      totalPages: 2,
      pages: {
        create: [
          {
            pageNumber: 1,
            textArabic: 'أبو بكر الصديق رضي الله عنه',
            textLatin: 'Abu Bakr Ash-Shiddiq radhiyallahu anhu',
            textTranslation: 'Abu Bakar Ash-Shiddiq adalah sahabat terdekat Rasulullah SAW dan orang pertama yang masuk Islam dari kalangan orang dewasa.',
          },
          {
            pageNumber: 2,
            textTranslation: 'Beliau dikenal sebagai Ash-Shiddiq, yang artinya "Yang Membenarkan", karena beliau selalu membenarkan apa yang disampaikan Rasulullah SAW.',
          },
        ],
      },
    },
  })

  console.log('Seed complete')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run seed**

```bash
npm run db:seed
```

Expected: "Seed complete" printed.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: database seed with admin user, badges, and sample story"
```

---

## Task 12: VPS Deployment

**Files:**
- Create: `backend/ecosystem.config.cjs`
- Create: `backend/nginx.conf` (template)

- [ ] **Step 1: Create ecosystem.config.cjs for PM2**

```javascript
module.exports = {
  apps: [
    {
      name: 'quran-kids-api',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
```

- [ ] **Step 2: Create nginx.conf template**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
```

- [ ] **Step 3: Deploy to VPS**

```bash
# On VPS:
git clone <repo> && cd backend
cp .env.example .env && nano .env   # fill in real values
npm install
npx prisma migrate deploy
npm run db:seed
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# Setup nginx:
sudo cp nginx.conf /etc/nginx/sites-available/quran-kids-api
sudo ln -s /etc/nginx/sites-available/quran-kids-api /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.yourdomain.com
sudo nginx -t && sudo systemctl reload nginx
```

- [ ] **Step 4: Verify health endpoint**

```bash
curl https://api.yourdomain.com/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Commit**

```bash
git add ecosystem.config.cjs nginx.conf
git commit -m "feat: PM2 and nginx config for VPS deployment"
```

---

## Self-Review

**Spec coverage check:**
- Auth (register/login/refresh): Task 5
- Profiles CRUD: Task 6
- Stories list/detail/pages: Task 7
- Progress + gamification: Task 8
- Subscription + Midtrans: Task 9
- Admin upload: Task 10
- Seed data: Task 11
- VPS deployment: Task 12

**All spec requirements covered. No placeholders. Types consistent across tasks.**
