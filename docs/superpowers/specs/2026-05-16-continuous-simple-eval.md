# Fast Continuous Reading Validation — Design Spec

## Overview

Mode continuous reading (hafalan & tilawah) saat ini menggunakan endpoint `/evaluate` yang sama dengan tilawah per-ayat — termasuk mad duration check dan tajweed analysis. Ini menyebabkan delay dan false-negatives pada continuous mode karena user tidak diharapkan diskor ketat.

Solusi: tambahkan endpoint `/evaluate-simple` di Python sidecar yang skip tajweed analysis dan gunakan word-accuracy saja sebagai skor. Frontend continuous mode ganti ke endpoint ini.

---

## Backend — `/evaluate-simple`

**File:** `backend/python/tilawah_service.py`

Pipeline:
1. Decode base64 audio → temp file
2. Whisper ASR transcribe (sama dengan `/evaluate`)
3. `compare_texts(expected, transcription)` → `word_results`, `word_accuracy`
4. **SKIP** `detect_mad_errors()` — tidak ada mad duration check
5. **SKIP** `analyze_tajweed()` — tidak ada tajweed scoring
6. `score = word_accuracy` (langsung, bukan formula weighted)
7. Feedback: satu kalimat singkat saja berdasarkan score

Response shape sama persis dengan `/evaluate` (`EvaluateResponse`) — tidak ada perubahan di frontend model.

**Threshold kelulusan (di frontend):** `score >= 50` → ayat dianggap benar, lanjut ke berikutnya.

---

## Frontend — `evaluateVerseSimple()`

**File:** `mobile/services/tilawah.ts`

Tambah fungsi baru:
```typescript
export async function evaluateVerseSimple(
  chapterId: number,
  verseNumber: number,
  expectedText: string,
  audioBase64: string
): Promise<EvaluateResponse>
```

Hit `POST /tilawah/evaluate-simple` (melalui backend Express yang proxy ke Python sidecar).

---

## Backend Express — proxy route

**File:** `backend/src/routes/tilawah.ts`

Tambah route `POST /tilawah/evaluate-simple` yang forward ke `http://localhost:8001/evaluate-simple` — sama persis dengan route `/evaluate` yang sudah ada di file ini (baris 31-73).

---

## Consumers

**`mobile/hooks/use-continuous-hafalan.ts`**
- Ganti `evaluateVerse()` → `evaluateVerseSimple()`
- Threshold kelulusan: `result.score >= 50` (dari `>= 60`)

**`mobile/app/(child)/tilawah/[id].tsx`** (mode continuous)
- Ganti `evaluateVerse()` → `evaluateVerseSimple()`
- Threshold kelulusan: `result.score >= 50`
- Setelah result: tampilkan warna kata → 300ms → lanjut (tidak ada perubahan UX)

---

## Out of Scope

- Tilawah per-ayat (`useTilawah` hook) — tidak berubah, tetap pakai `/evaluate`
- Haptic feedback, animasi tambahan
- Caching hasil evaluasi
