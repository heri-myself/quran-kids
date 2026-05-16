# Hafalan Continuous Reading Mode — Design Spec

## Overview

Mode hafalan baru di mana user membaca seluruh surat secara mengalir tanpa harus menekan tombol stop per ayat. App mendeteksi jeda bicara otomatis, mengevaluasi ayat yang baru saja dibaca, lalu langsung menyiapkan rekaman untuk ayat berikutnya.

Semua ayat ditampilkan dalam satu halaman mushaf (teks mengalir continuous) — bukan box per ayat.

---

## Screen Flow & States

Setiap ayat memiliki state berikut (tidak ada state global screen, hanya state per ayat):

| State | Deskripsi |
|---|---|
| `pending` | Belum giliran dibaca — teks tersembunyi (placeholder mask) |
| `listening` | Sedang direkam — mask dengan warna ungu, waveform inline |
| `analyzing` | Jeda terdeteksi, evaluasi sedang diproses |
| `correct` | Evaluasi lulus (score ≥ threshold) — teks muncul berwarna hijau |
| `wrong` | Evaluasi gagal, mask merah, attempt counter bertambah |
| `hint_shown` | Setelah 3× salah — teks Arab muncul berwarna amber |
| `skipped` | Setelah 5× salah — ayat dilewati otomatis |

---

## Architecture

### New Files

- `mobile/app/(child)/hafalan/continuous/[id].tsx` — Screen utama continuous mode
- `mobile/hooks/use-continuous-hafalan.ts` — Hook logika: silence detection, state machine, recording lifecycle

### Modified Files

- `mobile/app/(child)/hafalan/index.tsx` — Tambah entry point "Mode Membaca" ke continuous screen

### Reused

- `mobile/services/api.ts` → `evaluateHafalan()` (endpoint `/evaluate` di Python sidecar)
- `mobile/hooks/use-audio-recorder.ts` (jika ada) atau langsung gunakan `expo-av`

---

## Silence Detection Mechanism

```
Poll interval : 100ms via setInterval
Silence threshold : metering < -50 dB
Silence duration  : 1500ms berturut-turut → trigger evaluasi
```

Implementation flow:
1. `Audio.Recording` dimulai dengan `meteringEnabled: true`
2. Setiap 100ms: `recording.getStatusAsync()` → cek `metering`
3. Jika `metering < -50`: increment silence counter
4. Jika silence counter × 100ms ≥ 1500ms: stop recording, kirim ke API
5. Setelah evaluasi selesai: auto-start recording untuk ayat berikutnya (delay 300ms)

---

## Hint System

- Setiap ayat punya `wrongCount: number`
- `wrongCount === 3` → ubah state ke `hint_shown`, teks Arab muncul amber
- `wrongCount === 5` → state `skipped`, lanjut ke ayat berikutnya otomatis
- Ayat yang selesai dengan hint ditandai `withHint: true` di result
- Ayat skipped ditandai `skipped: true`

---

## Mushaf Display

- Seluruh ayat ditampilkan dalam satu `<ScrollView>` sebagai teks mengalir continuous (RTL)
- Nomor ayat sebagai medallion inline (٢ gaya mushaf)
- Per-word color coding setelah evaluasi: hijau (correct), merah (wrong), amber (mad_short/hint)
- Pending verses: placeholder mask inline (blurred bars)
- Auto-scroll ke ayat aktif menggunakan `scrollTo` pada container

---

## Data Model

```typescript
interface VerseAttempt {
  verseNumber: number
  attempts: number          // total rekaman untuk ayat ini
  withHint: boolean         // benar setelah hint ditampilkan
  skipped: boolean          // dilewati setelah 5× gagal
  lastScore: number         // skor evaluasi terakhir
  wordResults: WordResult[] // dari API response
}
```

Result screen (screen terpisah yang sudah ada) menerima array `VerseAttempt[]` via navigation params.

---

## Entry Point

Di `hafalan/index.tsx`, setiap surah card mendapat dua tombol:
- **Mulai Per Ayat** → `hafalan/[id]` (mode lama)
- **Mode Membaca** → `hafalan/continuous/[id]` (mode baru)

---

## Scoring Formula (unchanged)

Menggunakan endpoint `/evaluate` yang sama dengan mode hafalan per ayat. Score per ayat dihitung oleh Python sidecar. Summary result screen menampilkan rata-rata score + breakdown per ayat.

---

## Out of Scope

- Background audio / lock screen playback
- Multi-surah session dalam satu sesi continuous
- Offline evaluation (tetap butuh Python sidecar lokal)
