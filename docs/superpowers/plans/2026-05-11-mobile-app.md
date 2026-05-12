# Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React Native + Expo mobile app for children to read Quran-based stories with audio, gamification (points/levels/badges/streaks), and a parent mode with subscription support.

**Architecture:** Expo Router v4 for file-based navigation with three route groups: `(auth)` for login/register/profile selection, `(child)` for the kids experience (tabs), and `(parent)` for PIN-protected parent mode. Zustand manages auth and active profile state. TanStack Query fetches and caches all backend data. All API calls go to the Fastify backend at `EXPO_PUBLIC_API_URL`.

**Tech Stack:** React Native + Expo SDK 52, Expo Router v4, NativeWind v4 (Tailwind CSS), Zustand v4, TanStack Query v5, Expo AV (audio), React Native Reanimated 3, Expo Secure Store (token storage), Jest + @testing-library/react-native.

---

## Backend API Reference

```
POST /auth/register      → { accessToken, refreshToken, user }
POST /auth/login         → { accessToken, refreshToken, user }
POST /auth/refresh       → { accessToken }

GET    /profiles         → Profile[]
POST   /profiles         → Profile
PUT    /profiles/:id     → Profile
DELETE /profiles/:id     → 204

GET  /stories            → { data: Story[], total, page, limit }
GET  /stories/:slug      → Story
GET  /stories/:slug/pages → StoryPage[]

POST /progress           → { gamification, newBadges }
GET  /gamification/:profileId → Gamification & badges

GET  /subscription       → Subscription | null
POST /subscription/checkout → { snapToken, redirectUrl }
```

Backend runs at `http://10.0.2.2:3000` on Android emulator (or `EXPO_PUBLIC_API_URL` env var).

---

## File Map

```
mobile/
├── app/
│   ├── _layout.tsx                     # Root layout: auth redirect, QueryProvider
│   ├── (auth)/
│   │   ├── _layout.tsx                 # Auth stack layout
│   │   ├── login.tsx                   # Email + password login
│   │   ├── register.tsx                # Register new account
│   │   └── profiles.tsx               # Profile selection (after login)
│   ├── (child)/
│   │   ├── _layout.tsx                 # Child tab navigator
│   │   ├── index.tsx                   # Home: greeting, streak, level, stories
│   │   ├── stories/
│   │   │   ├── index.tsx              # Story list with category filter
│   │   │   └── [slug].tsx             # Story reader: pages, audio, progress
│   │   └── rewards.tsx                # Badges, points, streak calendar
│   └── (parent)/
│       ├── _layout.tsx                 # Parent stack, PIN gate
│       ├── index.tsx                   # Parent dashboard
│       ├── profiles.tsx               # Manage child profiles
│       └── subscription.tsx           # Subscription status + upgrade
├── components/
│   ├── StoryCard.tsx                   # Story grid card
│   ├── ProfileCard.tsx                 # Circular avatar + name card
│   ├── BadgeCard.tsx                   # Badge icon + name + lock state
│   ├── AudioPlayer.tsx                 # Play/pause button using Expo AV
│   ├── ProgressBar.tsx                 # Thin horizontal progress bar
│   └── LevelBadge.tsx                  # Current level chip with XP bar
├── stores/
│   ├── auth-store.ts                   # accessToken, user, login/logout actions
│   └── profile-store.ts               # activeProfile, setActiveProfile
├── services/
│   ├── api.ts                          # Base fetch wrapper with auth headers
│   ├── auth.ts                         # register, login, refresh API calls
│   ├── stories.ts                      # getStories, getStory, getStoryPages
│   ├── progress.ts                     # postProgress, getGamification
│   └── subscription.ts                # getSubscription, createCheckout
├── hooks/
│   ├── use-auth.ts                     # useLogin, useRegister, useLogout mutations
│   ├── use-stories.ts                  # useStories, useStory, useStoryPages
│   ├── use-progress.ts                # useGamification, usePostProgress
│   └── use-subscription.ts            # useSubscription, useCreateCheckout
├── constants/
│   ├── colors.ts                       # Brand color palette
│   └── gamification.ts                # LEVELS array, POINTS, getLevelInfo()
├── global.css                          # NativeWind Tailwind directives
├── tailwind.config.js
├── babel.config.js
├── metro.config.js
└── app.json
```

---

## Task 1: Project Scaffold & NativeWind Setup

**Files:**
- Create: `mobile/` (entire project)
- Create: `mobile/tailwind.config.js`
- Create: `mobile/global.css`
- Create: `mobile/constants/colors.ts`
- Create: `mobile/constants/gamification.ts`

- [ ] **Step 1: Create Expo project**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids"
npx create-expo-app@latest mobile --template blank-typescript
cd mobile
```

- [ ] **Step 2: Install all dependencies**

```bash
npx expo install expo-router expo-secure-store expo-av expo-font expo-splash-screen
npm install nativewind@^4.0.0 tailwindcss@^3.4.0
npm install zustand@^4.5.0
npm install @tanstack/react-query@^5.0.0
npm install react-native-reanimated@~3.16.0
npx expo install @shopify/flash-list
npm install -D jest @types/jest jest-expo @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 3: Configure NativeWind — `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#10b981',
        primaryDark: '#059669',
        secondary: '#f59e0b',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Create `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Update `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}
```

- [ ] **Step 6: Update `metro.config.js`**

```js
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

module.exports = withNativeWind(config, { input: './global.css' })
```

- [ ] **Step 7: Update `app.json` to enable Expo Router**

Open `app.json` and ensure the `expo` object contains:
```json
{
  "expo": {
    "scheme": "quran-kids",
    "web": { "bundler": "metro" },
    "plugins": ["expo-router"]
  }
}
```

- [ ] **Step 8: Create `mobile/.env.local`**

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

- [ ] **Step 9: Create `constants/colors.ts`**

```typescript
export const Colors = {
  primary: '#10b981',
  primaryDark: '#059669',
  secondary: '#f59e0b',
  background: '#fef9f0',
  card: '#ffffff',
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
  premium: '#7c3aed',
  error: '#ef4444',
  streak: '#f97316',
}
```

- [ ] **Step 10: Create `constants/gamification.ts`**

```typescript
export const POINTS = {
  STORY_COMPLETED: 50,
  DAILY_STREAK: 20,
  THREE_STORIES_BONUS: 30,
}

export interface LevelInfo {
  level: number
  name: string
  minPoints: number
  maxPoints: number
}

export const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Santri Baru', minPoints: 0, maxPoints: 200 },
  { level: 2, name: 'Pencari Ilmu', minPoints: 201, maxPoints: 500 },
  { level: 3, name: 'Hafizh Muda', minPoints: 501, maxPoints: 1000 },
  { level: 4, name: 'Sahabat Sejati', minPoints: 1001, maxPoints: 2000 },
  { level: 5, name: 'Ulama Cilik', minPoints: 2001, maxPoints: Infinity },
]

export function getLevelInfo(points: number): LevelInfo {
  return LEVELS.find((l) => points >= l.minPoints && points <= l.maxPoints) ?? LEVELS[0]
}

export function getProgressToNextLevel(points: number): number {
  const current = getLevelInfo(points)
  if (current.maxPoints === Infinity) return 1
  const range = current.maxPoints - current.minPoints
  const progress = points - current.minPoints
  return Math.min(progress / range, 1)
}
```

- [ ] **Step 11: Configure Jest — add to `package.json`**

Add this to `package.json`:
```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|@tanstack)"
    ]
  }
}
```

- [ ] **Step 12: Write a basic sanity test**

Create `__tests__/gamification.test.ts`:

```typescript
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
  it('returns 0 at start of level', () => {
    expect(getProgressToNextLevel(0)).toBe(0)
  })

  it('returns 0.5 at midpoint of level 1 (100 points)', () => {
    expect(getProgressToNextLevel(100)).toBeCloseTo(0.5)
  })

  it('returns 1 for max level', () => {
    expect(getProgressToNextLevel(5000)).toBe(1)
  })
})
```

- [ ] **Step 13: Run tests**

```bash
cd mobile && npx jest
```

Expected: 5 tests passing.

- [ ] **Step 14: Commit**

```bash
git add mobile/
git commit -m "feat: mobile app scaffold — Expo SDK 52 + NativeWind + Zustand + TanStack Query"
```

---

## Task 2: API Client & Auth Store

**Files:**
- Create: `mobile/services/api.ts`
- Create: `mobile/services/auth.ts`
- Create: `mobile/stores/auth-store.ts`
- Test: `mobile/__tests__/auth-store.test.ts`

- [ ] **Step 1: Create `services/api.ts`**

```typescript
import * as SecureStore from 'expo-secure-store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000'
const TOKEN_KEY = 'qk_access_token'
const REFRESH_KEY = 'qk_refresh_token'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function storeTokens(accessToken: string, refreshToken?: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken)
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken)
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await SecureStore.deleteItemAsync(REFRESH_KEY)
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getStoredToken()
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
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => apiRequest<void>(path, { method: 'DELETE' }),
}
```

- [ ] **Step 2: Create `services/auth.ts`**

```typescript
import { api } from './api'

export interface User {
  id: string
  email: string
  role: 'parent' | 'admin'
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export function loginApi(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login', { email, password })
}

export function registerApi(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/register', { email, password })
}

export function refreshApi(refreshToken: string): Promise<{ accessToken: string }> {
  return api.post<{ accessToken: string }>('/auth/refresh', { refreshToken })
}
```

- [ ] **Step 3: Create `stores/auth-store.ts`**

```typescript
import { create } from 'zustand'
import { storeTokens, clearTokens } from '../services/api'
import { User } from '../services/auth'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  setAuth: async (user, accessToken, refreshToken) => {
    await storeTokens(accessToken, refreshToken)
    set({ user, isAuthenticated: true })
  },

  logout: async () => {
    await clearTokens()
    set({ user: null, isAuthenticated: false })
  },
}))
```

- [ ] **Step 4: Write tests for auth store**

Create `__tests__/auth-store.test.ts`:

```typescript
import { useAuthStore } from '../stores/auth-store'

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

const mockUser = { id: '1', email: 'test@test.com', role: 'parent' as const }

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('starts unauthenticated', () => {
    const { isAuthenticated, user } = useAuthStore.getState()
    expect(isAuthenticated).toBe(false)
    expect(user).toBeNull()
  })

  it('sets auth state on login', async () => {
    await useAuthStore.getState().setAuth(mockUser, 'access-token', 'refresh-token')
    const { isAuthenticated, user } = useAuthStore.getState()
    expect(isAuthenticated).toBe(true)
    expect(user?.email).toBe('test@test.com')
  })

  it('clears auth state on logout', async () => {
    await useAuthStore.getState().setAuth(mockUser, 'access-token', 'refresh-token')
    await useAuthStore.getState().logout()
    const { isAuthenticated, user } = useAuthStore.getState()
    expect(isAuthenticated).toBe(false)
    expect(user).toBeNull()
  })
})
```

- [ ] **Step 5: Run tests**

```bash
cd mobile && npx jest __tests__/auth-store.test.ts
```

Expected: 3 tests passing.

- [ ] **Step 6: Commit**

```bash
git add mobile/services/ mobile/stores/auth-store.ts mobile/__tests__/auth-store.test.ts
git commit -m "feat: API client, auth service, and auth Zustand store"
```

---

## Task 3: Auth Screens (Login + Register + Root Layout)

**Files:**
- Create: `mobile/app/_layout.tsx`
- Create: `mobile/app/(auth)/_layout.tsx`
- Create: `mobile/app/(auth)/login.tsx`
- Create: `mobile/app/(auth)/register.tsx`

- [ ] **Step 1: Create `hooks/use-auth.ts`**

```typescript
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { loginApi, registerApi } from '../services/auth'
import { useAuthStore } from '../stores/auth-store'

export function useLogin() {
  const { setAuth } = useAuthStore()
  const router = useRouter()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginApi(email, password),
    onSuccess: async (data) => {
      await setAuth(data.user, data.accessToken, data.refreshToken)
      router.replace('/(auth)/profiles')
    },
  })
}

export function useRegister() {
  const { setAuth } = useAuthStore()
  const router = useRouter()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      registerApi(email, password),
    onSuccess: async (data) => {
      await setAuth(data.user, data.accessToken, data.refreshToken)
      router.replace('/(auth)/profiles')
    },
  })
}

export function useLogout() {
  const { logout } = useAuthStore()
  const router = useRouter()

  return async () => {
    await logout()
    router.replace('/(auth)/login')
  }
}
```

- [ ] **Step 2: Create `app/_layout.tsx` (root layout with QueryProvider)**

```typescript
import '../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth-store'
import { getStoredToken } from '../services/api'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 1 },
  },
})

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  )
}

function RootNavigator() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(child)" />
      <Stack.Screen name="(parent)" />
    </Stack>
  )
}
```

- [ ] **Step 3: Create `app/(auth)/_layout.tsx`**

```typescript
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 4: Create `app/(auth)/login.tsx`**

```typescript
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { Link } from 'expo-router'
import { useLogin } from '../../hooks/use-auth'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-amber-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-10">
          <Text className="text-4xl font-bold text-emerald-600">📖</Text>
          <Text className="text-3xl font-bold text-emerald-700 mt-2">Quran Kids</Text>
          <Text className="text-slate-500 mt-1">Kisah penuh hikmah untuk si kecil</Text>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm">
          <Text className="text-xl font-bold text-slate-800 mb-4">Masuk</Text>

          <TextInput
            className="border border-slate-200 rounded-xl px-4 py-3 mb-3 text-slate-800"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-800"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {login.isError && (
            <Text className="text-red-500 text-sm mb-3">
              {login.error instanceof Error ? login.error.message : 'Login gagal'}
            </Text>
          )}

          <TouchableOpacity
            className="bg-emerald-500 rounded-xl py-4 items-center"
            onPress={() => login.mutate({ email, password })}
            disabled={login.isPending}
          >
            {login.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Masuk</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity className="mt-4 items-center">
              <Text className="text-slate-500">
                Belum punya akun?{' '}
                <Text className="text-emerald-600 font-semibold">Daftar</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
```

- [ ] **Step 5: Create `app/(auth)/register.tsx`**

```typescript
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { Link } from 'expo-router'
import { useRegister } from '../../hooks/use-auth'

export default function RegisterScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const register = useRegister()

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-amber-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-10">
          <Text className="text-4xl font-bold text-emerald-600">📖</Text>
          <Text className="text-3xl font-bold text-emerald-700 mt-2">Quran Kids</Text>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm">
          <Text className="text-xl font-bold text-slate-800 mb-4">Daftar Akun</Text>

          <TextInput
            className="border border-slate-200 rounded-xl px-4 py-3 mb-3 text-slate-800"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-800"
            placeholder="Password (min. 8 karakter)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {register.isError && (
            <Text className="text-red-500 text-sm mb-3">
              {register.error instanceof Error ? register.error.message : 'Pendaftaran gagal'}
            </Text>
          )}

          <TouchableOpacity
            className="bg-emerald-500 rounded-xl py-4 items-center"
            onPress={() => register.mutate({ email, password })}
            disabled={register.isPending}
          >
            {register.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Daftar</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity className="mt-4 items-center">
              <Text className="text-slate-500">
                Sudah punya akun?{' '}
                <Text className="text-emerald-600 font-semibold">Masuk</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
```

- [ ] **Step 6: Verify app starts**

```bash
cd mobile && npx expo start --android
```

Navigate to the login screen. Should show the Quran Kids logo, email/password fields, and Masuk button.

- [ ] **Step 7: Commit**

```bash
git add mobile/app/ mobile/hooks/use-auth.ts
git commit -m "feat: auth screens — login, register, root layout with QueryProvider"
```

---

## Task 4: Profile Store & Selection Screen

**Files:**
- Create: `mobile/stores/profile-store.ts`
- Create: `mobile/services/profiles.ts`
- Create: `mobile/hooks/use-profiles.ts`
- Create: `mobile/components/ProfileCard.tsx`
- Create: `mobile/app/(auth)/profiles.tsx`
- Test: `mobile/__tests__/profile-store.test.ts`

- [ ] **Step 1: Create `stores/profile-store.ts`**

```typescript
import { create } from 'zustand'

export interface Profile {
  id: string
  name: string
  avatar: string | null
  age: number | null
  role: 'parent' | 'child'
  parentId: string | null
  userId: string
}

interface ProfileState {
  activeProfile: Profile | null
  setActiveProfile: (profile: Profile) => void
  clearActiveProfile: () => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  activeProfile: null,
  setActiveProfile: (profile) => set({ activeProfile: profile }),
  clearActiveProfile: () => set({ activeProfile: null }),
}))
```

- [ ] **Step 2: Create `services/profiles.ts`**

```typescript
import { api } from './api'
import { Profile } from '../stores/profile-store'

export function getProfilesApi(): Promise<Profile[]> {
  return api.get<Profile[]>('/profiles')
}

export function createProfileApi(data: {
  name: string
  age: number
  role: 'child'
}): Promise<Profile> {
  return api.post<Profile>('/profiles', data)
}

export function updateProfileApi(id: string, data: { name?: string; age?: number }): Promise<Profile> {
  return api.put<Profile>(`/profiles/${id}`, data)
}

export function deleteProfileApi(id: string): Promise<void> {
  return api.delete(`/profiles/${id}`)
}
```

- [ ] **Step 3: Create `hooks/use-profiles.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfilesApi, createProfileApi, deleteProfileApi } from '../services/profiles'

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: getProfilesApi,
  })
}

export function useCreateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProfileApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })
}

export function useDeleteProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProfileApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })
}
```

- [ ] **Step 4: Create `components/ProfileCard.tsx`**

```typescript
import { TouchableOpacity, View, Text } from 'react-native'
import { Profile } from '../stores/profile-store'

const AVATARS = ['🦁', '🐬', '🦋', '🌟', '🐻', '🦊', '🐸', '🌈']

interface ProfileCardProps {
  profile: Profile
  onPress: (profile: Profile) => void
  size?: 'sm' | 'lg'
}

export function ProfileCard({ profile, onPress, size = 'lg' }: ProfileCardProps) {
  const avatarIndex = profile.id.charCodeAt(0) % AVATARS.length
  const emoji = profile.avatar ?? AVATARS[avatarIndex]
  const isLg = size === 'lg'

  return (
    <TouchableOpacity
      onPress={() => onPress(profile)}
      className="items-center"
    >
      <View
        className={`${isLg ? 'w-24 h-24' : 'w-14 h-14'} rounded-full bg-emerald-100 items-center justify-center mb-2`}
      >
        <Text className={isLg ? 'text-4xl' : 'text-2xl'}>{emoji}</Text>
      </View>
      <Text className={`font-semibold text-slate-700 ${isLg ? 'text-base' : 'text-sm'}`}>
        {profile.name}
      </Text>
      {profile.age && isLg && (
        <Text className="text-xs text-slate-400">{profile.age} tahun</Text>
      )}
    </TouchableOpacity>
  )
}
```

- [ ] **Step 5: Create `app/(auth)/profiles.tsx`**

```typescript
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfiles, useCreateProfile } from '../../hooks/use-profiles'
import { useProfileStore } from '../../stores/profile-store'
import { ProfileCard } from '../../components/ProfileCard'
import { Profile } from '../../stores/profile-store'

export default function ProfilesScreen() {
  const router = useRouter()
  const { data: profiles = [], isLoading } = useProfiles()
  const { setActiveProfile } = useProfileStore()
  const createProfile = useCreateProfile()

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAge, setNewAge] = useState('')

  const childProfiles = profiles.filter((p) => p.role === 'child')

  function selectProfile(profile: Profile) {
    setActiveProfile(profile)
    router.replace('/(child)/')
  }

  async function handleAddProfile() {
    if (!newName || !newAge) return
    await createProfile.mutateAsync({ name: newName, age: Number(newAge), role: 'child' })
    setShowAdd(false)
    setNewName('')
    setNewAge('')
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-amber-50">
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-amber-50">
      <View className="pt-16 pb-6 px-6 items-center">
        <Text className="text-2xl font-bold text-slate-800">Siapa yang mau belajar?</Text>
        <Text className="text-slate-500 mt-1">Pilih profilmu</Text>
      </View>

      <ScrollView contentContainerClassName="px-6 pb-8">
        <View className="flex-row flex-wrap gap-6 justify-center">
          {childProfiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} onPress={selectProfile} />
          ))}
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            className="items-center"
          >
            <View className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 items-center justify-center mb-2">
              <Text className="text-3xl text-slate-400">+</Text>
            </View>
            <Text className="text-sm text-slate-500">Tambah Profil</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(parent)/')}
          className="mt-10 items-center"
        >
          <Text className="text-slate-400 text-sm">🔒 Mode Orang Tua</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-lg font-bold text-slate-800 mb-4">Tambah Profil Anak</Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-3 text-slate-800"
              placeholder="Nama anak"
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-800"
              placeholder="Usia (tahun)"
              value={newAge}
              onChangeText={setNewAge}
              keyboardType="numeric"
            />
            <TouchableOpacity
              className="bg-emerald-500 rounded-xl py-4 items-center mb-3"
              onPress={handleAddProfile}
              disabled={createProfile.isPending}
            >
              {createProfile.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">Simpan</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)} className="items-center">
              <Text className="text-slate-500">Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
```

- [ ] **Step 6: Write profile store test**

Create `__tests__/profile-store.test.ts`:

```typescript
import { useProfileStore } from '../stores/profile-store'
import { Profile } from '../stores/profile-store'

const mockProfile: Profile = {
  id: 'p1',
  name: 'Ahmad',
  avatar: null,
  age: 7,
  role: 'child',
  parentId: 'u1',
  userId: 'u1',
}

describe('useProfileStore', () => {
  beforeEach(() => {
    useProfileStore.setState({ activeProfile: null })
  })

  it('starts with no active profile', () => {
    expect(useProfileStore.getState().activeProfile).toBeNull()
  })

  it('sets active profile', () => {
    useProfileStore.getState().setActiveProfile(mockProfile)
    expect(useProfileStore.getState().activeProfile?.name).toBe('Ahmad')
  })

  it('clears active profile', () => {
    useProfileStore.getState().setActiveProfile(mockProfile)
    useProfileStore.getState().clearActiveProfile()
    expect(useProfileStore.getState().activeProfile).toBeNull()
  })
})
```

- [ ] **Step 7: Run tests**

```bash
cd mobile && npx jest __tests__/profile-store.test.ts
```

Expected: 3 tests passing.

- [ ] **Step 8: Commit**

```bash
git add mobile/stores/profile-store.ts mobile/services/profiles.ts mobile/hooks/use-profiles.ts mobile/components/ProfileCard.tsx mobile/app/(auth)/profiles.tsx mobile/__tests__/profile-store.test.ts
git commit -m "feat: profile store, profile selection screen, add child profile"
```

---

## Task 5: Child Home Screen

**Files:**
- Create: `mobile/app/(child)/_layout.tsx`
- Create: `mobile/app/(child)/index.tsx`
- Create: `mobile/components/LevelBadge.tsx`
- Create: `mobile/services/progress.ts`
- Create: `mobile/hooks/use-progress.ts`

- [ ] **Step 1: Create `services/progress.ts`**

```typescript
import { api } from './api'

export interface Gamification {
  id: string
  profileId: string
  totalPoints: number
  currentLevel: number
  currentStreak: number
  lastReadAt: string | null
}

export interface Badge {
  id: string
  name: string
  description: string
  iconUrl: string | null
  requirementType: 'stories_completed' | 'streak_days' | 'points'
  requirementValue: number
  earnedAt?: string
}

export interface GamificationResponse {
  gamification: Gamification
  badges: Badge[]
  allBadges: Badge[]
}

export interface ProgressResponse {
  gamification: Gamification
  newBadges: Badge[]
}

export function getGamificationApi(profileId: string): Promise<GamificationResponse> {
  return api.get<GamificationResponse>(`/gamification/${profileId}`)
}

export function postProgressApi(data: {
  profileId: string
  storyId: string
  lastPage: number
  isCompleted: boolean
}): Promise<ProgressResponse> {
  return api.post<ProgressResponse>('/progress', data)
}
```

- [ ] **Step 2: Create `hooks/use-progress.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getGamificationApi, postProgressApi } from '../services/progress'

export function useGamification(profileId: string | undefined) {
  return useQuery({
    queryKey: ['gamification', profileId],
    queryFn: () => getGamificationApi(profileId!),
    enabled: !!profileId,
  })
}

export function usePostProgress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: postProgressApi,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gamification', variables.profileId] })
    },
  })
}
```

- [ ] **Step 3: Create `components/LevelBadge.tsx`**

```typescript
import { View, Text } from 'react-native'
import { getLevelInfo, getProgressToNextLevel } from '../constants/gamification'

interface LevelBadgeProps {
  points: number
  streak: number
}

export function LevelBadge({ points, streak }: LevelBadgeProps) {
  const levelInfo = getLevelInfo(points)
  const progress = getProgressToNextLevel(points)

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm">
      <View className="flex-row justify-between items-center mb-2">
        <View>
          <Text className="text-xs text-slate-400 uppercase tracking-wide">Level {levelInfo.level}</Text>
          <Text className="font-bold text-slate-800 text-base">{levelInfo.name}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-lg">🔥</Text>
          <Text className="font-bold text-orange-500">{streak}</Text>
          <Text className="text-xs text-slate-400">hari</Text>
        </View>
      </View>
      <View className="bg-slate-100 rounded-full h-2">
        <View
          className="bg-emerald-500 rounded-full h-2"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </View>
      <Text className="text-xs text-slate-400 mt-1">{points} poin</Text>
    </View>
  )
}
```

- [ ] **Step 4: Create `services/stories.ts`**

```typescript
import { api } from './api'

export interface Story {
  id: string
  title: string
  slug: string
  category: 'sahabat_nabi' | 'kisah_quran' | 'akhlaq'
  difficultyLevel: 'easy' | 'medium' | 'hard'
  isPremium: boolean
  isPublished: boolean
  totalPages: number
  coverImageUrl: string | null
}

export interface StoryPage {
  id: string
  storyId: string
  pageNumber: number
  textArabic: string | null
  textLatin: string | null
  textTranslation: string
  illustrationUrl: string | null
  audioUrl: string | null
  durationSeconds: number | null
}

export interface StoriesResponse {
  data: Story[]
  total: number
  page: number
  limit: number
}

export function getStoriesApi(params?: { category?: string; page?: number }): Promise<StoriesResponse> {
  const query = new URLSearchParams()
  if (params?.category) query.set('category', params.category)
  if (params?.page) query.set('page', String(params.page))
  query.set('limit', '20')
  return api.get<StoriesResponse>(`/stories?${query.toString()}`)
}

export function getStoryApi(slug: string): Promise<Story> {
  return api.get<Story>(`/stories/${slug}`)
}

export function getStoryPagesApi(slug: string): Promise<StoryPage[]> {
  return api.get<StoryPage[]>(`/stories/${slug}/pages`)
}
```

- [ ] **Step 5: Create `app/(child)/_layout.tsx`**

```typescript
import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function ChildLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: 'white', borderTopColor: '#e2e8f0' },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Beranda',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '🏠' : '🏡'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="stories/index"
        options={{
          tabBarLabel: 'Kisah',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '📖' : '📗'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          tabBarLabel: 'Hadiah',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '🏆' : '🎖️'}</Text>
          ),
        }}
      />
      <Tabs.Screen name="stories/[slug]" options={{ href: null }} />
    </Tabs>
  )
}
```

- [ ] **Step 6: Create `app/(child)/index.tsx` (Home Screen)**

```typescript
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfileStore } from '../../stores/profile-store'
import { useGamification } from '../../hooks/use-progress'
import { useStories } from '../../hooks/use-stories'
import { LevelBadge } from '../../components/LevelBadge'
import { StoryCard } from '../../components/StoryCard'

const CATEGORIES = [
  { value: 'sahabat_nabi', label: 'Sahabat Nabi', emoji: '⭐' },
  { value: 'kisah_quran', label: 'Kisah Al-Quran', emoji: '📜' },
  { value: 'akhlaq', label: 'Akhlaq', emoji: '💚' },
]

export default function HomeScreen() {
  const router = useRouter()
  const { activeProfile } = useProfileStore()
  const { data: gamificationData } = useGamification(activeProfile?.id)
  const { data: storiesData, isLoading } = useStories()

  const gamification = gamificationData?.gamification
  const stories = storiesData?.data?.slice(0, 4) ?? []

  return (
    <ScrollView className="flex-1 bg-amber-50" contentContainerClassName="pb-8">
      {/* Header */}
      <View className="bg-emerald-500 px-6 pt-14 pb-8 rounded-b-3xl">
        <Text className="text-emerald-100 text-sm">Assalamu'alaikum,</Text>
        <Text className="text-white text-2xl font-bold">{activeProfile?.name ?? 'Kawan'} 👋</Text>
      </View>

      <View className="px-4 -mt-4">
        {/* Level Badge */}
        {gamification && (
          <LevelBadge
            points={gamification.totalPoints}
            streak={gamification.currentStreak}
          />
        )}

        {/* Categories */}
        <Text className="font-bold text-slate-800 text-lg mt-6 mb-3">Kategori Kisah</Text>
        <View className="flex-row gap-3">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              onPress={() => router.push({ pathname: '/(child)/stories/', params: { category: cat.value } })}
              className="flex-1 bg-white rounded-2xl p-3 items-center shadow-sm"
            >
              <Text className="text-2xl">{cat.emoji}</Text>
              <Text className="text-xs text-slate-600 mt-1 text-center">{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Stories */}
        <Text className="font-bold text-slate-800 text-lg mt-6 mb-3">Kisah Pilihan</Text>
        {isLoading ? (
          <ActivityIndicator color="#10b981" />
        ) : (
          <View className="gap-3">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onPress={() => router.push(`/(child)/stories/${story.slug}`)}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.push('/(child)/stories/')}
          className="mt-4 items-center"
        >
          <Text className="text-emerald-600 font-semibold">Lihat semua kisah →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
```

- [ ] **Step 7: Create `hooks/use-stories.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { getStoriesApi, getStoryApi, getStoryPagesApi } from '../services/stories'

export function useStories(params?: { category?: string; page?: number }) {
  return useQuery({
    queryKey: ['stories', params],
    queryFn: () => getStoriesApi(params),
  })
}

export function useStory(slug: string) {
  return useQuery({
    queryKey: ['story', slug],
    queryFn: () => getStoryApi(slug),
    enabled: !!slug,
  })
}

export function useStoryPages(slug: string) {
  return useQuery({
    queryKey: ['story-pages', slug],
    queryFn: () => getStoryPagesApi(slug),
    enabled: !!slug,
  })
}
```

- [ ] **Step 8: Create `components/StoryCard.tsx`**

```typescript
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { Story } from '../services/stories'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000'

const CATEGORY_LABELS = {
  sahabat_nabi: 'Sahabat Nabi',
  kisah_quran: 'Kisah Al-Quran',
  akhlaq: 'Akhlaq',
}

interface StoryCardProps {
  story: Story
  onPress: () => void
}

export function StoryCard({ story, onPress }: StoryCardProps) {
  const coverUrl = story.coverImageUrl
    ? `${BASE_URL}${story.coverImageUrl}`
    : null

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden shadow-sm flex-row"
    >
      <View className="w-20 h-20 bg-emerald-100 items-center justify-center">
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} className="w-20 h-20" />
        ) : (
          <Text className="text-3xl">📖</Text>
        )}
      </View>
      <View className="flex-1 px-3 py-2 justify-center">
        <View className="flex-row items-center gap-2 mb-1">
          {story.isPremium && (
            <View className="bg-violet-100 px-2 py-0.5 rounded-full">
              <Text className="text-violet-700 text-xs font-semibold">PREMIUM</Text>
            </View>
          )}
          <Text className="text-xs text-slate-400">{CATEGORY_LABELS[story.category]}</Text>
        </View>
        <Text className="font-semibold text-slate-800" numberOfLines={2}>{story.title}</Text>
        <Text className="text-xs text-slate-400 mt-1">{story.totalPages} halaman</Text>
      </View>
    </TouchableOpacity>
  )
}
```

- [ ] **Step 9: Commit**

```bash
git add mobile/app/(child)/ mobile/components/LevelBadge.tsx mobile/components/StoryCard.tsx mobile/services/progress.ts mobile/services/stories.ts mobile/hooks/use-progress.ts mobile/hooks/use-stories.ts
git commit -m "feat: child home screen, story card, level badge, gamification hooks"
```

---

## Task 6: Story List Screen

**Files:**
- Create: `mobile/app/(child)/stories/index.tsx`

- [ ] **Step 1: Create `app/(child)/stories/index.tsx`**

```typescript
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useStories } from '../../../hooks/use-stories'
import { StoryCard } from '../../../components/StoryCard'

const CATEGORIES = [
  { value: undefined, label: 'Semua' },
  { value: 'sahabat_nabi', label: 'Sahabat Nabi' },
  { value: 'kisah_quran', label: 'Al-Quran' },
  { value: 'akhlaq', label: 'Akhlaq' },
]

export default function StoryListScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ category?: string }>()
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    params.category,
  )

  const { data, isLoading, isError } = useStories(
    selectedCategory ? { category: selectedCategory } : undefined,
  )

  const stories = data?.data ?? []

  return (
    <View className="flex-1 bg-amber-50">
      {/* Header */}
      <View className="bg-emerald-500 px-6 pt-14 pb-6">
        <Text className="text-white text-2xl font-bold">Daftar Kisah</Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 py-3 gap-2"
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.label}
            onPress={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-full ${
              selectedCategory === cat.value
                ? 'bg-emerald-500'
                : 'bg-white border border-slate-200'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                selectedCategory === cat.value ? 'text-white' : 'text-slate-600'
              }`}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Story List */}
      <ScrollView contentContainerClassName="px-4 pb-8 gap-3">
        {isLoading && (
          <View className="py-12 items-center">
            <ActivityIndicator color="#10b981" size="large" />
          </View>
        )}
        {isError && (
          <Text className="text-red-500 text-center py-8">Gagal memuat kisah.</Text>
        )}
        {!isLoading && stories.length === 0 && (
          <Text className="text-slate-400 text-center py-12">Belum ada kisah di kategori ini.</Text>
        )}
        {stories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            onPress={() => router.push(`/(child)/stories/${story.slug}`)}
          />
        ))}
      </ScrollView>
    </View>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/app/(child)/stories/index.tsx
git commit -m "feat: story list screen with category filter"
```

---

## Task 7: Story Reader

**Files:**
- Create: `mobile/components/AudioPlayer.tsx`
- Create: `mobile/components/ProgressBar.tsx`
- Create: `mobile/app/(child)/stories/[slug].tsx`

- [ ] **Step 1: Create `components/ProgressBar.tsx`**

```typescript
import { View } from 'react-native'

interface ProgressBarProps {
  current: number
  total: number
  color?: string
}

export function ProgressBar({ current, total, color = '#10b981' }: ProgressBarProps) {
  const progress = total > 0 ? current / total : 0
  return (
    <View className="h-1.5 bg-slate-200 rounded-full flex-1">
      <View
        className="h-1.5 rounded-full"
        style={{ width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }}
      />
    </View>
  )
}
```

- [ ] **Step 2: Create `components/AudioPlayer.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native'
import { Audio } from 'expo-av'

interface AudioPlayerProps {
  audioUrl: string | null
}

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    return () => {
      sound?.unloadAsync()
    }
  }, [sound])

  // Unload when URL changes (page change)
  useEffect(() => {
    sound?.unloadAsync()
    setSound(null)
    setIsPlaying(false)
  }, [audioUrl])

  async function togglePlay() {
    if (!audioUrl) return

    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync()
        setIsPlaying(false)
      } else {
        await sound.playAsync()
        setIsPlaying(true)
      }
      return
    }

    setIsLoading(true)
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true })
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
      )
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false)
        }
      })
      setSound(newSound)
      setIsPlaying(true)
    } catch (e) {
      console.error('Audio error:', e)
    } finally {
      setIsLoading(false)
    }
  }

  if (!audioUrl) return null

  return (
    <TouchableOpacity
      onPress={togglePlay}
      className="flex-row items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2"
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#10b981" />
      ) : (
        <Text className="text-xl">{isPlaying ? '⏸️' : '▶️'}</Text>
      )}
      <Text className="text-emerald-700 text-sm font-medium">
        {isPlaying ? 'Pause' : 'Dengarkan'}
      </Text>
    </TouchableOpacity>
  )
}
```

- [ ] **Step 3: Create `app/(child)/stories/[slug].tsx`**

```typescript
import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator,
  Animated, Dimensions,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useStory, useStoryPages } from '../../../hooks/use-stories'
import { usePostProgress } from '../../../hooks/use-progress'
import { useProfileStore } from '../../../stores/profile-store'
import { AudioPlayer } from '../../../components/AudioPlayer'
import { ProgressBar } from '../../../components/ProgressBar'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000'
const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default function StoryReaderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const router = useRouter()
  const { activeProfile } = useProfileStore()

  const { data: story, isLoading: storyLoading } = useStory(slug)
  const { data: pages = [], isLoading: pagesLoading } = useStoryPages(slug)
  const postProgress = usePostProgress()

  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [completed, setCompleted] = useState(false)
  const confettiAnim = useRef(new Animated.Value(0)).current

  const currentPage = pages[currentPageIndex]
  const isLastPage = currentPageIndex === pages.length - 1

  async function goToNextPage() {
    if (!story || !activeProfile) return

    // Record progress
    const nextPage = currentPageIndex + 1
    const isCompleted = isLastPage

    await postProgress.mutateAsync({
      profileId: activeProfile.id,
      storyId: story.id,
      lastPage: nextPage,
      isCompleted,
    })

    if (isCompleted) {
      setCompleted(true)
      Animated.sequence([
        Animated.timing(confettiAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(confettiAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start()
    } else {
      setCurrentPageIndex(nextPage)
    }
  }

  if (storyLoading || pagesLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-amber-50">
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    )
  }

  if (!story || pages.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-amber-50">
        <Text className="text-slate-500">Kisah tidak ditemukan.</Text>
      </View>
    )
  }

  if (completed) {
    return (
      <View className="flex-1 items-center justify-center bg-amber-50 px-6">
        <Animated.View style={{ opacity: confettiAnim, transform: [{ scale: confettiAnim }] }}>
          <Text className="text-8xl text-center">🎉</Text>
          <Text className="text-2xl font-bold text-emerald-700 text-center mt-4">
            Selesai!
          </Text>
          <Text className="text-slate-500 text-center mt-2">
            Kamu mendapat 50 poin! Terus semangat belajar!
          </Text>
        </Animated.View>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-8 bg-emerald-500 rounded-2xl px-8 py-4"
        >
          <Text className="text-white font-bold text-base">Kembali ke Beranda</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const illustrationUrl = currentPage.illustrationUrl
    ? `${BASE_URL}${currentPage.illustrationUrl}`
    : null

  const audioUrl = currentPage.audioUrl
    ? `${BASE_URL}${currentPage.audioUrl}`
    : null

  return (
    <View className="flex-1 bg-white">
      {/* Top bar */}
      <View className="flex-row items-center px-4 pt-12 pb-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <ProgressBar current={currentPageIndex + 1} total={pages.length} />
        <Text className="text-xs text-slate-400">
          {currentPageIndex + 1}/{pages.length}
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Illustration */}
        {illustrationUrl ? (
          <Image
            source={{ uri: illustrationUrl }}
            className="w-full"
            style={{ height: SCREEN_WIDTH * 0.6 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="w-full bg-emerald-100 items-center justify-center"
            style={{ height: SCREEN_WIDTH * 0.6 }}
          >
            <Text className="text-6xl">📖</Text>
          </View>
        )}

        {/* Text content */}
        <View className="px-6 py-5 gap-4">
          {/* Audio */}
          <AudioPlayer audioUrl={audioUrl} />

          {/* Arabic */}
          {currentPage.textArabic && (
            <Text className="text-right text-2xl leading-loose text-slate-800">
              {currentPage.textArabic}
            </Text>
          )}

          {/* Latin */}
          {currentPage.textLatin && (
            <Text className="text-slate-500 italic text-sm">{currentPage.textLatin}</Text>
          )}

          {/* Translation */}
          <Text className="text-slate-700 text-base leading-7">
            {currentPage.textTranslation}
          </Text>
        </View>
      </ScrollView>

      {/* Next button */}
      <View className="px-6 pb-8 pt-3">
        <TouchableOpacity
          onPress={goToNextPage}
          disabled={postProgress.isPending}
          className="bg-emerald-500 rounded-2xl py-4 items-center"
        >
          {postProgress.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">
              {isLastPage ? '🎉 Selesai!' : 'Lanjut →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add mobile/components/AudioPlayer.tsx mobile/components/ProgressBar.tsx mobile/app/(child)/stories/[slug].tsx
git commit -m "feat: story reader with audio player, page progress, and completion confetti"
```

---

## Task 8: Rewards Screen

**Files:**
- Create: `mobile/components/BadgeCard.tsx`
- Create: `mobile/app/(child)/rewards.tsx`

- [ ] **Step 1: Create `components/BadgeCard.tsx`**

```typescript
import { View, Text } from 'react-native'
import { Badge } from '../services/progress'

interface BadgeCardProps {
  badge: Badge
  earned: boolean
}

const BADGE_EMOJIS: Record<string, string> = {
  stories_completed: '📚',
  streak_days: '🔥',
  points: '⭐',
}

export function BadgeCard({ badge, earned }: BadgeCardProps) {
  const emoji = BADGE_EMOJIS[badge.requirementType] ?? '🏅'

  return (
    <View
      className={`items-center p-3 rounded-2xl ${
        earned ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-100'
      }`}
      style={{ width: '30%' }}
    >
      <Text className={`text-3xl ${earned ? '' : 'opacity-30'}`}>{emoji}</Text>
      <Text
        className={`text-xs font-semibold text-center mt-1 ${
          earned ? 'text-slate-700' : 'text-slate-400'
        }`}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
      {earned && badge.earnedAt && (
        <Text className="text-xs text-amber-500 mt-0.5">✓ Dapat!</Text>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Create `app/(child)/rewards.tsx`**

```typescript
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useProfileStore } from '../../stores/profile-store'
import { useGamification } from '../../hooks/use-progress'
import { BadgeCard } from '../../components/BadgeCard'
import { getLevelInfo, getProgressToNextLevel } from '../../constants/gamification'

function StreakCalendar({ streak }: { streak: number }) {
  const days = Array.from({ length: 7 }, (_, i) => ({
    day: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][i],
    active: i < streak,
  }))

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm">
      <Text className="font-semibold text-slate-700 mb-3">Streak 7 Hari</Text>
      <View className="flex-row justify-between">
        {days.map((day) => (
          <View key={day.day} className="items-center gap-1">
            <Text className="text-xs text-slate-400">{day.day}</Text>
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                day.active ? 'bg-orange-400' : 'bg-slate-100'
              }`}
            >
              <Text className="text-sm">{day.active ? '🔥' : ''}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

export default function RewardsScreen() {
  const { activeProfile } = useProfileStore()
  const { data, isLoading } = useGamification(activeProfile?.id)

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-amber-50">
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    )
  }

  const gamification = data?.gamification
  const earnedBadges = data?.badges ?? []
  const allBadges = data?.allBadges ?? []
  const points = gamification?.totalPoints ?? 0
  const levelInfo = getLevelInfo(points)
  const progress = getProgressToNextLevel(points)

  const earnedIds = new Set(earnedBadges.map((b) => b.id))

  return (
    <ScrollView className="flex-1 bg-amber-50" contentContainerClassName="pb-10">
      {/* Header */}
      <View className="bg-amber-400 px-6 pt-14 pb-8 rounded-b-3xl">
        <Text className="text-white text-2xl font-bold">Hadiahku 🏆</Text>
      </View>

      <View className="px-4 gap-4 -mt-4">
        {/* Points & Level */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <View>
              <Text className="text-slate-400 text-xs">Level {levelInfo.level}</Text>
              <Text className="text-xl font-bold text-slate-800">{levelInfo.name}</Text>
            </View>
            <View className="items-end">
              <Text className="text-2xl font-bold text-emerald-600">{points}</Text>
              <Text className="text-xs text-slate-400">poin</Text>
            </View>
          </View>
          <View className="bg-slate-100 rounded-full h-3 mb-1">
            <View
              className="bg-emerald-500 rounded-full h-3"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </View>
          {levelInfo.maxPoints !== Infinity && (
            <Text className="text-xs text-slate-400">
              {points} / {levelInfo.maxPoints} poin ke level berikutnya
            </Text>
          )}
        </View>

        {/* Streak Calendar */}
        <StreakCalendar streak={Math.min(gamification?.currentStreak ?? 0, 7)} />

        {/* Badges */}
        <Text className="font-bold text-slate-800 text-lg">Koleksi Badge</Text>
        <View className="flex-row flex-wrap gap-3">
          {allBadges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              earned={earnedIds.has(badge.id)}
            />
          ))}
          {allBadges.length === 0 && (
            <Text className="text-slate-400 text-sm">Belum ada badge tersedia.</Text>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/components/BadgeCard.tsx mobile/app/(child)/rewards.tsx
git commit -m "feat: rewards screen — badges, points, level, streak calendar"
```

---

## Task 9: Parent Mode

**Files:**
- Create: `mobile/app/(parent)/_layout.tsx`
- Create: `mobile/app/(parent)/index.tsx`
- Create: `mobile/app/(parent)/profiles.tsx`
- Create: `mobile/app/(parent)/subscription.tsx`
- Create: `mobile/services/subscription.ts`
- Create: `mobile/hooks/use-subscription.ts`

- [ ] **Step 1: Create `services/subscription.ts`**

```typescript
import { api } from './api'

export interface Subscription {
  id: string
  userId: string
  plan: 'monthly' | 'yearly'
  status: 'active' | 'expired'
  startedAt: string
  expiresAt: string
}

export interface CheckoutResponse {
  snapToken: string
  redirectUrl: string
}

export function getSubscriptionApi(): Promise<Subscription | null> {
  return api.get<Subscription | null>('/subscription').catch(() => null)
}

export function createCheckoutApi(plan: 'monthly' | 'yearly'): Promise<CheckoutResponse> {
  return api.post<CheckoutResponse>('/subscription/checkout', { plan })
}
```

- [ ] **Step 2: Create `hooks/use-subscription.ts`**

```typescript
import { useQuery, useMutation } from '@tanstack/react-query'
import { getSubscriptionApi, createCheckoutApi } from '../services/subscription'

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: getSubscriptionApi,
  })
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (plan: 'monthly' | 'yearly') => createCheckoutApi(plan),
  })
}
```

- [ ] **Step 3: Create `app/(parent)/_layout.tsx` with PIN gate**

```typescript
import { useState } from 'react'
import { Stack } from 'expo-router'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'

const PARENT_PIN = '1234'

export default function ParentLayout() {
  const [pinInput, setPinInput] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState(false)

  function checkPin(pin: string) {
    if (pin.length < 4) return
    if (pin === PARENT_PIN) {
      setUnlocked(true)
      setError(false)
    } else {
      setError(true)
      setPinInput('')
    }
  }

  if (!unlocked) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-800 px-8">
        <Text className="text-4xl mb-4">🔒</Text>
        <Text className="text-white text-xl font-bold mb-2">Mode Orang Tua</Text>
        <Text className="text-slate-400 text-sm mb-8">Masukkan PIN 4 digit</Text>

        <TextInput
          className="bg-slate-700 text-white text-center text-3xl tracking-widest w-40 py-3 rounded-xl"
          value={pinInput}
          onChangeText={(v) => {
            setPinInput(v)
            checkPin(v)
          }}
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
          autoFocus
        />

        {error && (
          <Text className="text-red-400 mt-3">PIN salah. Coba lagi.</Text>
        )}
      </View>
    )
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 4: Create `app/(parent)/index.tsx` (Parent Dashboard)**

```typescript
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfiles } from '../../hooks/use-profiles'
import { useGamification } from '../../hooks/use-progress'
import { useLogout } from '../../hooks/use-auth'
import { useSubscription } from '../../hooks/use-subscription'

function ChildSummary({ profileId, name }: { profileId: string; name: string }) {
  const { data } = useGamification(profileId)
  const g = data?.gamification

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm">
      <Text className="font-semibold text-slate-800 mb-2">{name}</Text>
      {g ? (
        <View className="flex-row gap-4">
          <View className="items-center">
            <Text className="text-xl font-bold text-emerald-600">{g.totalPoints}</Text>
            <Text className="text-xs text-slate-400">poin</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold text-orange-500">{g.currentStreak}</Text>
            <Text className="text-xs text-slate-400">streak</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold text-slate-700">{g.currentLevel}</Text>
            <Text className="text-xs text-slate-400">level</Text>
          </View>
        </View>
      ) : (
        <ActivityIndicator size="small" color="#10b981" />
      )}
    </View>
  )
}

export default function ParentDashboardScreen() {
  const router = useRouter()
  const logout = useLogout()
  const { data: profiles = [], isLoading } = useProfiles()
  const { data: subscription } = useSubscription()

  const childProfiles = profiles.filter((p) => p.role === 'child')
  const isActive = subscription?.status === 'active'

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="pb-10">
      <View className="bg-slate-800 px-6 pt-14 pb-6">
        <Text className="text-white text-2xl font-bold">Dashboard Orang Tua</Text>
      </View>

      <View className="px-4 gap-4 mt-4">
        {/* Subscription Status */}
        <View className={`rounded-2xl p-4 ${isActive ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="font-semibold text-slate-800">Langganan</Text>
              <Text className={`text-sm ${isActive ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isActive ? `Premium aktif sampai ${subscription?.expiresAt.split('T')[0]}` : 'Akun Gratis'}
              </Text>
            </View>
            {!isActive && (
              <TouchableOpacity
                onPress={() => router.push('/(parent)/subscription')}
                className="bg-violet-600 px-3 py-2 rounded-xl"
              >
                <Text className="text-white text-xs font-semibold">Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Child Profiles Summary */}
        <Text className="font-bold text-slate-800 text-lg">Aktivitas Anak</Text>
        {isLoading ? (
          <ActivityIndicator color="#10b981" />
        ) : (
          childProfiles.map((p) => (
            <ChildSummary key={p.id} profileId={p.id} name={p.name} />
          ))
        )}

        {/* Navigation */}
        <TouchableOpacity
          onPress={() => router.push('/(parent)/profiles')}
          className="bg-white rounded-2xl p-4 shadow-sm flex-row justify-between items-center"
        >
          <Text className="font-semibold text-slate-700">👨‍👩‍👧 Kelola Profil Anak</Text>
          <Text className="text-slate-400">›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => await logout()}
          className="bg-red-50 rounded-2xl p-4 items-center border border-red-100"
        >
          <Text className="text-red-500 font-semibold">Keluar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
```

- [ ] **Step 5: Create `app/(parent)/profiles.tsx` (Manage Child Profiles)**

```typescript
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useProfiles, useCreateProfile, useDeleteProfile } from '../../hooks/use-profiles'
import { Profile } from '../../stores/profile-store'

export default function ManageProfilesScreen() {
  const router = useRouter()
  const { data: profiles = [], isLoading } = useProfiles()
  const createProfile = useCreateProfile()
  const deleteProfile = useDeleteProfile()

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAge, setNewAge] = useState('')

  const childProfiles = profiles.filter((p) => p.role === 'child')

  async function handleAdd() {
    if (!newName || !newAge) return
    await createProfile.mutateAsync({ name: newName, age: Number(newAge), role: 'child' })
    setShowAdd(false)
    setNewName('')
    setNewAge('')
  }

  function confirmDelete(profile: Profile) {
    Alert.alert(
      'Hapus Profil',
      `Hapus profil "${profile.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => deleteProfile.mutate(profile.id),
        },
      ],
    )
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-slate-800 px-6 pt-14 pb-4 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-white text-xl">←</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Profil Anak</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 py-4 gap-3 pb-10">
        {isLoading && <ActivityIndicator color="#10b981" />}
        {childProfiles.map((profile) => (
          <View
            key={profile.id}
            className="bg-white rounded-2xl px-4 py-3 flex-row items-center justify-between shadow-sm"
          >
            <View>
              <Text className="font-semibold text-slate-800">{profile.name}</Text>
              {profile.age && <Text className="text-xs text-slate-400">{profile.age} tahun</Text>}
            </View>
            <TouchableOpacity
              onPress={() => confirmDelete(profile)}
              disabled={deleteProfile.isPending}
              className="bg-red-50 px-3 py-1.5 rounded-lg"
            >
              <Text className="text-red-500 text-sm">Hapus</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          className="bg-emerald-50 border border-dashed border-emerald-300 rounded-2xl py-4 items-center"
        >
          <Text className="text-emerald-600 font-semibold">+ Tambah Profil Anak</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-lg font-bold text-slate-800 mb-4">Profil Baru</Text>
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-3 text-slate-800"
              placeholder="Nama anak"
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-800"
              placeholder="Usia"
              value={newAge}
              onChangeText={setNewAge}
              keyboardType="numeric"
            />
            <TouchableOpacity
              className="bg-emerald-500 rounded-xl py-4 items-center mb-3"
              onPress={handleAdd}
              disabled={createProfile.isPending}
            >
              {createProfile.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">Simpan</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)} className="items-center">
              <Text className="text-slate-500">Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
```

- [ ] **Step 6: Create `app/(parent)/subscription.tsx`**

```typescript
import { View, Text, TouchableOpacity, ActivityIndicator, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { useSubscription, useCreateCheckout } from '../../hooks/use-subscription'

const PLANS = [
  {
    plan: 'monthly' as const,
    label: 'Bulanan',
    price: 'Rp 29.000',
    period: '/bulan',
    highlight: false,
  },
  {
    plan: 'yearly' as const,
    label: 'Tahunan',
    price: 'Rp 249.000',
    period: '/tahun',
    highlight: true,
    saving: 'Hemat 30%',
  },
]

export default function SubscriptionScreen() {
  const router = useRouter()
  const { data: subscription } = useSubscription()
  const checkout = useCreateCheckout()

  const isActive = subscription?.status === 'active'

  async function handleSubscribe(plan: 'monthly' | 'yearly') {
    try {
      const { redirectUrl } = await checkout.mutateAsync(plan)
      await Linking.openURL(redirectUrl)
    } catch (e) {
      console.error('Checkout error:', e)
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-violet-700 px-6 pt-14 pb-8 flex-row items-center gap-3 rounded-b-3xl">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-white text-xl">←</Text>
        </TouchableOpacity>
        <View>
          <Text className="text-white text-xl font-bold">Langganan Premium</Text>
          <Text className="text-violet-200 text-sm">Akses semua kisah tanpa batas</Text>
        </View>
      </View>

      <View className="px-4 gap-4 mt-6">
        {isActive ? (
          <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 items-center">
            <Text className="text-3xl mb-2">✅</Text>
            <Text className="font-bold text-emerald-700 text-lg">Premium Aktif</Text>
            <Text className="text-slate-500 text-sm mt-1">
              Berlaku hingga {subscription?.expiresAt.split('T')[0]}
            </Text>
          </View>
        ) : (
          <>
            <Text className="font-bold text-slate-800 text-lg">Pilih Paket</Text>
            {PLANS.map((p) => (
              <TouchableOpacity
                key={p.plan}
                onPress={() => handleSubscribe(p.plan)}
                disabled={checkout.isPending}
                className={`rounded-2xl p-5 ${
                  p.highlight
                    ? 'bg-violet-600 shadow-lg'
                    : 'bg-white border border-slate-200'
                }`}
              >
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className={`font-bold text-lg ${p.highlight ? 'text-white' : 'text-slate-800'}`}>
                      {p.label}
                    </Text>
                    {p.saving && (
                      <View className="bg-amber-400 self-start px-2 py-0.5 rounded-full mt-1">
                        <Text className="text-white text-xs font-bold">{p.saving}</Text>
                      </View>
                    )}
                  </View>
                  <View className="items-end">
                    <Text className={`text-2xl font-bold ${p.highlight ? 'text-white' : 'text-slate-800'}`}>
                      {p.price}
                    </Text>
                    <Text className={`text-sm ${p.highlight ? 'text-violet-200' : 'text-slate-400'}`}>
                      {p.period}
                    </Text>
                  </View>
                </View>
                {checkout.isPending && (
                  <ActivityIndicator color={p.highlight ? 'white' : '#7c3aed'} className="mt-2" />
                )}
              </TouchableOpacity>
            ))}

            <Text className="text-xs text-slate-400 text-center">
              Pembayaran via Midtrans · QRIS · Transfer Bank · E-Wallet
            </Text>
          </>
        )}
      </View>
    </View>
  )
}
```

- [ ] **Step 7: Run all tests**

```bash
cd mobile && npx jest
```

Expected: All tests pass (gamification + auth-store + profile-store).

- [ ] **Step 8: Commit**

```bash
git add mobile/app/(parent)/ mobile/services/subscription.ts mobile/hooks/use-subscription.ts
git commit -m "feat: parent mode — PIN gate, dashboard, profile management, subscription"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|-------------|------|
| Splash / Onboarding: pilih profil anak | Task 4 (profiles screen) |
| Home: greeting + streak, kisah, kategori, poin & level | Task 5 (home screen + LevelBadge) |
| Story List: grid card, GRATIS/PREMIUM badge, filter kategori | Task 6 (story list + StoryCard) |
| Story Reader: ilustrasi, teks 3 bahasa, audio, progress bar, konfeti | Task 7 (reader + AudioPlayer + ProgressBar) |
| Rewards: badge, poin + level, streak calendar | Task 8 (rewards + BadgeCard) |
| Parent Dashboard: ringkasan aktivitas anak | Task 9 (parent/index) |
| Kontrol Konten (aktifkan/nonaktifkan kategori) | ⚠️ Not implemented — backend has no endpoint for content control per profile. Defer to post-MVP. |
| Kelola Profil: tambah, edit, hapus | Task 9 (parent/profiles) — edit omitted (add + delete covered) |
| Langganan: status, upgrade, pembayaran Midtrans | Task 9 (subscription) |
| Auth: login, register | Task 3 |
| Family sharing (multiple child profiles per parent) | Task 4 (profiles screen) |

**Placeholder scan:** No TBDs found. All code blocks complete.

**Type consistency:**
- `Story` type defined in `services/stories.ts`, used in `StoryCard`, `use-stories.ts`, `[slug].tsx` ✅
- `Profile` type defined in `stores/profile-store.ts`, used in `ProfileCard`, `use-profiles.ts` ✅
- `Gamification`/`Badge` types defined in `services/progress.ts`, used in `BadgeCard`, `rewards.tsx`, `LevelBadge` ✅
- `getGamificationApi` returns `GamificationResponse` with `{ gamification, badges, allBadges }` — used correctly in `rewards.tsx` ✅
