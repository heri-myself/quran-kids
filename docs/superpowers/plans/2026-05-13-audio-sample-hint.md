# Audio Sample Hint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setelah user 3x merekam ayat yang sama, tampilkan bottom sheet tawaran audio contoh bacaan benar dari Al-Husary Muallim (quran.com recitation ID 12).

**Architecture:** Mobile-only, tidak ada backend change. `use-tilawah.ts` ditambah `retryCount` state. Screen `tilawah/[id].tsx` ditambah `AudioSampleSheet` component (Modal) yang fetch audio URL dari quran.com API lalu play dengan expo-av.

**Tech Stack:** React Native Modal, expo-av (Audio.Sound), react-native-reanimated (WaveformBar sudah ada), quran.com API v4 recitations.

---

## Files

- Modify: `mobile/hooks/use-tilawah.ts` — tambah `retryCount` state + expose di return value
- Modify: `mobile/app/(child)/tilawah/[id].tsx` — tambah `AudioSampleSheet` component + trigger state

---

### Task 1: Tambah `retryCount` ke hook `use-tilawah.ts`

**Files:**
- Modify: `mobile/hooks/use-tilawah.ts`

- [ ] **Step 1: Tambah `retryCount` state dan increment di `stopAndEvaluate`**

Buka `mobile/hooks/use-tilawah.ts`. Tambah state dan update dua tempat:

```typescript
import { useState, useRef, useCallback } from 'react'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'
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

export function calcStars(score: number): number {
  if (score >= 85) return 3
  if (score >= 65) return 2
  return 1
}

export function calcPoints(stars: number, score: number): number {
  if (score === 100) return 75
  if (stars === 3) return 50
  if (stars === 2) return 25
  return 10
}

export function useTilawah(chapterId: number) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [currentEval, setCurrentEval] = useState<EvaluateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
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

  const stopAndEvaluate = useCallback(async (verseNumber: number, expectedText: string) => {
    if (!recordingRef.current) return null
    try {
      setRecordingState('analyzing')
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()
      recordingRef.current = null

      if (!uri) throw new Error('Rekaman tidak tersedia')

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      })

      const result = await evaluateVerse(chapterId, verseNumber, expectedText, base64)
      setCurrentEval(result)
      setRecordingState('done')
      setRetryCount(c => c + 1)
      return result
    } catch (e: any) {
      setError(e.message ?? 'Terjadi kesalahan analisis')
      setRecordingState('error')
      setRetryCount(c => c + 1)
      return null
    }
  }, [chapterId])

  const reset = useCallback(() => {
    setRecordingState('idle')
    setCurrentEval(null)
    setError(null)
    setRetryCount(0)
  }, [])

  return {
    recordingState,
    currentEval,
    error,
    retryCount,
    startRecording,
    stopAndEvaluate,
    reset,
  }
}
```

- [ ] **Step 2: Verifikasi TypeScript tidak error**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -E "use-tilawah|error" | head -20
```

Expected: tidak ada error pada `use-tilawah.ts`.

- [ ] **Step 3: Commit**

```bash
git add mobile/hooks/use-tilawah.ts
git commit -m "feat: add retryCount to use-tilawah hook"
```

---

### Task 2: Tambah `AudioSampleSheet` dan trigger di `tilawah/[id].tsx`

**Files:**
- Modify: `mobile/app/(child)/tilawah/[id].tsx`

- [ ] **Step 1: Tambah import Modal dan update destructure hook**

Di bagian atas file, tambah `Modal` ke import React Native:

```typescript
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native'
```

Update destructure hook untuk ambil `retryCount`:

```typescript
const { recordingState, currentEval, error, retryCount, startRecording, stopAndEvaluate, reset } =
  useTilawah(Number(id))
```

- [ ] **Step 2: Tambah state sheet dan audio di dalam `TilawahLatihanScreen`**

Tambah tepat setelah `const [verseResults, setVerseResults] = useState<VerseResult[]>([])`:

```typescript
const [sheetDismissed, setSheetDismissed] = useState(false)
const [audioLoading, setAudioLoading] = useState(false)
const [audioError, setAudioError] = useState<string | null>(null)
const soundRef = useRef<any>(null)
```

Tambah import `useRef` — update baris import React:

```typescript
import { useState, useEffect, useRef } from 'react'
```

- [ ] **Step 3: Reset `sheetDismissed` saat pindah ayat**

Di dalam `handleNext`, tepat sebelum `reset()`, tambah:

```typescript
const handleNext = () => {
  if (currentIndex + 1 >= verses.length) {
    const allResults = [...verseResults]
    const avg =
      allResults.length > 0
        ? Math.round(allResults.reduce((s, v) => s + v.score, 0) / allResults.length)
        : 0
    const stars = calcStars(avg)
    const points = calcPoints(stars, avg)
    router.replace({
      pathname: '/(child)/tilawah/result',
      params: {
        chapterId: String(id),
        totalScore: String(avg),
        stars: String(stars),
        pointsEarned: String(points),
        verseResults: JSON.stringify(allResults),
      },
    })
  } else {
    setCurrentIndex((i) => i + 1)
    setSheetDismissed(false)
    setAudioError(null)
    reset()
  }
}
```

- [ ] **Step 4: Tambah fungsi `playAudioSample` dan `stopAudio`**

Tambah setelah `handleNext`:

```typescript
const playAudioSample = async () => {
  if (!currentVerse) return
  setAudioLoading(true)
  setAudioError(null)
  try {
    // Stop audio sebelumnya jika ada
    if (soundRef.current) {
      await soundRef.current.unloadAsync()
      soundRef.current = null
    }
    // Fetch URL audio dari quran.com
    const verseKey = `${id}:${currentVerse.verse_number}`
    const res = await fetch(
      `https://api.quran.com/api/v4/recitations/12/by_ayah/${verseKey}`
    )
    if (!res.ok) throw new Error('Gagal mengambil audio')
    const data = await res.json()
    const audioUrl = data?.audio_files?.[0]?.url
    if (!audioUrl) throw new Error('URL audio tidak tersedia')

    // Play audio
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false })
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: true }
    )
    soundRef.current = sound
    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.didJustFinish) {
        setSheetDismissed(true)
        soundRef.current = null
      }
    })
  } catch (e: any) {
    setAudioError(e.message ?? 'Audio tidak tersedia')
  } finally {
    setAudioLoading(false)
  }
}

const dismissSheet = () => {
  if (soundRef.current) {
    soundRef.current.unloadAsync()
    soundRef.current = null
  }
  setSheetDismissed(true)
}
```

- [ ] **Step 5: Tambah `AudioSampleSheet` component (sebelum `export default`)**

Tambah tepat sebelum `export default function TilawahLatihanScreen()`:

```typescript
function AudioSampleSheet({
  visible,
  chapterId,
  verseNumber,
  onDismiss,
  onPlay,
  isLoading,
  audioError,
}: {
  visible: boolean
  chapterId: string
  verseNumber: number
  onDismiss: () => void
  onPlay: () => void
  isLoading: boolean
  audioError: string | null
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={sheetStyles.overlay}>
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.title}>🎧 Mau dengar contoh bacaan?</Text>
          <Text style={sheetStyles.subtitle}>
            Sudah 3x mencoba. Yuk dengar dulu cara yang benar!
          </Text>
          <View style={sheetStyles.waveform}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View
                key={i}
                style={[sheetStyles.waveBar, { height: 8 + (i % 5) * 4 }]}
              />
            ))}
            <Text style={sheetStyles.waveLabel}>
              Surah {chapterId} : {verseNumber}
            </Text>
          </View>
          {audioError && (
            <Text style={sheetStyles.errorText}>{audioError}</Text>
          )}
          <View style={sheetStyles.actions}>
            <TouchableOpacity style={sheetStyles.skipBtn} onPress={onDismiss}>
              <Text style={sheetStyles.skipText}>Lewati</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sheetStyles.playBtn, (isLoading || !!audioError) && { opacity: 0.6 }]}
              onPress={onPlay}
              disabled={isLoading || !!audioError}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={sheetStyles.playText}>▶ Dengar Contoh</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E1B3A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,111,241,0.3)',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: '#8B8BAA',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 20,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124,111,241,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#7C6FF1',
    borderRadius: 2,
  },
  waveLabel: {
    color: '#BDB8FF',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  skipBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipText: {
    color: '#BDB8FF',
    fontWeight: '600',
    fontSize: 15,
  },
  playBtn: {
    flex: 2,
    backgroundColor: '#7C6FF1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#7C6FF1',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  playText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
})
```

- [ ] **Step 6: Render `AudioSampleSheet` di dalam return JSX**

Di dalam `return (...)`, tepat sebelum `</View>` penutup paling luar, tambah:

```typescript
<AudioSampleSheet
  visible={isDone && retryCount >= 3 && !sheetDismissed}
  chapterId={String(id)}
  verseNumber={currentVerse?.verse_number ?? 1}
  onDismiss={dismissSheet}
  onPlay={playAudioSample}
  isLoading={audioLoading}
  audioError={audioError}
/>
```

- [ ] **Step 7: Verifikasi TypeScript tidak error**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -E "tilawah|error" | head -20
```

Expected: tidak ada error TypeScript.

- [ ] **Step 8: Test manual**

1. Buka app → pilih surah → mulai latihan
2. Rekam ayat pertama 3x (tap mic, baca, tap stop — ulangi 3x)
3. Setelah rekaman ke-3 selesai (`isDone`), bottom sheet harus muncul dari bawah
4. Tap **Lewati** → sheet tutup, tombol Ulangi/Next tetap ada
5. Tap **Ulangi** → sheet tidak muncul lagi (karena `sheetDismissed = true`)
6. Tap **Ayat Berikutnya** → pindah ayat, `retryCount` reset ke 0
7. Rekam 3x lagi → sheet muncul kembali
8. Tap **▶ Dengar Contoh** → loading sebentar → audio Al-Husary Muallim play → sheet tutup otomatis setelah audio selesai

- [ ] **Step 9: Commit**

```bash
git add "mobile/app/(child)/tilawah/[id].tsx"
git commit -m "feat: audio sample hint bottom sheet after 3 failed attempts"
```
