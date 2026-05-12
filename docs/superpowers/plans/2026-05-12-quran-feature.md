# Al-Quran Word-by-Word Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah tab Al-Quran ke bottom nav child layout dengan daftar 114 surah dan reader word-by-word menggunakan quran.com API v4 + AsyncStorage cache.

**Architecture:** Data layer (`services/quran.ts`) bertanggung jawab fetch quran.com API dan cache ke AsyncStorage. Hook layer (`hooks/use-quran.ts`) membungkus dengan TanStack Query. Dua screen baru di `app/(child)/quran/` mengikuti pola yang sama dengan screen kisah yang sudah ada.

**Tech Stack:** Expo Router, React Native (StyleSheet), TanStack Query v5, `@react-native-async-storage/async-storage`, quran.com API v4, PNG bundle lokal untuk nama surah.

---

## File Map

| File | Status | Tanggung Jawab |
|------|--------|----------------|
| `mobile/assets/surah-names/001.png` … `114.png` | Baru | Gambar nama Arab tiap surah (bundle lokal) |
| `mobile/components/RIcon.tsx` | Modifikasi | Tambah path SVG `quran-fill` dan `quran-line` |
| `mobile/services/quran.ts` | Baru | Types, fetch quran.com API, read/write AsyncStorage cache |
| `mobile/hooks/use-quran.ts` | Baru | `useChapters()` dan `useSurah(id)` dengan TanStack Query |
| `mobile/app/(child)/quran/index.tsx` | Baru | Screen daftar 114 surah + search |
| `mobile/app/(child)/quran/[id].tsx` | Baru | Screen reader word-by-word per surah |
| `mobile/app/(child)/_layout.tsx` | Modifikasi | Tambah tab ke-4 Al-Quran |

---

## Task 1: Install AsyncStorage + Download Gambar Nama Surah

**Files:**
- Modify: `mobile/package.json`
- Create: `mobile/assets/surah-names/` (114 PNG files)

- [ ] **Step 1: Install `@react-native-async-storage/async-storage`**

```bash
cd mobile
npx expo install @react-native-async-storage/async-storage
```

Expected output: package ditambahkan ke `package.json` dan `package-lock.json`.

- [ ] **Step 2: Download 114 gambar nama surah**

Jalankan script ini dari direktori `mobile/`:

```bash
mkdir -p assets/surah-names
for i in $(seq 1 114); do
  padded=$(printf "%03d" $i)
  curl -s -o "assets/surah-names/${padded}.png" \
    "https://cdn.qurancdn.com/images/quranic-place/surah_name_${padded}_ar.png"
  echo "Downloaded $padded.png"
done
```

Expected: folder `mobile/assets/surah-names/` berisi `001.png` sampai `114.png`.

- [ ] **Step 3: Verifikasi file ada dan tidak kosong**

```bash
ls mobile/assets/surah-names/ | wc -l
# Expected: 114

wc -c mobile/assets/surah-names/001.png
# Expected: ukuran > 0 bytes
```

- [ ] **Step 4: Commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/assets/surah-names/
git commit -m "feat: install AsyncStorage and bundle surah name images"
```

---

## Task 2: Tambah Icon Al-Quran ke RIcon

**Files:**
- Modify: `mobile/components/RIcon.tsx`

- [ ] **Step 1: Tambah dua SVG path baru ke object ICONS**

Buka `mobile/components/RIcon.tsx`. Tambahkan dua entry setelah baris `'parent-line': ...`:

```typescript
'quran-fill': 'M2 3.993C2 3.445 2.445 3 2.993 3H21.007C21.555 3 22 3.445 22 3.993V20.007C22 20.555 21.555 21 21.007 21H2.993C2.445 21 2 20.555 2 20.007V3.993ZM11 5H4V19H11V5ZM13 5V19H20V5H13ZM14 7H19V9H14V7ZM14 10H19V12H14V10Z',
'quran-line': 'M2 3.993C2 3.445 2.445 3 2.993 3H21.007C21.555 3 22 3.445 22 3.993V20.007C22 20.555 21.555 21 21.007 21H2.993C2.445 21 2 20.555 2 20.007V3.993ZM11 5H4V19H11V5ZM13 5V19H20V5H13ZM4 5V19H11V5H4ZM14 7H19V9H14V7ZM14 10H19V12H14V10Z',
```

- [ ] **Step 2: Update type `RIconName` di `_layout.tsx`**

Buka `mobile/app/(child)/_layout.tsx`. Update baris type:

```typescript
type RIconName = 'home-fill' | 'home-line' | 'book-fill' | 'book-line' | 'trophy-fill' | 'trophy-line' | 'quran-fill' | 'quran-line'
```

- [ ] **Step 3: Commit**

```bash
git add mobile/components/RIcon.tsx mobile/app/(child)/_layout.tsx
git commit -m "feat: add quran icon paths to RIcon"
```

---

## Task 3: Buat Service Layer `services/quran.ts`

**Files:**
- Create: `mobile/services/quran.ts`

- [ ] **Step 1: Buat file `mobile/services/quran.ts`**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'

const QURAN_API = 'https://api.quran.com/api/v4'
const CACHE_CHAPTERS = 'qk_chapters'
const CACHE_SURAH_PREFIX = 'qk_surah_'

export interface Chapter {
  id: number
  name_simple: string
  translated_name: { name: string }
  verses_count: number
  revelation_place: 'makkah' | 'madinah'
  name_arabic: string
}

export interface WordTranslation {
  text: string
}

export interface Word {
  id: number
  position: number
  text_uthmani: string
  translation: WordTranslation
}

export interface VerseTranslation {
  text: string
}

export interface Verse {
  id: number
  verse_number: number
  words: Word[]
  translations: VerseTranslation[]
}

async function fetchWithCache<T>(cacheKey: string, url: string): Promise<T> {
  const cached = await AsyncStorage.getItem(cacheKey)
  if (cached) return JSON.parse(cached) as T

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Quran API error: ${res.status}`)
  const data = await res.json()
  await AsyncStorage.setItem(cacheKey, JSON.stringify(data))
  return data as T
}

export async function getChapters(): Promise<Chapter[]> {
  const data = await fetchWithCache<{ chapters: Chapter[] }>(
    CACHE_CHAPTERS,
    `${QURAN_API}/chapters?language=id`,
  )
  return data.chapters
}

export async function getSurahVerses(chapterId: number): Promise<Verse[]> {
  const data = await fetchWithCache<{ verses: Verse[] }>(
    `${CACHE_SURAH_PREFIX}${chapterId}`,
    `${QURAN_API}/verses/by_chapter/${chapterId}?words=true&translations=33&fields=text_uthmani&per_page=300&word_fields=text_uthmani,translation`,
  )
  return data.verses
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/services/quran.ts
git commit -m "feat: add quran service with AsyncStorage cache"
```

---

## Task 4: Buat Hook Layer `hooks/use-quran.ts`

**Files:**
- Create: `mobile/hooks/use-quran.ts`

- [ ] **Step 1: Buat file `mobile/hooks/use-quran.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { getChapters, getSurahVerses } from '../services/quran'

export function useChapters() {
  return useQuery({
    queryKey: ['quran-chapters'],
    queryFn: getChapters,
    staleTime: Infinity,
  })
}

export function useSurahVerses(chapterId: number | undefined) {
  return useQuery({
    queryKey: ['quran-surah', chapterId],
    queryFn: () => getSurahVerses(chapterId!),
    enabled: !!chapterId,
    staleTime: Infinity,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/hooks/use-quran.ts
git commit -m "feat: add useChapters and useSurahVerses hooks"
```

---

## Task 5: Update Bottom Nav — Tambah Tab Al-Quran

**Files:**
- Modify: `mobile/app/(child)/_layout.tsx`

- [ ] **Step 1: Tambah tab Al-Quran ke `_layout.tsx`**

Buka `mobile/app/(child)/_layout.tsx`. Tambahkan `<Tabs.Screen>` baru untuk Al-Quran di antara Kisah dan Hadiah:

```typescript
// Setelah Tabs.Screen name="stories/index"
<Tabs.Screen
  name="quran/index"
  options={{
    tabBarLabel: 'Al-Quran',
    tabBarIcon: ({ focused }) => (
      <TabIcon iconFill="quran-fill" iconLine="quran-line" focused={focused} />
    ),
  }}
/>
// Tambahkan juga entry untuk hide [id] dari tab bar
<Tabs.Screen name="quran/[id]" options={{ href: null }} />
```

Sehingga urutan tab menjadi: `index` → `stories/index` → `quran/index` → `rewards`.

- [ ] **Step 2: Verifikasi app bisa jalan tanpa error**

```bash
cd mobile
npx expo start
```

Pastikan bottom nav muncul 4 tab dan tab Al-Quran bisa diklik (layar kosong dulu, belum ada screen).

- [ ] **Step 3: Commit**

```bash
git add mobile/app/(child)/_layout.tsx
git commit -m "feat: add Al-Quran tab to child bottom nav"
```

---

## Task 6: Screen Daftar Surah — `quran/index.tsx`

**Files:**
- Create: `mobile/app/(child)/quran/index.tsx`

- [ ] **Step 1: Buat direktori dan file**

```bash
mkdir -p "mobile/app/(child)/quran"
```

- [ ] **Step 2: Buat `mobile/app/(child)/quran/index.tsx`**

```typescript
import { useState, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Image, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useChapters } from '../../../hooks/use-quran'
import type { Chapter } from '../../../services/quran'

// Mapping nomor surah ke file gambar bundled
const SURAH_IMAGES: Record<number, ReturnType<typeof require>> = {
  1: require('../../../assets/surah-names/001.png'),
  2: require('../../../assets/surah-names/002.png'),
  3: require('../../../assets/surah-names/003.png'),
  4: require('../../../assets/surah-names/004.png'),
  5: require('../../../assets/surah-names/005.png'),
  6: require('../../../assets/surah-names/006.png'),
  7: require('../../../assets/surah-names/007.png'),
  8: require('../../../assets/surah-names/008.png'),
  9: require('../../../assets/surah-names/009.png'),
  10: require('../../../assets/surah-names/010.png'),
  11: require('../../../assets/surah-names/011.png'),
  12: require('../../../assets/surah-names/012.png'),
  13: require('../../../assets/surah-names/013.png'),
  14: require('../../../assets/surah-names/014.png'),
  15: require('../../../assets/surah-names/015.png'),
  16: require('../../../assets/surah-names/016.png'),
  17: require('../../../assets/surah-names/017.png'),
  18: require('../../../assets/surah-names/018.png'),
  19: require('../../../assets/surah-names/019.png'),
  20: require('../../../assets/surah-names/020.png'),
  21: require('../../../assets/surah-names/021.png'),
  22: require('../../../assets/surah-names/022.png'),
  23: require('../../../assets/surah-names/023.png'),
  24: require('../../../assets/surah-names/024.png'),
  25: require('../../../assets/surah-names/025.png'),
  26: require('../../../assets/surah-names/026.png'),
  27: require('../../../assets/surah-names/027.png'),
  28: require('../../../assets/surah-names/028.png'),
  29: require('../../../assets/surah-names/029.png'),
  30: require('../../../assets/surah-names/030.png'),
  31: require('../../../assets/surah-names/031.png'),
  32: require('../../../assets/surah-names/032.png'),
  33: require('../../../assets/surah-names/033.png'),
  34: require('../../../assets/surah-names/034.png'),
  35: require('../../../assets/surah-names/035.png'),
  36: require('../../../assets/surah-names/036.png'),
  37: require('../../../assets/surah-names/037.png'),
  38: require('../../../assets/surah-names/038.png'),
  39: require('../../../assets/surah-names/039.png'),
  40: require('../../../assets/surah-names/040.png'),
  41: require('../../../assets/surah-names/041.png'),
  42: require('../../../assets/surah-names/042.png'),
  43: require('../../../assets/surah-names/043.png'),
  44: require('../../../assets/surah-names/044.png'),
  45: require('../../../assets/surah-names/045.png'),
  46: require('../../../assets/surah-names/046.png'),
  47: require('../../../assets/surah-names/047.png'),
  48: require('../../../assets/surah-names/048.png'),
  49: require('../../../assets/surah-names/049.png'),
  50: require('../../../assets/surah-names/050.png'),
  51: require('../../../assets/surah-names/051.png'),
  52: require('../../../assets/surah-names/052.png'),
  53: require('../../../assets/surah-names/053.png'),
  54: require('../../../assets/surah-names/054.png'),
  55: require('../../../assets/surah-names/055.png'),
  56: require('../../../assets/surah-names/056.png'),
  57: require('../../../assets/surah-names/057.png'),
  58: require('../../../assets/surah-names/058.png'),
  59: require('../../../assets/surah-names/059.png'),
  60: require('../../../assets/surah-names/060.png'),
  61: require('../../../assets/surah-names/061.png'),
  62: require('../../../assets/surah-names/062.png'),
  63: require('../../../assets/surah-names/063.png'),
  64: require('../../../assets/surah-names/064.png'),
  65: require('../../../assets/surah-names/065.png'),
  66: require('../../../assets/surah-names/066.png'),
  67: require('../../../assets/surah-names/067.png'),
  68: require('../../../assets/surah-names/068.png'),
  69: require('../../../assets/surah-names/069.png'),
  70: require('../../../assets/surah-names/070.png'),
  71: require('../../../assets/surah-names/071.png'),
  72: require('../../../assets/surah-names/072.png'),
  73: require('../../../assets/surah-names/073.png'),
  74: require('../../../assets/surah-names/074.png'),
  75: require('../../../assets/surah-names/075.png'),
  76: require('../../../assets/surah-names/076.png'),
  77: require('../../../assets/surah-names/077.png'),
  78: require('../../../assets/surah-names/078.png'),
  79: require('../../../assets/surah-names/079.png'),
  80: require('../../../assets/surah-names/080.png'),
  81: require('../../../assets/surah-names/081.png'),
  82: require('../../../assets/surah-names/082.png'),
  83: require('../../../assets/surah-names/083.png'),
  84: require('../../../assets/surah-names/084.png'),
  85: require('../../../assets/surah-names/085.png'),
  86: require('../../../assets/surah-names/086.png'),
  87: require('../../../assets/surah-names/087.png'),
  88: require('../../../assets/surah-names/088.png'),
  89: require('../../../assets/surah-names/089.png'),
  90: require('../../../assets/surah-names/090.png'),
  91: require('../../../assets/surah-names/091.png'),
  92: require('../../../assets/surah-names/092.png'),
  93: require('../../../assets/surah-names/093.png'),
  94: require('../../../assets/surah-names/094.png'),
  95: require('../../../assets/surah-names/095.png'),
  96: require('../../../assets/surah-names/096.png'),
  97: require('../../../assets/surah-names/097.png'),
  98: require('../../../assets/surah-names/098.png'),
  99: require('../../../assets/surah-names/099.png'),
  100: require('../../../assets/surah-names/100.png'),
  101: require('../../../assets/surah-names/101.png'),
  102: require('../../../assets/surah-names/102.png'),
  103: require('../../../assets/surah-names/103.png'),
  104: require('../../../assets/surah-names/104.png'),
  105: require('../../../assets/surah-names/105.png'),
  106: require('../../../assets/surah-names/106.png'),
  107: require('../../../assets/surah-names/107.png'),
  108: require('../../../assets/surah-names/108.png'),
  109: require('../../../assets/surah-names/109.png'),
  110: require('../../../assets/surah-names/110.png'),
  111: require('../../../assets/surah-names/111.png'),
  112: require('../../../assets/surah-names/112.png'),
  113: require('../../../assets/surah-names/113.png'),
  114: require('../../../assets/surah-names/114.png'),
}

function revelationLabel(place: string) {
  return place === 'makkah' ? 'Makkiyyah' : 'Madaniyyah'
}

function SurahRow({ chapter, onPress }: { chapter: Chapter; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, paddingHorizontal: 20,
      borderBottomWidth: 1, borderBottomColor: '#EEEEFF',
      backgroundColor: '#FFFFFF',
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        borderWidth: 1.5, borderColor: '#7C6FF1',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C6FF1' }}>
          {chapter.id}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#7C6FF1' }}>
          {chapter.name_simple}
        </Text>
        <Text style={{ fontSize: 11, color: '#B0B0C8', marginTop: 2 }}>
          {chapter.translated_name.name} · {chapter.verses_count} Ayat · {revelationLabel(chapter.revelation_place)}
        </Text>
      </View>
      {SURAH_IMAGES[chapter.id] ? (
        <Image
          source={SURAH_IMAGES[chapter.id]}
          style={{ width: 72, height: 28 }}
          resizeMode="contain"
        />
      ) : (
        <Text style={{ fontSize: 18, color: '#5B52D4', fontFamily: 'serif' }}>
          {chapter.name_arabic}
        </Text>
      )}
    </TouchableOpacity>
  )
}

export default function QuranIndexScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { data: chapters = [], isLoading, isError } = useChapters()

  const filtered = useMemo(() => {
    if (!search.trim()) return chapters
    const q = search.toLowerCase()
    return chapters.filter(c =>
      c.name_simple.toLowerCase().includes(q) ||
      c.translated_name.name.toLowerCase().includes(q)
    )
  }, [chapters, search])

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4FF' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#7C6FF1',
        paddingHorizontal: 24,
        paddingTop: 56,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
      }}>
        <Text style={{ color: '#D4D0FF', fontSize: 13, marginBottom: 4 }}>Kitab Suci</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800' }}>Al-Quran 📖</Text>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>
        <View style={{
          backgroundColor: '#FFFFFF', borderRadius: 12,
          borderWidth: 1, borderColor: '#E0DFFF',
          paddingHorizontal: 14, paddingVertical: 10,
          flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nama surah..."
            placeholderTextColor="#B0B0C8"
            style={{ flex: 1, fontSize: 14, color: '#1A1A2E' }}
          />
        </View>
      </View>

      {/* List */}
      {isLoading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#7C6FF1" size="large" />
        </View>
      )}
      {isError && (
        <Text style={{ textAlign: 'center', color: '#EF4444', padding: 32 }}>
          Gagal memuat daftar surah. Periksa koneksi internet.
        </Text>
      )}
      {!isLoading && !isError && (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <SurahRow
              chapter={item}
              onPress={() => router.push(`/(child)/quran/${item.id}`)}
            />
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}
```

- [ ] **Step 3: Verifikasi screen muncul dan list 114 surah tampil**

Buka app, tap tab Al-Quran. Pastikan daftar surah muncul dengan gambar nama Arab di kanan tiap baris.

- [ ] **Step 4: Commit**

```bash
git add "mobile/app/(child)/quran/index.tsx"
git commit -m "feat: add quran surah list screen"
```

---

## Task 7: Screen Reader Word-by-Word — `quran/[id].tsx`

**Files:**
- Create: `mobile/app/(child)/quran/[id].tsx`

- [ ] **Step 1: Buat `mobile/app/(child)/quran/[id].tsx`**

```typescript
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSurahVerses } from '../../../hooks/use-quran'
import { useChapters } from '../../../hooks/use-quran'
import type { Verse, Word } from '../../../services/quran'

function WordBox({ word }: { word: Word }) {
  return (
    <View style={{
      alignItems: 'center',
      backgroundColor: '#F4F4FF',
      borderWidth: 1, borderColor: '#DDD8FF',
      borderRadius: 8, padding: 8, minWidth: 60,
    }}>
      <Text style={{ fontSize: 20, color: '#1A1A2E', fontFamily: 'serif', lineHeight: 28 }}>
        {word.text_uthmani}
      </Text>
      <Text style={{ fontSize: 9, color: '#B0B0C8', textAlign: 'center', marginTop: 3 }}>
        {word.translation?.text ?? ''}
      </Text>
    </View>
  )
}

function AyatCard({ verse }: { verse: Verse }) {
  const translation = verse.translations?.[0]?.text ?? ''
  // Hapus tag footnote dari terjemahan, mis: <sup>1</sup>
  const cleanTranslation = translation.replace(/<[^>]*>/g, '')

  return (
    <View style={{
      backgroundColor: '#FFFFFF', borderRadius: 12,
      borderWidth: 1, borderColor: '#E8E8FF',
      padding: 16, marginBottom: 12,
    }}>
      {/* Nomor ayat */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
      }}>
        <View style={{
          width: 30, height: 30, borderRadius: 15,
          backgroundColor: '#7C6FF1',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
            {verse.verse_number}
          </Text>
        </View>
      </View>

      {/* Word-by-word grid (RTL) */}
      <View style={{
        flexDirection: 'row', flexWrap: 'wrap',
        justifyContent: 'flex-end', gap: 6,
        marginBottom: 14,
      }}>
        {[...verse.words].reverse().map(word => (
          <WordBox key={word.id} word={word} />
        ))}
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: '#F0F0FF', marginBottom: 10 }} />

      {/* Terjemahan */}
      <Text style={{ fontSize: 13, color: '#6B6B8A', lineHeight: 20 }}>
        {cleanTranslation}
      </Text>
    </View>
  )
}

export default function QuranReaderScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const chapterId = Number(id)

  const { data: chapters = [] } = useChapters()
  const { data: verses = [], isLoading, isError } = useSurahVerses(chapterId)

  const chapter = chapters.find(c => c.id === chapterId)

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4FF' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#7C6FF1',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 34, height: 34,
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
              {chapter?.name_simple ?? `Surah ${chapterId}`}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
              Surah {chapterId} · {chapter?.verses_count ?? '?'} Ayat
            </Text>
          </View>
        </View>
      </View>

      {isLoading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#7C6FF1" size="large" />
        </View>
      )}

      {isError && (
        <Text style={{ textAlign: 'center', color: '#EF4444', padding: 32 }}>
          Gagal memuat surah. Periksa koneksi internet.
        </Text>
      )}

      {!isLoading && !isError && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Bismillah — tampilkan untuk semua surah kecuali surah 9 (At-Taubah) dan surah 1 (Al-Fatihah sudah include) */}
          {chapterId !== 9 && chapterId !== 1 && (
            <View style={{
              alignItems: 'center', paddingVertical: 16,
              marginBottom: 8,
              borderBottomWidth: 1, borderBottomColor: '#EEEEFF',
            }}>
              <Text style={{ fontSize: 22, color: '#1A1A2E', fontFamily: 'serif' }}>
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </Text>
              <Text style={{ fontSize: 11, color: '#B0B0C8', marginTop: 6 }}>
                Bismillahirrahmanirrahim
              </Text>
            </View>
          )}

          {verses.map(verse => (
            <AyatCard key={verse.id} verse={verse} />
          ))}
        </ScrollView>
      )}
    </View>
  )
}
```

- [ ] **Step 2: Test navigasi dari daftar surah ke reader**

Buka app → tap tab Al-Quran → tap "Al-Ikhlas" (surah 112) → pastikan reader muncul dengan word-by-word tiap ayat.

- [ ] **Step 3: Test surah At-Taubah (id=9) — pastikan Bismillah tidak muncul**

Tap surah nomor 9 (At-Taubah) → pastikan tidak ada Bismillah di atas.

- [ ] **Step 4: Commit**

```bash
git add "mobile/app/(child)/quran/[id].tsx"
git commit -m "feat: add quran word-by-word reader screen"
```

---

## Task 8: Final Check & Polish

- [ ] **Step 1: Test offline cache**

1. Buka Al-Ikhlas (surah 112) — pastikan data load dari internet
2. Matikan WiFi / airplane mode
3. Buka ulang surah 112 — pastikan data masih muncul dari cache

- [ ] **Step 2: Test search di daftar surah**

Ketik "baqarah" di search bar → pastikan hanya Al-Baqarah yang muncul.

- [ ] **Step 3: Verifikasi bottom nav 4 tab tampil rapi**

Pastikan label "Al-Quran" tidak terpotong di layar kecil. Jika terpotong, kurangi `fontSize` label di `_layout.tsx` dari `11` ke `10`.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Al-Quran word-by-word feature"
```
