# Hafalan Continuous Reading Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan mode membaca continuous di hafalan — user membaca satu surat penuh tanpa stop manual, app deteksi jeda otomatis lalu evaluasi per ayat, semua ditampilkan dalam satu halaman mushaf mengalir.

**Architecture:** Hook `use-continuous-hafalan.ts` mengelola state machine per ayat (pending → listening → analyzing → correct/wrong/hint/skipped) dan silence detection via Expo AV metering. Screen `hafalan/continuous/[id].tsx` menampilkan seluruh ayat sebagai teks Arab continuous (RTL, satu ScrollView) dengan per-word color coding setelah evaluasi. Entry point ditambahkan di `hafalan/index.tsx`.

**Tech Stack:** Expo Router, expo-av (Audio.Recording + metering), React Native ScrollView, expo-file-system/legacy (base64), @tanstack/react-query (fetch verses), existing `evaluateVerse()` dari `services/tilawah.ts`.

---

## File Structure

| File | Action | Tanggung jawab |
|---|---|---|
| `mobile/hooks/use-continuous-hafalan.ts` | Create | State machine per ayat, silence detection, recording lifecycle |
| `mobile/app/(child)/hafalan/continuous/[id].tsx` | Create | Mushaf display screen — ScrollView continuous RTL + bottom controls |
| `mobile/app/(child)/hafalan/index.tsx` | Modify | Tambah tombol "Mode Membaca" di setiap surah card |

---

## Task 1: Hook `use-continuous-hafalan.ts`

**Files:**
- Create: `mobile/hooks/use-continuous-hafalan.ts`

Context: Hook `use-hafalan.ts` di `mobile/hooks/use-hafalan.ts` jadi referensi pola (Audio.Recording, FileSystem base64, evaluateVerse). Hook baru ini mengelola banyak ayat sekaligus + silence detection via metering polling.

- [ ] **Step 1: Buat file dengan types dan initial state**

```typescript
// mobile/hooks/use-continuous-hafalan.ts
import { useState, useRef, useCallback } from 'react'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'
import { evaluateVerse } from '../services/tilawah'
import type { EvaluateResponse } from '../services/tilawah'

export type VerseState =
  | 'pending'
  | 'listening'
  | 'analyzing'
  | 'correct'
  | 'wrong'
  | 'hint_shown'
  | 'skipped'

export interface VerseAttempt {
  verseNumber: number
  state: VerseState
  attempts: number          // jumlah rekaman untuk ayat ini
  withHint: boolean         // benar setelah hint ditampilkan
  skipped: boolean
  lastScore: number
  wordResults: EvaluateResponse['wordResults']
  feedback: string[]
}

export interface UseContinuousHafalanReturn {
  verseAttempts: VerseAttempt[]
  currentIndex: number
  isRunning: boolean
  startSession: () => Promise<void>
  stopSession: () => void
  skipCurrentVerse: () => void
  reset: () => void
}
```

- [ ] **Step 2: Implementasi fungsi `buildInitialAttempts`**

```typescript
function buildInitialAttempts(verseNumbers: number[]): VerseAttempt[] {
  return verseNumbers.map((n) => ({
    verseNumber: n,
    state: 'pending',
    attempts: 0,
    withHint: false,
    skipped: false,
    lastScore: 0,
    wordResults: [],
    feedback: [],
  }))
}
```

- [ ] **Step 3: Implementasi hook body — refs dan state**

```typescript
const SILENCE_DB_THRESHOLD = -50
const SILENCE_DURATION_MS = 1500
const POLL_INTERVAL_MS = 100

export function useContinuousHafalan(
  chapterId: number,
  verseNumbers: number[],
  getExpectedText: (verseNumber: number) => string
): UseContinuousHafalanReturn {
  const [verseAttempts, setVerseAttempts] = useState<VerseAttempt[]>(
    () => buildInitialAttempts(verseNumbers)
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  const recordingRef = useRef<Audio.Recording | null>(null)
  const silenceCounterRef = useRef(0)
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isEvaluatingRef = useRef(false)
  const currentIndexRef = useRef(0)   // sync ref karena closure di interval
  const isRunningRef = useRef(false)
```

- [ ] **Step 4: Implementasi `updateVerse` helper**

```typescript
  const updateVerse = useCallback((index: number, patch: Partial<VerseAttempt>) => {
    setVerseAttempts((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...patch } : v))
    )
  }, [])
```

- [ ] **Step 5: Implementasi `stopPoller` dan `stopRecordingClean`**

```typescript
  const stopPoller = useCallback(() => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current)
      pollerRef.current = null
    }
  }, [])

  const stopRecordingClean = useCallback(async (): Promise<string | null> => {
    stopPoller()
    const rec = recordingRef.current
    if (!rec) return null
    recordingRef.current = null
    try {
      await rec.stopAndUnloadAsync()
      return rec.getURI() ?? null
    } catch {
      return null
    }
  }, [stopPoller])
```

- [ ] **Step 6: Implementasi `evaluateCurrentVerse`**

```typescript
  const evaluateCurrentVerse = useCallback(async (uri: string) => {
    if (isEvaluatingRef.current) return
    isEvaluatingRef.current = true

    const idx = currentIndexRef.current
    updateVerse(idx, { state: 'analyzing' })

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any })
      const attempt = verseAttempts[idx]  // snapshot — baca dari ref lebih aman, lihat step 7
      const expectedText = getExpectedText(attempt.verseNumber)

      const result = await evaluateVerse(chapterId, attempt.verseNumber, expectedText, base64)

      setVerseAttempts((prev) => {
        const cur = prev[idx]
        const newAttempts = cur.attempts + 1
        const passed = result.score >= 60

        let newState: VerseState
        if (passed) {
          newState = cur.state === 'hint_shown' ? 'correct' : 'correct'
        } else if (newAttempts >= 5) {
          newState = 'skipped'
        } else if (newAttempts >= 3) {
          newState = 'hint_shown'
        } else {
          newState = 'wrong'
        }

        return prev.map((v, i) =>
          i === idx
            ? {
                ...v,
                attempts: newAttempts,
                state: newState,
                withHint: cur.state === 'hint_shown' && passed,
                skipped: newState === 'skipped',
                lastScore: result.score,
                wordResults: result.wordResults,
                feedback: result.feedback,
              }
            : v
        )
      })
    } catch {
      updateVerse(idx, { state: 'wrong' })
    } finally {
      isEvaluatingRef.current = false
    }
  }, [chapterId, getExpectedText, updateVerse, verseAttempts])
```

- [ ] **Step 7: Gunakan ref untuk `verseAttempts` agar closure di interval tidak stale**

Tambahkan ref di bawah deklarasi state:

```typescript
  const verseAttemptsRef = useRef(verseAttempts)
  // sync setiap kali state berubah
  // (lakukan ini dengan useEffect di dalam hook — di bawah semua callback)
```

Dan di `evaluateCurrentVerse`, ganti `verseAttempts[idx]` dengan `verseAttemptsRef.current[idx]`.

Tambahkan `useEffect` sync ref setelah semua callback:

```typescript
  // Tambahkan import useEffect di atas
  useEffect(() => {
    verseAttemptsRef.current = verseAttempts
  }, [verseAttempts])
```

- [ ] **Step 8: Implementasi `startListeningForVerse`**

```typescript
  const startListeningForVerse = useCallback(async (index: number) => {
    if (!isRunningRef.current) return

    currentIndexRef.current = index
    setCurrentIndex(index)
    silenceCounterRef.current = 0

    updateVerse(index, { state: 'listening' })

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      })
      recordingRef.current = recording

      pollerRef.current = setInterval(async () => {
        if (!isRunningRef.current || isEvaluatingRef.current) return
        try {
          const status = await recording.getStatusAsync()
          const metering = (status as any).metering ?? 0

          if (metering < SILENCE_DB_THRESHOLD) {
            silenceCounterRef.current += POLL_INTERVAL_MS
          } else {
            silenceCounterRef.current = 0
          }

          if (silenceCounterRef.current >= SILENCE_DURATION_MS) {
            silenceCounterRef.current = 0
            stopPoller()
            const uri = await stopRecordingClean()
            if (uri) await evaluateCurrentVerse(uri)
          }
        } catch {
          // recording sudah unloaded — abaikan
        }
      }, POLL_INTERVAL_MS)
    } catch {
      updateVerse(index, { state: 'wrong' })
    }
  }, [updateVerse, stopPoller, stopRecordingClean, evaluateCurrentVerse])
```

- [ ] **Step 9: Implementasi `advanceOrFinish` — logic setelah evaluasi selesai**

```typescript
  const advanceOrFinish = useCallback(async () => {
    const idx = currentIndexRef.current
    const total = verseNumbers.length

    if (idx + 1 >= total) {
      // semua ayat selesai
      setIsRunning(false)
      isRunningRef.current = false
      return
    }

    const nextIdx = idx + 1
    // delay 300ms agar user siap
    await new Promise((r) => setTimeout(r, 300))
    await startListeningForVerse(nextIdx)
  }, [verseNumbers.length, startListeningForVerse])
```

- [ ] **Step 10: Hubungkan evaluasi → advance dengan useEffect**

```typescript
  useEffect(() => {
    if (!isRunning) return
    const cur = verseAttempts[currentIndex]
    if (!cur) return

    if (cur.state === 'correct' || cur.state === 'skipped') {
      advanceOrFinish()
    } else if (cur.state === 'wrong' || cur.state === 'hint_shown') {
      // rekam ulang otomatis setelah 400ms
      const t = setTimeout(() => {
        startListeningForVerse(currentIndex)
      }, 400)
      return () => clearTimeout(t)
    }
  }, [verseAttempts, currentIndex, isRunning, advanceOrFinish, startListeningForVerse])
```

- [ ] **Step 11: Implementasi `startSession`, `stopSession`, `skipCurrentVerse`, `reset`**

```typescript
  const startSession = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync()
    if (!granted) return

    setIsRunning(true)
    isRunningRef.current = true
    await startListeningForVerse(0)
  }, [startListeningForVerse])

  const stopSession = useCallback(async () => {
    isRunningRef.current = false
    setIsRunning(false)
    await stopRecordingClean()
    stopPoller()
  }, [stopRecordingClean, stopPoller])

  const skipCurrentVerse = useCallback(async () => {
    await stopRecordingClean()
    stopPoller()
    updateVerse(currentIndexRef.current, { state: 'skipped', skipped: true })
  }, [stopRecordingClean, stopPoller, updateVerse])

  const reset = useCallback(() => {
    stopSession()
    setVerseAttempts(buildInitialAttempts(verseNumbers))
    setCurrentIndex(0)
  }, [stopSession, verseNumbers])

  return {
    verseAttempts,
    currentIndex,
    isRunning,
    startSession,
    stopSession,
    skipCurrentVerse,
    reset,
  }
}
```

- [ ] **Step 12: Verifikasi file TypeScript compile**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile"
npx tsc --noEmit 2>&1 | grep use-continuous-hafalan
```

Expected: tidak ada output (tidak ada error pada file ini).

- [ ] **Step 13: Commit**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids"
git add mobile/hooks/use-continuous-hafalan.ts
git commit -m "feat: add use-continuous-hafalan hook with silence detection"
```

---

## Task 2: Screen `hafalan/continuous/[id].tsx`

**Files:**
- Create: `mobile/app/(child)/hafalan/continuous/[id].tsx`

Context: Ikuti pola `hafalan/[id].tsx` untuk fetch verses, useFocusEffect reset, dan custom `Text` dari `../../../../../components/Text`. Mushaf display: satu `<Text>` besar RTL dengan nested `<Text>` spans per kata (bukan View flex — supaya teks Arab wrap dengan benar, lihat fix yang sudah ada di tilawah/[id].tsx).

- [ ] **Step 1: Buat file dengan imports dan types**

```tsx
// mobile/app/(child)/hafalan/continuous/[id].tsx
import { useCallback, useRef, useEffect } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native'
import { Text } from '../../../../components/Text'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { getSurahVerses } from '../../../../services/quran'
import { useContinuousHafalan } from '../../../../hooks/use-continuous-hafalan'
import type { VerseAttempt, VerseState } from '../../../../hooks/use-continuous-hafalan'

interface Verse {
  verse_number: number
  text_uthmani: string
  words: { text_uthmani: string; position: number }[]
}
```

- [ ] **Step 2: Definisikan helper `wordColor` dan `verseNumStyle`**

```tsx
function wordColor(status: string | undefined, verseState: VerseState): string {
  if (verseState === 'pending' || verseState === 'listening' || verseState === 'analyzing') {
    return 'transparent'  // kata disembunyikan
  }
  if (!status || status === 'correct') return '#10B981'
  if (status === 'mad_short') return '#F59E0B'
  return '#EF4444'
}

const VERSE_NUM_COLORS: Record<VerseState, { bg: string; border: string; text: string }> = {
  pending:    { bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)', text: '#818CF8' },
  listening:  { bg: 'rgba(99,102,241,0.25)', border: '#6366F1',               text: '#A5B4FC' },
  analyzing:  { bg: 'rgba(255,255,255,0.08)',border: 'rgba(255,255,255,0.15)',text: '#9CA3AF' },
  correct:    { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10B981' },
  wrong:      { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  text: '#F87171' },
  hint_shown: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#FCD34D' },
  skipped:    { bg: 'rgba(100,116,139,0.12)',border: 'rgba(100,116,139,0.3)',text: '#64748B' },
}
```

- [ ] **Step 3: Implementasi komponen `MushafVerseSegment`**

Render satu ayat sebagai fragment teks — kata-kata + nomor ayat — inline dalam parent `<Text>`:

```tsx
function MushafVerseSegment({
  verse,
  attempt,
}: {
  verse: Verse
  attempt: VerseAttempt
}) {
  const numStyle = VERSE_NUM_COLORS[attempt.state]
  const isHidden = attempt.state === 'pending' || attempt.state === 'wrong'
  const isHint = attempt.state === 'hint_shown'
  const isDone = attempt.state === 'correct' || attempt.state === 'skipped'

  return (
    <>
      {verse.words.map((w, i) => {
        const result = attempt.wordResults[i]
        const status = result?.status
        const color = isDone
          ? wordColor(status, attempt.state)
          : isHint
          ? '#FCD34D'
          : isHidden
          ? 'rgba(255,255,255,0.12)'
          : '#A5B4FC'  // listening/analyzing
        return (
          <Text key={i} style={[styles.arabicWord, { color }]}>
            {w.text_uthmani}{' '}
          </Text>
        )
      })}
      <Text style={[styles.verseNum, {
        backgroundColor: numStyle.bg,
        borderColor: numStyle.border,
        color: numStyle.text,
      }]}>
        {toArabicNumeral(verse.verse_number)}
      </Text>
      <Text> </Text>
    </>
  )
}

function toArabicNumeral(n: number): string {
  return n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])
}
```

- [ ] **Step 4: Implementasi komponen `StatusRibbon` (chip status per ayat aktif)**

```tsx
function StatusRibbon({ attempt }: { attempt: VerseAttempt }) {
  if (attempt.state === 'pending' || attempt.state === 'correct') return null

  const configs: Partial<Record<VerseState, { label: string; color: string; border: string }>> = {
    listening:  { label: '🎙 Mendengarkan', color: '#A5B4FC', border: 'rgba(99,102,241,0.3)' },
    analyzing:  { label: '⏳ Menilai...',   color: '#9CA3AF', border: 'rgba(255,255,255,0.15)' },
    wrong:      { label: `❌ Coba lagi (${attempt.attempts}×)`, color: '#F87171', border: 'rgba(239,68,68,0.3)' },
    hint_shown: { label: '💡 Bantuan',      color: '#FCD34D', border: 'rgba(245,158,11,0.3)' },
    skipped:    { label: '⏭ Dilewati',     color: '#64748B', border: 'rgba(100,116,139,0.3)' },
  }

  const cfg = configs[attempt.state]
  if (!cfg) return null

  return (
    <View style={styles.ribbonWrap}>
      <View style={[styles.ribbonChip, { borderColor: cfg.border }]}>
        <Text style={[styles.ribbonText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </View>
  )
}
```

- [ ] **Step 5: Implementasi screen utama**

```tsx
export default function ContinuousHafalanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const chapterId = parseInt(id, 10)
  const router = useRouter()
  const scrollRef = useRef<ScrollView>(null)

  const { data: verses = [], isLoading } = useQuery<Verse[]>({
    queryKey: ['verses', chapterId],
    queryFn: () => getSurahVerses(chapterId),
    staleTime: Infinity,
  })

  const verseNumbers = verses.map((v) => v.verse_number)
  const getExpectedText = useCallback(
    (verseNumber: number) => {
      const v = verses.find((v) => v.verse_number === verseNumber)
      return v?.text_uthmani ?? ''
    },
    [verses]
  )

  const {
    verseAttempts,
    currentIndex,
    isRunning,
    startSession,
    stopSession,
    skipCurrentVerse,
    reset,
  } = useContinuousHafalan(chapterId, verseNumbers, getExpectedText)

  // Reset setiap kali screen difokus
  useFocusEffect(
    useCallback(() => {
      reset()
    }, [id])
  )

  // Auto-scroll ke ayat aktif
  useEffect(() => {
    if (!isRunning) return
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: currentIndex * 80, animated: true })
    }, 100)
  }, [currentIndex, isRunning])

  const allDone = verseAttempts.length > 0 &&
    verseAttempts.every((v) => v.state === 'correct' || v.state === 'skipped')

  const handleFinish = () => {
    router.push({
      pathname: '/(child)/hafalan/result' as any,
      params: { results: JSON.stringify(verseAttempts), chapterId: String(chapterId) },
    })
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366F1" />
      </View>
    )
  }

  const correctCount = verseAttempts.filter((v) => v.state === 'correct').length
  const progress = verseNumbers.length > 0 ? correctCount / verseNumbers.length : 0

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mode Membaca</Text>
          <Text style={styles.headerSub}>{verseNumbers.length} Ayat</Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressBadgeText}>{correctCount}/{verseNumbers.length}</Text>
        </View>
      </View>

      {/* Progress strip */}
      <View style={styles.progressStrip}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Mushaf ScrollView */}
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.mushafPage}>
        <Text style={styles.surahTitle}>
          {verses[0] ? `سُورَة` : ''}
        </Text>

        {/* Single flowing Arabic Text block */}
        <Text style={styles.arabicFlow}>
          {verses.map((verse, idx) => {
            const attempt = verseAttempts[idx] ?? {
              state: 'pending', wordResults: [], attempts: 0,
              withHint: false, skipped: false, lastScore: 0, feedback: [],
              verseNumber: verse.verse_number,
            }
            return (
              <MushafVerseSegment key={verse.verse_number} verse={verse} attempt={attempt} />
            )
          })}
        </Text>

        {/* Status ribbon per active/wrong verse */}
        {verseAttempts.map((attempt, idx) => {
          if (attempt.state === 'pending' || attempt.state === 'correct') return null
          return <StatusRibbon key={idx} attempt={attempt} />
        })}
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {allDone ? (
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishBtnText}>Lihat Hasil 🎉</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.bottomStatus}>
              {!isRunning
                ? 'Tekan mikrofon untuk mulai membaca'
                : verseAttempts[currentIndex]?.state === 'analyzing'
                ? '⏳ Menilai bacaan...'
                : '🔴 Sedang merekam — baca terus'}
            </Text>
            <View style={styles.bottomRow}>
              {isRunning && (
                <TouchableOpacity style={styles.skipBtn} onPress={skipCurrentVerse}>
                  <Text style={styles.skipBtnText}>⏭ Lewati</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.micBtn, isRunning && styles.micBtnRecording]}
                onPress={isRunning ? stopSession : startSession}
              >
                <Text style={styles.micIcon}>{isRunning ? '⏹' : '🎙'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  )
}
```

- [ ] **Step 6: Tambahkan StyleSheet**

```tsx
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#111827' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center' },
  backIcon:    { color: '#fff', fontSize: 20, lineHeight: 22 },
  headerTitle: { color: '#F9FAFB', fontSize: 15, fontWeight: '700' },
  headerSub:   { color: '#6B7280', fontSize: 11, marginTop: 1 },
  progressBadge:     { backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  progressBadgeText: { color: '#A5B4FC', fontSize: 12, fontWeight: '700' },
  progressStrip: { height: 2, backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill:  { height: 2, backgroundColor: '#6366F1' },
  scroll:        { flex: 1 },
  mushafPage:    { padding: 20, paddingBottom: 40 },
  surahTitle:    { textAlign: 'center', color: '#818CF8', fontSize: 13, marginBottom: 14 },
  arabicFlow:    { fontSize: 24, lineHeight: 54, fontFamily: 'ScheherazadeNew-Regular', textAlign: 'right', writingDirection: 'rtl', color: '#E5E7EB' },
  arabicWord:    { fontSize: 24, fontFamily: 'ScheherazadeNew-Regular' },
  verseNum:      { fontSize: 11, fontFamily: 'ScheherazadeNew-Regular', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 5, paddingVertical: 2 },
  ribbonWrap:    { alignItems: 'flex-end', marginTop: 4, marginBottom: 2 },
  ribbonChip:    { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: 'rgba(0,0,0,0.3)' },
  ribbonText:    { fontSize: 11, fontWeight: '700' },
  bottomBar:     { backgroundColor: 'rgba(17,24,39,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', padding: 16, paddingBottom: 32 },
  bottomStatus:  { color: '#6B7280', fontSize: 12, textAlign: 'center', marginBottom: 12 },
  bottomRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  micBtn:        { width: 58, height: 58, borderRadius: 29, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', shadowColor: '#6366F1', shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  micBtnRecording: { backgroundColor: '#EF4444', shadowColor: '#EF4444' },
  micIcon:       { fontSize: 22 },
  skipBtn:       { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  skipBtnText:   { color: '#6B7280', fontSize: 12 },
  finishBtn:     { backgroundColor: '#6366F1', borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#6366F1', shadowOpacity: 0.4, shadowRadius: 12 },
  finishBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
```

- [ ] **Step 7: Verifikasi TypeScript**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile"
npx tsc --noEmit 2>&1 | grep "continuous"
```

Expected: tidak ada error.

- [ ] **Step 8: Test manual — buka screen**

Jalankan dev server:
```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile"
npx expo start
```

Navigasi ke `/(child)/hafalan/continuous/1` (Al-Fatihah). Verifikasi:
- Semua 7 ayat muncul sebagai teks mengalir dengan placeholder mask abu-abu
- Tombol mikrofon tampil di bawah

- [ ] **Step 9: Commit**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids"
git add mobile/app/\(child\)/hafalan/continuous/
git commit -m "feat: add continuous hafalan screen with mushaf flow display"
```

---

## Task 3: Entry Point di `hafalan/index.tsx`

**Files:**
- Modify: `mobile/app/(child)/hafalan/index.tsx`

Context: Saat ini `handleSelect` langsung push ke `/(child)/hafalan/${item.id}`. Tambahkan tombol kedua "Mode Membaca" di setiap card, atau tampilkan modal pilihan mode saat card ditekan.

Pilihan yang lebih sederhana dan tidak merusak layout: tambahkan secondary button kecil di setiap card.

- [ ] **Step 1: Baca bagian renderSurah di index.tsx**

```bash
grep -n "renderSurah\|handleSelect\|TouchableOpacity\|cardName" "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile/app/(child)/hafalan/index.tsx"
```

- [ ] **Step 2: Tambahkan handler `handleSelectContinuous`**

Cari fungsi `handleSelect` (sekitar baris 43-46) dan tambahkan di bawahnya:

```tsx
  const handleSelectContinuous = (item: SurahItem) => {
    setLastHafalan({ surahId: item.id, surahName: item.name_simple, timestamp: Date.now() })
    router.push(`/(child)/hafalan/continuous/${item.id}` as any)
  }
```

- [ ] **Step 3: Update `renderSurah` untuk tampilkan dua tombol**

Ganti `renderSurah` function menjadi:

```tsx
  const renderSurah = ({ item }: { item: SurahItem }) => (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardMain} onPress={() => handleSelect(item)} activeOpacity={0.75}>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{item.id}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.name_simple}</Text>
          <Text style={styles.cardSub}>
            {item.translated_name?.name} · {item.verses_count} ayat
          </Text>
        </View>
        <Text style={styles.cardArabic}>{item.name_arabic}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.continuousBtn}
        onPress={() => handleSelectContinuous(item)}
        activeOpacity={0.75}
      >
        <Text style={styles.continuousBtnText}>📖 Mode Membaca</Text>
      </TouchableOpacity>
    </View>
  )
```

- [ ] **Step 4: Update StyleSheet — pisahkan `card` dan tambahkan style baru**

Cari style `card` yang ada, ubah jadi:

```tsx
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  continuousBtn: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(99,102,241,0.12)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(99,102,241,0.04)',
    alignItems: 'center',
  },
  continuousBtnText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
  },
```

- [ ] **Step 5: Verifikasi TypeScript**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/mobile"
npx tsc --noEmit 2>&1 | grep "hafalan/index"
```

Expected: tidak ada error.

- [ ] **Step 6: Test manual**

Di app, buka halaman Hafalan. Verifikasi:
- Setiap surah card punya dua area: baris utama (tap → mode per ayat) + tombol "📖 Mode Membaca" di bawah
- Tap "Mode Membaca" di Al-Fatihah → masuk ke continuous screen

- [ ] **Step 7: Test alur lengkap**

1. Tap "Mode Membaca" di Al-Fatihah
2. Tap mikrofon → mulai merekam
3. Baca Bismillah → diam 1.5 detik → evaluasi muncul
4. Ayat berikutnya otomatis mulai merekam (300ms delay)
5. Setelah semua ayat selesai → tombol "Lihat Hasil 🎉" muncul

- [ ] **Step 8: Commit**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids"
git add mobile/app/\(child\)/hafalan/index.tsx
git commit -m "feat: add Mode Membaca entry point in hafalan index"
```

---

## Self-Review

### Spec Coverage Check

| Requirement | Task |
|---|---|
| Silence detection via metering polling 100ms, threshold -50dB, 1500ms | Task 1, Step 8 |
| State machine: pending → listening → analyzing → correct/wrong/hint_shown/skipped | Task 1, Steps 1–11 |
| Auto-restart recording setelah evaluasi (delay 300ms) | Task 1, Step 9 |
| Hint setelah 3× salah | Task 1, Step 6 |
| Skip setelah 5× salah | Task 1, Step 6 |
| Mushaf display: teks Arab mengalir RTL, nomor ayat medallion inline | Task 2, Steps 3–5 |
| Per-word color coding setelah evaluasi | Task 2, Step 2 |
| Pending verses: placeholder mask | Task 2, Step 3 |
| Entry point "Mode Membaca" di index | Task 3 |
| Reset state on screen focus | Task 2, Step 5 (useFocusEffect) |

Semua requirement tercakup. ✅
