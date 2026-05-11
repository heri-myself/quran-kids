# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 15 web admin panel that lets admin users login, manage Quran Kids stories (create, upload pages with audio/illustrations, publish), and monitor content.

**Architecture:** Next.js 15 App Router with server actions and client components. Admin authenticates via JWT (stored in httpOnly cookie). All API calls go to the Fastify backend at `NEXT_PUBLIC_API_URL`. No database access from the panel — everything goes through the backend API.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query v5, React Hook Form + Zod, js-cookie / next/headers for JWT, Vitest + React Testing Library for unit tests.

---

## Backend API Reference

The admin panel talks to the Fastify backend. Key endpoints:

```
POST   /auth/login                    → { accessToken, user }
GET    /admin/stories                 → story list (use GET /stories?limit=100 as admin sees all)
POST   /admin/stories                 → { title, slug, category, difficultyLevel, isPremium } → story
PUT    /admin/stories/:id             → partial update
DELETE /admin/stories/:id             → 204
POST   /admin/stories/:id/pages       → multipart: illustration file, audio file + text fields → page
PUT    /admin/stories/:id/publish     → sets isPublished=true
GET    /stories                       → public story list (admin uses this for preview)
GET    /stories/:slug/pages           → story pages (admin uses for preview)
```

Backend runs at `http://localhost:3000` locally (or `NEXT_PUBLIC_API_URL` env var).

---

## File Map

```
admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout, Inter font, QueryProvider
│   │   ├── page.tsx                    # Redirect to /dashboard or /login
│   │   ├── login/
│   │   │   └── page.tsx               # Login page (server component + LoginForm client)
│   │   └── dashboard/
│   │       ├── layout.tsx             # Dashboard layout: sidebar + auth guard
│   │       ├── page.tsx               # Dashboard home: story list
│   │       ├── stories/
│   │       │   ├── new/
│   │       │   │   └── page.tsx       # New story form
│   │       │   └── [id]/
│   │       │       ├── page.tsx       # Story detail: pages list + upload
│   │       │       └── preview/
│   │       │           └── page.tsx   # Story preview (read-only)
│   ├── components/
│   │   ├── login-form.tsx             # Login form (client, React Hook Form)
│   │   ├── story-list.tsx             # Story cards grid (client, TanStack Query)
│   │   ├── story-form.tsx             # Create/edit story form (client)
│   │   ├── page-upload-form.tsx       # Upload page: text fields + file inputs (client)
│   │   ├── page-list.tsx              # List of existing pages for a story (client)
│   │   └── sidebar.tsx               # Nav sidebar (client)
│   ├── lib/
│   │   ├── api.ts                     # Typed fetch wrapper, reads token from cookie
│   │   ├── auth.ts                    # setToken(), getToken(), clearToken() cookie helpers
│   │   └── query-client.ts           # TanStack Query client singleton
│   ├── hooks/
│   │   ├── use-stories.ts            # useStories(), useCreateStory(), useDeleteStory(), usePublishStory()
│   │   └── use-story-pages.ts        # useStoryPages(), useUploadPage()
│   └── middleware.ts                  # Redirect /dashboard/* to /login if no token cookie
├── .env.local.example
├── package.json
└── next.config.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `admin/package.json`
- Create: `admin/next.config.ts`
- Create: `admin/.env.local.example`
- Create: `admin/src/app/layout.tsx`
- Create: `admin/src/app/page.tsx`
- Create: `admin/src/lib/query-client.ts`

- [ ] **Step 1: Create admin directory and install deps**

```bash
mkdir admin && cd admin
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

Wait for installation, then install additional deps:

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install react-hook-form @hookform/resolvers zod
npm install js-cookie
npm install -D @types/js-cookie vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Install shadcn/ui**

```bash
npx shadcn@latest init --yes --defaults
npx shadcn@latest add button input label card badge select textarea toast sonner
```

- [ ] **Step 3: Create .env.local.example**

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Copy to `.env.local`:
```bash
cp .env.local.example .env.local
```

- [ ] **Step 4: Create src/lib/query-client.ts**

```typescript
import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}
```

- [ ] **Step 5: Create src/app/layout.tsx**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/query-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Quran Kids Admin',
  description: 'Admin panel for Quran Kids app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Create src/components/query-provider.tsx**

```typescript
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getQueryClient } from '@/lib/query-client'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 7: Create src/app/page.tsx**

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 8: Verify dev server starts**

```bash
cd admin && npm run dev
```

Open `http://localhost:4000` (will redirect to `/dashboard`, which doesn't exist yet — that's OK).

Update `package.json` to run on port 4000 to avoid conflict with backend:
```json
{
  "scripts": {
    "dev": "next dev -p 4000",
    "build": "next build",
    "start": "next start -p 4000"
  }
}
```

- [ ] **Step 9: Commit**

```bash
cd admin && git add . && git commit -m "feat: admin panel scaffold — Next.js 15 + shadcn + TanStack Query"
```

---

## Task 2: Auth — Token Helpers & Middleware

**Files:**
- Create: `admin/src/lib/auth.ts`
- Create: `admin/src/lib/api.ts`
- Create: `admin/src/middleware.ts`

- [ ] **Step 1: Create src/lib/auth.ts**

```typescript
import Cookies from 'js-cookie'

const TOKEN_KEY = 'qk_admin_token'

export function setToken(token: string) {
  Cookies.set(TOKEN_KEY, token, { expires: 7, sameSite: 'strict' })
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY)
}

export function clearToken() {
  Cookies.remove(TOKEN_KEY)
}
```

- [ ] **Step 2: Create src/lib/api.ts**

```typescript
import { getToken } from './auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error ?? res.statusText)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form }),
}
```

- [ ] **Step 3: Create src/middleware.ts**

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const TOKEN_KEY = 'qk_admin_token'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(TOKEN_KEY)?.value

  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
```

- [ ] **Step 4: Write unit tests for api.ts**

Create `src/lib/__tests__/api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError } from '../api'

// Minimal test: ApiError is a proper Error subclass
describe('ApiError', () => {
  it('has correct name and status', () => {
    const err = new ApiError(404, 'Not found')
    expect(err.name).toBe('ApiError')
    expect(err.status).toBe(404)
    expect(err.message).toBe('Not found')
    expect(err instanceof Error).toBe(true)
  })
})
```

Create `vitest.config.ts` in `admin/`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Run tests**

```bash
cd admin && npx vitest run
```

Expected: 1 passing.

- [ ] **Step 6: Commit**

```bash
git add admin/src/lib/ admin/src/middleware.ts admin/vitest.config.ts
git commit -m "feat: admin auth helpers, API client, and route middleware"
```

---

## Task 3: Login Page

**Files:**
- Create: `admin/src/app/login/page.tsx`
- Create: `admin/src/components/login-form.tsx`
- Create: `admin/src/hooks/use-auth.ts`

- [ ] **Step 1: Create src/hooks/use-auth.ts**

```typescript
'use client'

import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { setToken, clearToken } from '@/lib/auth'
import { useRouter } from 'next/navigation'

type LoginResponse = {
  accessToken: string
  user: { id: string; email: string; role: string }
}

export function useLogin() {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<LoginResponse>('/auth/login', data),
    onSuccess: (data) => {
      setToken(data.accessToken)
      router.push('/dashboard')
    },
  })
}

export function useLogout() {
  const router = useRouter()
  return () => {
    clearToken()
    router.push('/login')
  }
}
```

- [ ] **Step 2: Create src/components/login-form.tsx**

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLogin } from '@/hooks/use-auth'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Quran Kids Admin</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>
          {login.isError && (
            <p className="text-sm text-red-500">
              {login.error instanceof Error ? login.error.message : 'Login gagal'}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting || login.isPending}>
            {login.isPending ? 'Masuk...' : 'Masuk'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Create src/app/login/page.tsx**

```typescript
import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <LoginForm />
    </main>
  )
}
```

- [ ] **Step 4: Verify login page renders**

```bash
cd admin && npm run dev
```

Navigate to `http://localhost:4000/login` — should show login form with email + password fields and submit button.

- [ ] **Step 5: Commit**

```bash
git add admin/src/app/login/ admin/src/components/login-form.tsx admin/src/hooks/use-auth.ts
git commit -m "feat: login page with form validation and JWT storage"
```

---

## Task 4: Dashboard Layout & Sidebar

**Files:**
- Create: `admin/src/components/sidebar.tsx`
- Create: `admin/src/app/dashboard/layout.tsx`
- Create: `admin/src/app/dashboard/page.tsx` (stub, will be replaced in Task 5)

- [ ] **Step 1: Create src/components/sidebar.tsx**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, LayoutDashboard, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLogout } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/stories/new', label: 'Tambah Kisah', icon: BookOpen },
]

export function Sidebar() {
  const pathname = usePathname()
  const logout = useLogout()

  return (
    <aside className="w-56 min-h-screen bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        <h1 className="font-bold text-lg text-emerald-700">Quran Kids</h1>
        <p className="text-xs text-slate-500">Admin Panel</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === item.href
                ? 'bg-emerald-50 text-emerald-700 font-medium'
                : 'text-slate-600 hover:bg-slate-50',
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={logout}>
          <LogOut className="w-4 h-4" />
          Keluar
        </Button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Install lucide-react if not present**

```bash
cd admin && npm install lucide-react
```

- [ ] **Step 3: Create src/app/dashboard/layout.tsx**

```typescript
import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 4: Create src/app/dashboard/page.tsx stub**

```typescript
export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h2>
      <p className="text-slate-500">Memuat daftar kisah...</p>
    </div>
  )
}
```

- [ ] **Step 5: Verify dashboard layout**

Start dev server and login. After login should redirect to `/dashboard` showing the sidebar and stub content.

- [ ] **Step 6: Commit**

```bash
git add admin/src/app/dashboard/ admin/src/components/sidebar.tsx
git commit -m "feat: dashboard layout with sidebar navigation"
```

---

## Task 5: Story List (Dashboard Home)

**Files:**
- Create: `admin/src/hooks/use-stories.ts`
- Create: `admin/src/components/story-list.tsx`
- Replace: `admin/src/app/dashboard/page.tsx`

- [ ] **Step 1: Create src/hooks/use-stories.ts**

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type Story = {
  id: string
  title: string
  slug: string
  category: 'sahabat_nabi' | 'kisah_quran' | 'akhlaq'
  difficultyLevel: 'easy' | 'medium' | 'hard'
  isPremium: boolean
  isPublished: boolean
  totalPages: number
  coverImageUrl: string | null
  createdAt: string
  updatedAt: string
}

type StoriesResponse = {
  data: Story[]
  total: number
  page: number
  limit: number
}

export function useStories() {
  return useQuery({
    queryKey: ['stories'],
    queryFn: () => api.get<StoriesResponse>('/stories?limit=100'),
  })
}

export function useAllAdminStories() {
  // Admin needs to see unpublished stories too — fetch both published and unpublished
  // Backend GET /stories only returns isPublished=true, so we create stories via admin
  // and track them locally via invalidation after mutations
  return useQuery({
    queryKey: ['admin-stories'],
    queryFn: () => api.get<StoriesResponse>('/stories?limit=100'),
  })
}

export function useCreateStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      title: string
      slug: string
      category: string
      difficultyLevel: string
      isPremium: boolean
    }) => api.post<Story>('/admin/stories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stories'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

export function useDeleteStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/stories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stories'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

export function usePublishStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.put<Story>(`/admin/stories/${id}/publish`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stories'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}
```

- [ ] **Step 2: Create src/components/story-list.tsx**

```typescript
'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAllAdminStories, useDeleteStory, usePublishStory } from '@/hooks/use-stories'
import { BookOpen, Eye, Trash2, Globe } from 'lucide-react'

const CATEGORY_LABELS = {
  sahabat_nabi: 'Sahabat Nabi',
  kisah_quran: 'Kisah Al-Quran',
  akhlaq: 'Akhlaq',
}

const DIFFICULTY_LABELS = {
  easy: 'Mudah',
  medium: 'Sedang',
  hard: 'Sulit',
}

export function StoryList() {
  const { data, isLoading, isError } = useAllAdminStories()
  const deleteStory = useDeleteStory()
  const publishStory = usePublishStory()

  if (isLoading) return <p className="text-slate-500">Memuat kisah...</p>
  if (isError) return <p className="text-red-500">Gagal memuat daftar kisah.</p>

  const stories = data?.data ?? []

  if (stories.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Belum ada kisah. Tambah kisah pertama!</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {stories.map((story) => (
        <Card key={story.id}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-800">{story.title}</h3>
                {story.isPremium && <Badge variant="secondary">Premium</Badge>}
                {story.isPublished ? (
                  <Badge className="bg-emerald-100 text-emerald-700">Published</Badge>
                ) : (
                  <Badge variant="outline">Draft</Badge>
                )}
              </div>
              <p className="text-sm text-slate-500">
                {CATEGORY_LABELS[story.category]} · {DIFFICULTY_LABELS[story.difficultyLevel]} ·{' '}
                {story.totalPages} halaman
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/stories/${story.id}`}>
                  <BookOpen className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/stories/${story.id}/preview`}>
                  <Eye className="w-4 h-4" />
                </Link>
              </Button>
              {!story.isPublished && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => publishStory.mutate(story.id)}
                  disabled={publishStory.isPending}
                >
                  <Globe className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm(`Hapus kisah "${story.title}"?`)) {
                    deleteStory.mutate(story.id)
                  }
                }}
                disabled={deleteStory.isPending}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Replace src/app/dashboard/page.tsx**

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StoryList } from '@/components/story-list'
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Daftar Kisah</h2>
        <Button asChild>
          <Link href="/dashboard/stories/new">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Kisah
          </Link>
        </Button>
      </div>
      <StoryList />
    </div>
  )
}
```

- [ ] **Step 4: Verify dashboard story list**

Start dev server, login, and go to `/dashboard`. Should show the story list (empty state or stories from the backend).

- [ ] **Step 5: Commit**

```bash
git add admin/src/hooks/use-stories.ts admin/src/components/story-list.tsx admin/src/app/dashboard/page.tsx
git commit -m "feat: dashboard story list with publish and delete actions"
```

---

## Task 6: Create Story Form

**Files:**
- Create: `admin/src/components/story-form.tsx`
- Create: `admin/src/app/dashboard/stories/new/page.tsx`

- [ ] **Step 1: Create src/components/story-form.tsx**

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateStory } from '@/hooks/use-stories'

const storySchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  slug: z.string().min(1, 'Slug wajib diisi').regex(/^[a-z0-9-]+$/, 'Slug hanya huruf kecil, angka, dan tanda hubung'),
  category: z.enum(['sahabat_nabi', 'kisah_quran', 'akhlaq']),
  difficultyLevel: z.enum(['easy', 'medium', 'hard']),
  isPremium: z.boolean(),
})

type StoryValues = z.infer<typeof storySchema>

export function StoryForm() {
  const router = useRouter()
  const createStory = useCreateStory()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StoryValues>({
    resolver: zodResolver(storySchema),
    defaultValues: { difficultyLevel: 'easy', isPremium: false, category: 'sahabat_nabi' },
  })

  const title = watch('title')

  function onTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const slug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
    setValue('slug', slug)
  }

  async function onSubmit(data: StoryValues) {
    const story = await createStory.mutateAsync(data)
    router.push(`/dashboard/stories/${story.id}`)
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Kisah Baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Judul Kisah</Label>
            <Input
              {...register('title')}
              onChange={(e) => {
                register('title').onChange(e)
                onTitleChange(e)
              }}
              placeholder="Kisah Abu Bakar Ash-Shiddiq"
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Slug URL</Label>
            <Input {...register('slug')} placeholder="kisah-abu-bakar-ash-shiddiq" />
            {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Kategori</Label>
            <Select defaultValue="sahabat_nabi" onValueChange={(v) => setValue('category', v as StoryValues['category'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sahabat_nabi">Sahabat Nabi</SelectItem>
                <SelectItem value="kisah_quran">Kisah Al-Quran</SelectItem>
                <SelectItem value="akhlaq">Akhlaq</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Tingkat Kesulitan</Label>
            <Select defaultValue="easy" onValueChange={(v) => setValue('difficultyLevel', v as StoryValues['difficultyLevel'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Mudah</SelectItem>
                <SelectItem value="medium">Sedang</SelectItem>
                <SelectItem value="hard">Sulit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPremium"
              {...register('isPremium')}
              className="rounded"
            />
            <Label htmlFor="isPremium">Konten Premium</Label>
          </div>

          {createStory.isError && (
            <p className="text-sm text-red-500">
              {createStory.error instanceof Error ? createStory.error.message : 'Gagal membuat kisah'}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting || createStory.isPending}>
              {createStory.isPending ? 'Menyimpan...' : 'Simpan & Lanjut'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create src/app/dashboard/stories/new/page.tsx**

```typescript
import { StoryForm } from '@/components/story-form'

export default function NewStoryPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Tambah Kisah Baru</h2>
      <StoryForm />
    </div>
  )
}
```

- [ ] **Step 3: Verify create story flow**

Go to `/dashboard/stories/new`. Fill in form, submit. Should redirect to `/dashboard/stories/{id}` (which doesn't exist yet — 404 is OK for now).

- [ ] **Step 4: Commit**

```bash
git add admin/src/components/story-form.tsx admin/src/app/dashboard/stories/new/
git commit -m "feat: create story form with auto-slug generation"
```

---

## Task 7: Story Detail — Page Upload

**Files:**
- Create: `admin/src/hooks/use-story-pages.ts`
- Create: `admin/src/components/page-upload-form.tsx`
- Create: `admin/src/components/page-list.tsx`
- Create: `admin/src/app/dashboard/stories/[id]/page.tsx`

- [ ] **Step 1: Create src/hooks/use-story-pages.ts**

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type StoryPage = {
  id: string
  storyId: string
  pageNumber: number
  textArabic: string | null
  textLatin: string | null
  textTranslation: string
  illustrationUrl: string | null
  audioUrl: string | null
  durationSeconds: number | null
  createdAt: string
}

export function useStoryPages(slug: string) {
  return useQuery({
    queryKey: ['story-pages', slug],
    queryFn: () => api.get<StoryPage[]>(`/stories/${slug}/pages`),
    enabled: !!slug,
  })
}

export function useUploadPage(storyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (form: FormData) => api.upload<StoryPage>(`/admin/stories/${storyId}/pages`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-pages'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stories'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}
```

- [ ] **Step 2: Create src/components/page-list.tsx**

```typescript
'use client'

import { StoryPage } from '@/hooks/use-story-pages'
import { Badge } from '@/components/ui/badge'
import { FileAudio, Image } from 'lucide-react'

export function PageList({ pages }: { pages: StoryPage[] }) {
  if (pages.length === 0) {
    return <p className="text-slate-500 text-sm">Belum ada halaman. Upload halaman pertama di bawah.</p>
  }

  return (
    <div className="space-y-3">
      {pages.map((page) => (
        <div key={page.id} className="border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline">Halaman {page.pageNumber}</Badge>
            <div className="flex gap-2">
              {page.illustrationUrl && <Image className="w-4 h-4 text-blue-500" />}
              {page.audioUrl && <FileAudio className="w-4 h-4 text-green-500" />}
            </div>
          </div>
          {page.textArabic && (
            <p className="text-right text-lg font-arabic mb-1 text-slate-700">{page.textArabic}</p>
          )}
          {page.textLatin && (
            <p className="text-sm text-slate-500 italic mb-1">{page.textLatin}</p>
          )}
          <p className="text-sm text-slate-700">{page.textTranslation}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create src/components/page-upload-form.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUploadPage } from '@/hooks/use-story-pages'

const pageSchema = z.object({
  pageNumber: z.coerce.number().int().min(1, 'Nomor halaman minimal 1'),
  textArabic: z.string().optional(),
  textLatin: z.string().optional(),
  textTranslation: z.string().min(1, 'Terjemahan wajib diisi'),
  durationSeconds: z.coerce.number().optional(),
})

type PageValues = z.infer<typeof pageSchema>

export function PageUploadForm({
  storyId,
  nextPageNumber,
}: {
  storyId: string
  nextPageNumber: number
}) {
  const uploadPage = useUploadPage(storyId)
  const [illustrationFile, setIllustrationFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PageValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: { pageNumber: nextPageNumber },
  })

  async function onSubmit(data: PageValues) {
    const form = new FormData()
    form.append('pageNumber', String(data.pageNumber))
    form.append('textTranslation', data.textTranslation)
    if (data.textArabic) form.append('textArabic', data.textArabic)
    if (data.textLatin) form.append('textLatin', data.textLatin)
    if (data.durationSeconds) form.append('durationSeconds', String(data.durationSeconds))
    if (illustrationFile) form.append('illustration', illustrationFile)
    if (audioFile) form.append('audio', audioFile)

    await uploadPage.mutateAsync(form)
    reset({ pageNumber: nextPageNumber + 1 })
    setIllustrationFile(null)
    setAudioFile(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Halaman Baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Nomor Halaman</Label>
            <Input type="number" {...register('pageNumber')} className="w-24" />
            {errors.pageNumber && <p className="text-sm text-red-500">{errors.pageNumber.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Teks Arab (opsional)</Label>
            <Textarea {...register('textArabic')} rows={2} dir="rtl" className="text-right text-lg" placeholder="بسم الله..." />
          </div>

          <div className="space-y-1">
            <Label>Teks Latin (opsional)</Label>
            <Input {...register('textLatin')} placeholder="Bismillah..." />
          </div>

          <div className="space-y-1">
            <Label>Terjemahan Indonesia *</Label>
            <Textarea {...register('textTranslation')} rows={3} placeholder="Dengan nama Allah..." />
            {errors.textTranslation && (
              <p className="text-sm text-red-500">{errors.textTranslation.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Ilustrasi (gambar)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setIllustrationFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1">
              <Label>Audio Narasi</Label>
              <Input
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              />
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Durasi (detik, opsional)</Label>
                <Input type="number" {...register('durationSeconds')} className="w-24" placeholder="60" />
              </div>
            </div>
          </div>

          {uploadPage.isError && (
            <p className="text-sm text-red-500">
              {uploadPage.error instanceof Error ? uploadPage.error.message : 'Gagal upload halaman'}
            </p>
          )}

          <Button type="submit" disabled={uploadPage.isPending}>
            {uploadPage.isPending ? 'Mengupload...' : 'Upload Halaman'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Create src/app/dashboard/stories/[id]/page.tsx**

```typescript
'use client'

import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageList } from '@/components/page-list'
import { PageUploadForm } from '@/components/page-upload-form'
import { useAllAdminStories, usePublishStory } from '@/hooks/use-stories'
import { useStoryPages } from '@/hooks/use-story-pages'
import { Eye, Globe, ArrowLeft } from 'lucide-react'

export default function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: storiesData } = useAllAdminStories()
  const story = storiesData?.data.find((s) => s.id === id)
  const { data: pages = [] } = useStoryPages(story?.slug ?? '')
  const publishStory = usePublishStory()

  if (!story) {
    return <p className="text-slate-500">Memuat kisah...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Kembali
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800">{story.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            {story.isPublished ? (
              <Badge className="bg-emerald-100 text-emerald-700">Published</Badge>
            ) : (
              <Badge variant="outline">Draft</Badge>
            )}
            <span className="text-sm text-slate-500">{pages.length} halaman</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/stories/${id}/preview`}>
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Link>
          </Button>
          {!story.isPublished && (
            <Button
              size="sm"
              onClick={() => publishStory.mutate(id)}
              disabled={publishStory.isPending || pages.length === 0}
            >
              <Globe className="w-4 h-4 mr-1" />
              Publish
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-slate-700 mb-3">Halaman ({pages.length})</h3>
          <PageList pages={pages} />
        </div>
        <div>
          <PageUploadForm storyId={id} nextPageNumber={pages.length + 1} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify story detail page**

Create a story via the form, get redirected to `/dashboard/stories/{id}`. Should show page list (empty) and upload form.

- [ ] **Step 6: Commit**

```bash
git add admin/src/hooks/use-story-pages.ts admin/src/components/page-list.tsx admin/src/components/page-upload-form.tsx admin/src/app/dashboard/stories/
git commit -m "feat: story detail page with page list and upload form"
```

---

## Task 8: Story Preview

**Files:**
- Create: `admin/src/app/dashboard/stories/[id]/preview/page.tsx`

- [ ] **Step 1: Create preview page**

```typescript
'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Volume2 } from 'lucide-react'
import { useAllAdminStories } from '@/hooks/use-stories'
import { useStoryPages } from '@/hooks/use-story-pages'

export default function StoryPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [currentPage, setCurrentPage] = useState(0)
  const { data: storiesData } = useAllAdminStories()
  const story = storiesData?.data.find((s) => s.id === id)
  const { data: pages = [] } = useStoryPages(story?.slug ?? '')

  if (!story) return <p className="text-slate-500">Memuat...</p>

  const page = pages[currentPage]

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/stories/${id}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Kembali
          </Link>
        </Button>
        <h2 className="font-bold text-slate-800">{story.title}</h2>
      </div>

      {pages.length === 0 ? (
        <p className="text-slate-500 text-center py-12">Belum ada halaman untuk di-preview.</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {page.illustrationUrl && (
            <img
              src={page.illustrationUrl}
              alt={`Halaman ${page.pageNumber}`}
              className="w-full aspect-video object-cover"
            />
          )}
          <div className="p-6 space-y-3">
            {page.textArabic && (
              <p className="text-right text-2xl font-arabic leading-loose text-slate-800">
                {page.textArabic}
              </p>
            )}
            {page.textLatin && (
              <p className="text-sm text-slate-500 italic">{page.textLatin}</p>
            )}
            <p className="text-slate-700">{page.textTranslation}</p>
            {page.audioUrl && (
              <audio controls src={page.audioUrl} className="w-full mt-2">
                <track kind="captions" />
              </audio>
            )}
          </div>
          <div className="flex items-center justify-between px-6 pb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-500">
              {currentPage + 1} / {pages.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
              disabled={currentPage === pages.length - 1}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify preview**

Navigate to `/dashboard/stories/{id}/preview`. Should show story pages with navigation arrows.

- [ ] **Step 3: Commit**

```bash
git add admin/src/app/dashboard/stories/
git commit -m "feat: story preview with page-by-page navigation"
```

---

## Task 9: Final Polish & Build Verification

**Files:**
- Modify: `admin/next.config.ts` (allow backend image domain)

- [ ] **Step 1: Update next.config.ts for image domains**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 2: Run tests**

```bash
cd admin && npx vitest run
```

Expected: 1 passing.

- [ ] **Step 3: Run build to verify no TypeScript/compilation errors**

```bash
cd admin && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add admin/next.config.ts
git commit -m "feat: allow backend image domain in Next.js config"
```

- [ ] **Step 5: Final end-to-end check**

Manual walkthrough:
1. Go to `http://localhost:4000/login`
2. Login with `admin@qurankids.com` / `admin123456`
3. Redirected to dashboard — story list shows "Kisah Abu Bakar Ash-Shiddiq"
4. Click "Tambah Kisah" — fill form, save → redirected to story detail
5. Upload a page with text — appears in page list
6. Click Preview — see page with navigation
7. Click Publish → badge changes to "Published"
8. Click Keluar — redirected to login

- [ ] **Step 6: Final commit**

```bash
git add admin/ && git commit -m "feat: admin panel complete — login, story management, page upload, preview"
```

---

## Self-Review

**Spec coverage check:**
- Login akun admin: Task 3 (LoginForm, useLogin)
- Dashboard list semua kisah, status draft/published: Task 5 (StoryList, useAllAdminStories)
- Form upload kisah (judul, kategori, cover, premium toggle): Task 6 (StoryForm)
- Form upload per halaman (teks, ilustrasi, audio): Task 7 (PageUploadForm, useUploadPage)
- Preview kisah sebelum publish: Task 8 (preview page)
- Publish button: Task 5 (usePublishStory), Task 7 (publish button on story detail)
- Auth middleware (redirect if no token): Task 2 (middleware.ts)

**No placeholders found. All code complete.**

**Type consistency:**
- `Story` type defined in `use-stories.ts`, used in `story-list.tsx` and `[id]/page.tsx`
- `StoryPage` type defined in `use-story-pages.ts`, used in `page-list.tsx` and `[id]/page.tsx`
- `api.upload<T>()` defined in `api.ts`, used in `use-story-pages.ts`
- All consistent.
