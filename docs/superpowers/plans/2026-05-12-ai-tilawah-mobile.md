# AI Tilawah — Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun UI mobile fitur AI Tilawah — floating mic button di bottom nav, screen pilih surah, mode latihan per ayat dengan recording + analisis AI, dan screen hasil akhir sesi dengan animasi Lottie.

**Architecture:** Expo Router file-based routing untuk 3 screen baru (`tilawah/index`, `tilawah/[id]`, `tilawah/result`). Audio direkam via `expo-av`, dikirim ke backend sebagai base64. State latihan dikelola di `use-tilawah.ts` hook. Animasi menggunakan `react-native-reanimated` (pulse button, waveform) dan `lottie-react-native` (bintang, confetti).

**Tech Stack:** React Native (no Tailwind, StyleSheet only), Expo Router, expo-av, react-native-reanimated, lottie-react-native, TanStack Query v5.

---

## File Map

| File | Status | Tanggung Jawab |
|------|--------|----------------|
| `mobile/package.json` | Modifikasi | Tambah expo-av, lottie-react-native |
| `mobile/assets/animations/stars.json` | Baru | Lottie bintang (placeholder JSON) |
| `mobile/assets/animations/confetti.json` | Baru | Lottie confetti (placeholder JSON) |
| `mobile/services/tilawah.ts` | Baru | API call POST /tilawah/evaluate dan POST /tilawah/session |
| `mobile/hooks/use-tilawah.ts` | Baru | State management recording + evaluasi + sesi tilawah |
| `mobile/app/(child)/_layout.tsx` | Modifikasi | Floating mic button di tengah tab bar + hidden routes tilawah |
| `mobile/app/(child)/tilawah/index.tsx` | Baru | Screen pilih surah (list + rekomendasi surah pendek) |
| `mobile/app/(child)/tilawah/[id].tsx` | Baru | Mode latihan per ayat: rekam + analisis + highlight kata |
| `mobile/app/(child)/tilawah/result.tsx` | Baru | Hasil akhir sesi: bintang Lottie + skor + poin + rekap |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `mobile/package.json`

- [ ] **Step 1: Install expo-av dan lottie-react-native**

```bash
cd mobile && npx expo install expo-av lottie-react-native
```

Expected: package.json updated, node_modules populated.

- [ ] **Step 2: Verifikasi instalasi**

```bash
cd mobile && cat package.json | grep -E "expo-av|lottie"
```

Expected output mengandung:
```
"expo-av": "...",
"lottie-react-native": "..."
```

- [ ] **Step 3: Buat placeholder Lottie JSON files**

Buat `mobile/assets/animations/stars.json`:
```json
{
  "v": "5.7.4",
  "fr": 30,
  "ip": 0,
  "op": 60,
  "w": 200,
  "h": 200,
  "nm": "Stars",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Star 1",
      "sr": 1,
      "ks": {
        "o": { "a": 1, "k": [{"t":0,"s":[0]},{"t":30,"s":[100]}] },
        "r": { "a": 0, "k": 0 },
        "p": { "a": 0, "k": [100, 100, 0] },
        "s": { "a": 1, "k": [{"t":0,"s":[0,0,100]},{"t":30,"s":[100,100,100]}] }
      },
      "shapes": [
        {
          "ty": "sr",
          "nm": "Star",
          "sy": 1,
          "d": 1,
          "pt": { "a": 0, "k": 5 },
          "p": { "a": 0, "k": [0, 0] },
          "r": { "a": 0, "k": 0 },
          "ir": { "a": 0, "k": 20 },
          "is": { "a": 0, "k": 0 },
          "or": { "a": 0, "k": 40 },
          "os": { "a": 0, "k": 0 },
          "ix": 1
        },
        { "ty": "fl", "nm": "Fill", "c": { "a": 0, "k": [1, 0.82, 0.1, 1] }, "o": { "a": 0, "k": 100 } }
      ]
    }
  ]
}
```

Buat `mobile/assets/animations/confetti.json`:
```json
{
  "v": "5.7.4",
  "fr": 30,
  "ip": 0,
  "op": 90,
  "w": 400,
  "h": 400,
  "nm": "Confetti",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Confetti Piece",
      "sr": 1,
      "ks": {
        "o": { "a": 1, "k": [{"t":0,"s":[100]},{"t":75,"s":[100]},{"t":90,"s":[0]}] },
        "p": { "a": 1, "k": [{"t":0,"s":[200,0,0],"e":[200,400,0]},{"t":90,"s":[200,400,0]}] },
        "r": { "a": 1, "k": [{"t":0,"s":[0]},{"t":90,"s":[360]}] },
        "s": { "a": 0, "k": [100, 100, 100] }
      },
      "shapes": [
        {
          "ty": "rc",
          "nm": "Rect",
          "d": 1,
          "p": { "a": 0, "k": [0, 0] },
          "s": { "a": 0, "k": [12, 8] },
          "r": { "a": 0, "k": 2 }
        },
        { "ty": "fl", "nm": "Fill", "c": { "a": 0, "k": [0.49, 0.44, 0.95, 1] }, "o": { "a": 0, "k": 100 } }
      ]
    }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
cd mobile && git add package.json package-lock.json assets/animations/stars.json assets/animations/confetti.json
git commit -m "feat: install expo-av, lottie-react-native; add animation placeholders"
```

---

### Task 2: Tilawah Service (API Calls)

**Files:**
- Create: `mobile/services/tilawah.ts`

- [ ] **Step 1: Buat service file**

Buat `mobile/services/tilawah.ts`:
```typescript
import { API_URL } from './api'

export interface WordResult {
  word: string
  correct: boolean
  expected: string
}

export interface TajweedIssue {
  type: 'mad' | 'ghunnah'
  word: string
  description: string
}

export interface EvaluateResponse {
  score: number
  wordAccuracy: number
  tajweedScore: number
  completeness: number
  wordResults: WordResult[]
  tajweedIssues: TajweedIssue[]
  transcription: string
  feedback: string[]
}

export interface SaveSessionPayload {
  profileId: string
  chapterId: number
  totalScore: number
  stars: number
  pointsEarned: number
  verses: {
    verseNumber: number
    score: number
    wordAccuracy: number
    tajweedScore: number
    feedback: string[]
  }[]
}

export interface SaveSessionResponse {
  sessionId: string
  pointsEarned: number
  newTotal: number
}

export async function evaluateVerse(
  chapterId: number,
  verseNumber: number,
  audioBase64: string
): Promise<EvaluateResponse> {
  const res = await fetch(`${API_URL}/tilawah/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapterId, verseNumber, audioBase64 }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Evaluasi gagal (${res.status})`)
  }
  return res.json()
}

export async function saveSession(
  token: string,
  payload: SaveSessionPayload
): Promise<SaveSessionResponse> {
  const res = await fetch(`${API_URL}/tilawah/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Gagal menyimpan sesi (${res.status})`)
  }
  return res.json()
}
```

- [ ] **Step 2: Verifikasi API_URL import tersedia**

```bash
grep -n "API_URL\|export.*API_URL\|const API_URL" "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile/services/api.ts" | head -5
```

Jika `API_URL` tidak di-export dari `api.ts`, ganti import dengan:
```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api'
```

- [ ] **Step 3: Commit**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile" && git add services/tilawah.ts
git commit -m "feat: tilawah service — evaluateVerse + saveSession API calls"
```

---

### Task 3: use-tilawah Hook (State Management)

**Files:**
- Create: `mobile/hooks/use-tilawah.ts`

- [ ] **Step 1: Buat hook**

Buat `mobile/hooks/use-tilawah.ts`:
```typescript
import { useState, useRef, useCallback } from 'react'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { evaluateVerse, EvaluateResponse } from '../services/tilawah'

export type RecordingState = 'idle' | 'recording' | 'analyzing' | 'done' | 'error'

export interface VerseResult {
  verseNumber: number
  score: number
  wordAccuracy: number
  tajweedScore: number
  feedback: string[]
  evaluation: EvaluateResponse
}

export interface TilawahSession {
  chapterId: number
  verseResults: VerseResult[]
  totalScore: number
  stars: number
  pointsEarned: number
}

function calcStars(score: number): number {
  if (score >= 85) return 3
  if (score >= 65) return 2
  return 1
}

function calcPoints(stars: number, score: number): number {
  if (score === 100) return 75
  if (stars === 3) return 50
  if (stars === 2) return 25
  return 10
}

export function useTilawah(chapterId: number) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [currentEval, setCurrentEval] = useState<EvaluateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recordingRef = useRef<Audio.Recording | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setCurrentEval(null)
      await Audio.requestPermissionsAsync()
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      recordingRef.current = recording
      setRecordingState('recording')
    } catch (e) {
      setError('Tidak bisa mengakses mikrofon')
      setRecordingState('error')
    }
  }, [])

  const stopAndEvaluate = useCallback(async (verseNumber: number) => {
    if (!recordingRef.current) return
    try {
      setRecordingState('analyzing')
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()
      recordingRef.current = null

      if (!uri) throw new Error('Rekaman tidak tersedia')

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const result = await evaluateVerse(chapterId, verseNumber, base64)
      setCurrentEval(result)
      setRecordingState('done')
      return result
    } catch (e: any) {
      setError(e.message ?? 'Terjadi kesalahan analisis')
      setRecordingState('error')
      return null
    }
  }, [chapterId])

  const reset = useCallback(() => {
    setRecordingState('idle')
    setCurrentEval(null)
    setError(null)
  }, [])

  return {
    recordingState,
    currentEval,
    error,
    startRecording,
    stopAndEvaluate,
    reset,
    calcStars,
    calcPoints,
  }
}
```

- [ ] **Step 2: Verifikasi expo-file-system tersedia**

```bash
grep "expo-file-system" "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile/package.json"
```

Jika tidak ada, install:
```bash
cd mobile && npx expo install expo-file-system
```

- [ ] **Step 3: Commit**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile" && git add hooks/use-tilawah.ts package.json
git commit -m "feat: use-tilawah hook — recording state, evaluasi, scoring helpers"
```

---

### Task 4: Navigation — Floating Button + Hidden Routes

**Files:**
- Modify: `mobile/app/(child)/_layout.tsx`

- [ ] **Step 1: Update _layout.tsx**

Ganti isi `mobile/app/(child)/_layout.tsx` dengan:
```typescript
import { Tabs, useRouter } from 'expo-router'
import { View, Platform, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { RIcon } from '../../components/RIcon'

type RIconName = 'home-fill' | 'home-line' | 'book-fill' | 'book-line' | 'trophy-fill' | 'trophy-line' | 'quran-fill' | 'quran-line'

function TabIcon({ iconFill, iconLine, focused }: { iconFill: RIconName; iconLine: RIconName; focused: boolean }) {
  return (
    <View style={styles.tabIconContainer(focused)}>
      <RIcon name={focused ? iconFill : iconLine} size={22} color={focused ? '#7C6FF1' : '#B0B0C8'} />
    </View>
  )
}

function FloatingMicButton() {
  const router = useRouter()
  const pulse = useSharedValue(1)

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 800, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) })
      ),
      -1,
      false
    )
  }, [])

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }))

  return (
    <TouchableOpacity
      onPress={() => router.push('/(child)/tilawah/')}
      activeOpacity={0.85}
      style={styles.floatingWrapper}
    >
      <Animated.View style={[styles.pulsRing, pulseStyle]} />
      <View style={styles.floatingButton}>
        <RIcon name="home-fill" size={24} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  tabIconContainer: (focused: boolean) => ({
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: focused ? '#EEF0FF' : 'transparent',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }),
  floatingWrapper: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  pulsRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#9B5DE5',
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7C6FF1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C6FF1',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
})

export default function ChildLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#7C6FF1',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#7C6FF1',
        tabBarInactiveTintColor: '#B0B0C8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Beranda',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="home-fill" iconLine="home-line" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stories/index"
        options={{
          tabBarLabel: 'Kisah',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="book-fill" iconLine="book-line" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tilawah/index"
        options={{
          tabBarLabel: 'AI Tilawah',
          tabBarIcon: () => <FloatingMicButton />,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700', color: '#7C6FF1', marginTop: -4 },
        }}
      />
      <Tabs.Screen
        name="quran/index"
        options={{
          tabBarLabel: 'Al-Quran',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="quran-fill" iconLine="quran-line" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          tabBarLabel: 'Hadiah',
          tabBarIcon: ({ focused }) => (
            <TabIcon iconFill="trophy-fill" iconLine="trophy-line" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="quran/[id]" options={{ href: null }} />
      <Tabs.Screen name="hadits/index" options={{ href: null }} />
      <Tabs.Screen name="hadits/[id]" options={{ href: null }} />
      <Tabs.Screen name="stories/[slug]" options={{ href: null }} />
      <Tabs.Screen name="tilawah/[id]" options={{ href: null }} />
      <Tabs.Screen name="tilawah/result" options={{ href: null }} />
    </Tabs>
  )
}
```

**Catatan:** `FloatingMicButton` menggunakan `RIcon name="home-fill"` sebagai placeholder — icon mic tidak tersedia di set RIcon saat ini. Ini bisa diganti emoji 🎙️ dengan `<Text style={{fontSize:22}}>🎙️</Text>` jika dikehendaki. Ganti baris `<RIcon name="home-fill" size={24} color="#FFFFFF" />` dengan `<Text style={{ fontSize: 22 }}>🎙️</Text>` dan tambahkan `import { Text } from 'react-native'`.

- [ ] **Step 2: Buat directory tilawah agar route tersedia**

```bash
mkdir -p "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile/app/(child)/tilawah"
touch "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile/app/(child)/tilawah/.gitkeep"
```

- [ ] **Step 3: Commit**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile" && git add app/'(child)'/_layout.tsx app/'(child)'/tilawah/
git commit -m "feat: add floating AI Tilawah button to bottom nav with pulse animation"
```

---

### Task 5: Screen Pilih Surah (`tilawah/index.tsx`)

**Files:**
- Create: `mobile/app/(child)/tilawah/index.tsx`

- [ ] **Step 1: Buat screen pilih surah**

Buat `mobile/app/(child)/tilawah/index.tsx`:
```typescript
import { useState, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

const RECOMMENDED_IDS = [112, 113, 114, 1]

interface SurahItem {
  id: number
  name_simple: string
  name_arabic: string
  verses_count: number
  translated_name: { name: string }
}

async function fetchChapterList(): Promise<SurahItem[]> {
  const res = await fetch('https://api.quran.com/api/v4/chapters?language=id')
  const data = await res.json()
  return data.chapters
}

function starRating(verseCount: number): string {
  if (verseCount <= 10) return '⭐⭐⭐'
  if (verseCount <= 30) return '⭐⭐'
  return ''
}

export default function TilawahIndexScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const { data: chapters = [], isLoading } = useQuery({
    queryKey: ['chapters'],
    queryFn: fetchChapterList,
    staleTime: Infinity,
  })

  const recommended = useMemo(
    () => chapters.filter((c) => RECOMMENDED_IDS.includes(c.id)),
    [chapters]
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return chapters.filter(
      (c) =>
        !RECOMMENDED_IDS.includes(c.id) &&
        (c.name_simple.toLowerCase().includes(q) ||
          c.translated_name?.name?.toLowerCase().includes(q))
    )
  }, [chapters, query])

  const goToLatihan = (id: number) =>
    router.push(`/(child)/tilawah/${id}`)

  const renderSurah = ({ item }: { item: SurahItem }) => {
    const stars = starRating(item.verses_count)
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => goToLatihan(item.id)}
        activeOpacity={0.75}
      >
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{item.id}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.name_simple}</Text>
          <Text style={styles.cardSub}>{item.translated_name?.name} · {item.verses_count} ayat</Text>
        </View>
        {stars ? <Text style={{ fontSize: 12 }}>{stars}</Text> : null}
        <Text style={styles.cardArabic}>{item.name_arabic}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4FF' }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎙️ Latihan Tilawah</Text>
        <Text style={styles.headerSub}>Pilih surah untuk berlatih membaca</Text>
        <TextInput
          style={styles.searchBar}
          placeholder="Cari surah..."
          placeholderTextColor="#BDB8FF"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#7C6FF1" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            query === '' ? (
              <View style={{ marginTop: 16, marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>Direkomendasikan ✨</Text>
                {recommended.map((item) => renderSurah({ item }))}
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Semua Surah</Text>
              </View>
            ) : null
          }
          renderItem={renderSurah}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#7C6FF1',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  headerSub: { color: '#D4D0FF', fontSize: 13, marginBottom: 16 },
  searchBar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    shadowColor: '#7C6FF1',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadgeText: { color: '#7C6FF1', fontWeight: '700', fontSize: 13 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  cardSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  cardArabic: { fontSize: 16, color: '#7C6FF1', fontFamily: 'serif' },
})
```

- [ ] **Step 2: Commit**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile" && git add app/'(child)'/tilawah/index.tsx
git commit -m "feat: tilawah surah selection screen with search + recommendations"
```

---

### Task 6: Screen Mode Latihan (`tilawah/[id].tsx`)

**Files:**
- Create: `mobile/app/(child)/tilawah/[id].tsx`

- [ ] **Step 1: Buat screen latihan per ayat**

Buat `mobile/app/(child)/tilawah/[id].tsx`:
```typescript
import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { useTilawah, VerseResult } from '../../../hooks/use-tilawah'

interface Verse {
  verse_number: number
  text_uthmani: string
  translations: { text: string }[]
  words: { text_uthmani: string; position: number }[]
}

async function fetchVerses(chapterId: string): Promise<Verse[]> {
  const res = await fetch(
    `https://api.quran.com/api/v4/verses/by_chapter/${chapterId}?language=id&translations=33&word_fields=text_uthmani&per_page=286`
  )
  const data = await res.json()
  return data.verses
}

function WaveformBar({ index, isActive }: { index: number; isActive: boolean }) {
  const height = useSharedValue(8)
  useEffect(() => {
    if (isActive) {
      height.value = withRepeat(
        withSequence(
          withTiming(8 + Math.random() * 24, { duration: 200 + index * 50 }),
          withTiming(8, { duration: 200 + index * 50 })
        ),
        -1,
        true
      )
    } else {
      height.value = withTiming(8)
    }
  }, [isActive])
  const style = useAnimatedStyle(() => ({ height: height.value }))
  return <Animated.View style={[styles.waveBar, style]} />
}

export default function TilawahLatihanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [verseResults, setVerseResults] = useState<VerseResult[]>([])

  const { data: verses = [], isLoading } = useQuery({
    queryKey: ['verses', id],
    queryFn: () => fetchVerses(id),
    staleTime: Infinity,
  })

  const {
    recordingState,
    currentEval,
    error,
    startRecording,
    stopAndEvaluate,
    reset,
    calcStars,
    calcPoints,
  } = useTilawah(Number(id))

  const currentVerse = verses[currentIndex]
  const isRecording = recordingState === 'recording'
  const isAnalyzing = recordingState === 'analyzing'
  const isDone = recordingState === 'done'

  const handleMicPress = async () => {
    if (recordingState === 'idle') {
      await startRecording()
    } else if (recordingState === 'recording') {
      if (!currentVerse) return
      const result = await stopAndEvaluate(currentVerse.verse_number)
      if (result) {
        const vr: VerseResult = {
          verseNumber: currentVerse.verse_number,
          score: result.score,
          wordAccuracy: result.wordAccuracy,
          tajweedScore: result.tajweedScore,
          feedback: result.feedback,
          evaluation: result,
        }
        setVerseResults((prev) => [...prev, vr])
      }
    }
  }

  const handleNext = () => {
    if (currentIndex + 1 >= verses.length) {
      // selesai semua ayat → ke result
      const allResults = [...verseResults]
      const total = allResults.reduce((s, v) => s + v.score, 0)
      const avg = Math.round(total / allResults.length)
      const stars = calcStars(avg)
      const points = calcPoints(stars, avg)
      router.replace({
        pathname: '/(child)/tilawah/result',
        params: {
          chapterId: id,
          totalScore: avg,
          stars,
          pointsEarned: points,
          verseResults: JSON.stringify(allResults),
        },
      })
    } else {
      setCurrentIndex((i) => i + 1)
      reset()
    }
  }

  const handleRetry = () => reset()

  if (isLoading || !currentVerse) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#7C6FF1" size="large" />
      </View>
    )
  }

  const words = currentVerse.words ?? []
  const translation = currentVerse.translations?.[0]?.text?.replace(/<\/?[^>]+(>|$)/g, '') ?? ''

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentIndex + 1) / verses.length) * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.progressLabel}>
        Ayat {currentIndex + 1} / {verses.length}
      </Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 16 }}>
        {/* Verse Card */}
        <View style={styles.verseCard}>
          <View style={styles.verseBadge}>
            <Text style={styles.verseBadgeText}>{currentVerse.verse_number}</Text>
          </View>

          {/* Arabic words with feedback highlight */}
          <View style={styles.arabicRow}>
            {isDone && currentEval ? (
              words.map((w, i) => {
                const wordResult = currentEval.wordResults[i]
                const isCorrect = wordResult?.correct !== false
                return (
                  <Text
                    key={i}
                    style={[
                      styles.arabicWord,
                      { color: isCorrect ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {w.text_uthmani}
                  </Text>
                )
              })
            ) : (
              <Text style={styles.arabicFull}>{currentVerse.text_uthmani}</Text>
            )}
          </View>

          <Text style={styles.translation}>{translation}</Text>
        </View>

        {/* Feedback */}
        {isDone && currentEval && (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackScore}>Skor: {currentEval.score}/100</Text>
            {currentEval.feedback.map((f, i) => (
              <Text key={i} style={styles.feedbackItem}>• {f}</Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Recording Area */}
      <View style={styles.recordArea}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.recordStatus}>
          {recordingState === 'idle' && 'Tap untuk mulai rekam'}
          {recordingState === 'recording' && '🔴 Sedang merekam...'}
          {recordingState === 'analyzing' && '⏳ Menganalisis...'}
          {recordingState === 'done' && `✅ Skor: ${currentEval?.score ?? 0}`}
          {recordingState === 'error' && '❌ Coba lagi'}
        </Text>

        {isRecording && (
          <View style={styles.waveform}>
            {Array.from({ length: 20 }).map((_, i) => (
              <WaveformBar key={i} index={i} isActive={isRecording} />
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {isDone && (
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryBtnText}>Ulangi</Text>
            </TouchableOpacity>
          )}

          {!isDone && (
            <TouchableOpacity
              style={[
                styles.micBtn,
                isRecording && styles.micBtnActive,
                isAnalyzing && { opacity: 0.6 },
              ]}
              onPress={handleMicPress}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 32 }}>{isRecording ? '⏹' : '🎙️'}</Text>
              )}
            </TouchableOpacity>
          )}

          {isDone && (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>
                {currentIndex + 1 >= verses.length ? 'Selesai 🎉' : 'Ayat Berikutnya →'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: Platform.OS === 'ios' ? 52 : 32,
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressFill: { height: 4, backgroundColor: '#7C6FF1', borderRadius: 2 },
  progressLabel: { color: '#BDB8FF', fontSize: 12, textAlign: 'center', marginTop: 6 },
  verseCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  verseBadge: {
    alignSelf: 'flex-end',
    backgroundColor: '#7C6FF1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  verseBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  arabicRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  arabicWord: { fontSize: 26, fontFamily: 'serif', lineHeight: 44 },
  arabicFull: {
    fontSize: 26,
    fontFamily: 'serif',
    color: '#FFFFFF',
    textAlign: 'right',
    lineHeight: 44,
    writingDirection: 'rtl',
  },
  translation: { color: '#94A3B8', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  feedbackCard: {
    backgroundColor: 'rgba(124,111,241,0.15)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  feedbackScore: { color: '#7C6FF1', fontWeight: '700', fontSize: 15, marginBottom: 8 },
  feedbackItem: { color: '#D4D0FF', fontSize: 13, marginBottom: 4 },
  recordArea: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  recordStatus: { color: '#D4D0FF', fontSize: 14 },
  errorText: { color: '#EF4444', fontSize: 13 },
  waveform: { flexDirection: 'row', gap: 4, alignItems: 'center', height: 48 },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#7C6FF1',
    minHeight: 8,
  },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7C6FF1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C6FF1',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  micBtnActive: { backgroundColor: '#EF4444' },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#7C6FF1',
  },
  retryBtnText: { color: '#7C6FF1', fontWeight: '700', fontSize: 14 },
  nextBtn: {
    flex: 1,
    backgroundColor: '#7C6FF1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
})

// Need Platform import
import { Platform } from 'react-native'
```

**Catatan:** Import `Platform` harus dipindahkan ke bagian atas file (sebelum fungsi komponen). Saat implementasi, pastikan baris `import { Platform } from 'react-native'` digabung dengan import React Native lainnya di baris 1.

- [ ] **Step 2: Commit**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile" && git add app/'(child)'/tilawah/'[id].tsx'
git commit -m "feat: tilawah latihan screen — recording, waveform, word-level feedback"
```

---

### Task 7: Screen Hasil Akhir Sesi (`tilawah/result.tsx`)

**Files:**
- Create: `mobile/app/(child)/tilawah/result.tsx`

- [ ] **Step 1: Buat screen hasil**

Buat `mobile/app/(child)/tilawah/result.tsx`:
```typescript
import { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import LottieView from 'lottie-react-native'
import { useProfileStore } from '../../../stores/profile-store'
import { useAuthStore } from '../../../stores/auth-store'
import { saveSession } from '../../../services/tilawah'
import { VerseResult } from '../../../hooks/use-tilawah'

export default function TilawahResultScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    chapterId: string
    totalScore: string
    stars: string
    pointsEarned: string
    verseResults: string
  }>()

  const { activeProfile } = useProfileStore()
  const { token } = useAuthStore()
  const starsRef = useRef<LottieView>(null)
  const confettiRef = useRef<LottieView>(null)

  const totalScore = Number(params.totalScore ?? 0)
  const stars = Number(params.stars ?? 1)
  const pointsEarned = Number(params.pointsEarned ?? 10)
  const verseResults: VerseResult[] = JSON.parse(params.verseResults ?? '[]')

  useEffect(() => {
    starsRef.current?.play()
    if (stars >= 2) {
      setTimeout(() => confettiRef.current?.play(), 600)
    }

    if (activeProfile?.id && token) {
      saveSession(token, {
        profileId: activeProfile.id,
        chapterId: Number(params.chapterId),
        totalScore,
        stars,
        pointsEarned,
        verses: verseResults.map((v) => ({
          verseNumber: v.verseNumber,
          score: v.score,
          wordAccuracy: v.wordAccuracy,
          tajweedScore: v.tajweedScore,
          feedback: v.feedback,
        })),
      }).catch(console.error)
    }
  }, [])

  const starEmojis = Array.from({ length: 3 }, (_, i) => (i < stars ? '⭐' : '☆'))

  return (
    <View style={styles.container}>
      {stars >= 2 && (
        <LottieView
          ref={confettiRef}
          source={require('../../../assets/animations/confetti.json')}
          style={StyleSheet.absoluteFillObject}
          loop={false}
          autoPlay={false}
        />
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stars Animation */}
        <View style={styles.starsWrapper}>
          <LottieView
            ref={starsRef}
            source={require('../../../assets/animations/stars.json')}
            style={{ width: 200, height: 200 }}
            loop={false}
            autoPlay={false}
          />
          <Text style={styles.starEmojis}>{starEmojis.join(' ')}</Text>
        </View>

        <Text style={styles.title}>
          {stars === 3 ? 'Luar Biasa! 🎉' : stars === 2 ? 'Bagus Sekali! 👏' : 'Terus Berlatih! 💪'}
        </Text>
        <Text style={styles.score}>{totalScore}</Text>
        <Text style={styles.scoreLabel}>Skor Rata-rata</Text>

        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>+{pointsEarned} Poin</Text>
        </View>

        {/* Per-verse recap */}
        <View style={styles.recapCard}>
          <Text style={styles.recapTitle}>Rekap per Ayat</Text>
          {verseResults.map((v) => (
            <View key={v.verseNumber} style={styles.recapRow}>
              <Text style={styles.recapVerseLabel}>Ayat {v.verseNumber}</Text>
              <View style={styles.recapBarBg}>
                <View
                  style={[styles.recapBarFill, { width: `${v.score}%` }]}
                />
              </View>
              <Text style={styles.recapScoreText}>{v.score}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.replace(`/(child)/tilawah/${params.chapterId}`)}
        >
          <Text style={styles.btnPrimaryText}>Ulangi Surah</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.replace('/(child)/')}
        >
          <Text style={styles.btnSecondaryText}>Kembali ke Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  content: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, alignItems: 'center' },
  starsWrapper: { alignItems: 'center', marginBottom: 8 },
  starEmojis: { fontSize: 36, marginTop: -32 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  score: { color: '#FFD166', fontSize: 64, fontWeight: '900' },
  scoreLabel: { color: '#94A3B8', fontSize: 14, marginTop: -4, marginBottom: 16 },
  pointsBadge: {
    backgroundColor: '#7C6FF1',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 24,
  },
  pointsText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  recapCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  recapTitle: { color: '#D4D0FF', fontWeight: '700', fontSize: 15, marginBottom: 12 },
  recapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  recapVerseLabel: { color: '#94A3B8', fontSize: 12, width: 52 },
  recapBarBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
  recapBarFill: { height: 8, backgroundColor: '#7C6FF1', borderRadius: 4 },
  recapScoreText: { color: '#D4D0FF', fontSize: 12, width: 28, textAlign: 'right' },
  btnPrimary: {
    width: '100%',
    backgroundColor: '#7C6FF1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  btnSecondary: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#D4D0FF', fontWeight: '600', fontSize: 15 },
})
```

- [ ] **Step 2: Verifikasi auth store export token**

```bash
grep -n "token\|useAuthStore" "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile/stores/auth-store.ts" 2>/dev/null || grep -rn "useAuthStore\|token" "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile/hooks/use-auth.ts" | head -5
```

Jika `useAuthStore` tidak ada, ganti dengan hook yang tersedia untuk mendapatkan token. Cek pattern di file lain yang sudah fetch ke API dengan Authorization header.

- [ ] **Step 3: Commit**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile" && git add app/'(child)'/tilawah/result.tsx
git commit -m "feat: tilawah result screen — Lottie stars/confetti, score, points, per-verse recap"
```

---

## Self-Review

**Spec coverage:**
- ✅ Floating button di tengah bottom nav dengan pulse animation (Task 4)
- ✅ Label "AI Tilawah" di bawah tombol (Task 4)
- ✅ Screen pilih surah dengan search + rekomendasi (Task 5)
- ✅ Rating bintang per surah berdasarkan jumlah ayat (Task 5)
- ✅ Mode latihan background dark, progress bar atas, kartu ayat RTL (Task 6)
- ✅ Recording → Stop → Analyzing states (Task 6)
- ✅ Waveform animasi saat rekam (Task 6)
- ✅ Highlight kata hijau/merah setelah analisis (Task 6)
- ✅ Hasil akhir: Lottie bintang + skor + poin + confetti ≥2 bintang (Task 7)
- ✅ Rekap per ayat bar chart (Task 7)
- ✅ Tombol "Ulangi Surah" / "Kembali ke Home" (Task 7)
- ✅ Simpan sesi ke backend (Task 7 via saveSession)
- ✅ expo-av untuk rekam audio (Task 3)
- ✅ expo-file-system untuk base64 (Task 3)

**Gaps noted:**
- Terjemahan ayat diambil dari quran.com API (translations ID 33 = Bahasa Indonesia Kemenag) — sesuai dengan pola yang sudah ada di quran feature.
- `useAuthStore` digunakan di result screen — perlu diverifikasi saat implementasi karena pattern auth di codebase harus diikuti.
- Icon mic di floating button menggunakan emoji 🎙️ karena RIcon set tidak memiliki mic icon.
