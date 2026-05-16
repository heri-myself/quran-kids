# Hafalan Feature — Design Spec
Date: 2026-05-16

## Overview

Fitur Hafalan memungkinkan anak menguji hafalan Al-Quran per ayat. Teks ayat disembunyikan saat rekam; setelah selesai, setiap kata ditampilkan dengan warna hijau (benar) atau merah (salah). Fitur ini terpisah dari Tilawah dan reuse backend evaluate yang sudah ada.

---

## Architecture

### New Files

**Mobile:**
```
mobile/app/(child)/hafalan/index.tsx      — pilih surah
mobile/app/(child)/hafalan/[id].tsx       — sesi hafalan per ayat
mobile/app/(child)/hafalan/result.tsx     — ringkasan akhir sesi
mobile/hooks/use-hafalan.ts               — recording + evaluate logic
mobile/services/hafalan.ts                — API: saveHafalanSession
```

**Backend:**
```
backend/src/routes/hafalan.ts             — POST /hafalan/session
```

### Modified Files

**Mobile:**
- `mobile/app/(child)/_layout.tsx` — tambah tab "Hafalan"
- `mobile/stores/last-activity-store.ts` — tambah `lastHafalan`
- `mobile/app/(child)/index.tsx` — tambah card "Lanjut Hafalan" di homepage

**Backend:**
- `backend/prisma/schema.prisma` — tambah `HafalanSession`, `HafalanVerseResult`, relasi di `Profile`
- `backend/src/routes/index.ts` — register hafalan route

---

## Data Model

```prisma
model HafalanSession {
  id           String               @id @default(cuid())
  profileId    String
  profile      Profile              @relation(fields: [profileId], references: [id], onDelete: Cascade)
  chapterId    Int
  totalVerses  Int
  avgScore     Int
  pointsEarned Int
  createdAt    DateTime             @default(now())
  verses       HafalanVerseResult[]
}

model HafalanVerseResult {
  id          String         @id @default(cuid())
  sessionId   String
  session     HafalanSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  verseNumber Int
  score       Int
  wordResults Json           // [{ word: string, correct: boolean }]
  createdAt   DateTime       @default(now())

  @@unique([sessionId, verseNumber])
}
```

`Profile` ditambah relasi: `hafalanSessions HafalanSession[]`

---

## API

### Reused
- `POST /tilawah/evaluate` — kirim audio base64 + expectedText, dapat wordResults

### New
**`POST /hafalan/session`** (requires auth)
```
Body: {
  chapterId: number,
  verses: [{ verseNumber: number, score: number, wordResults: object }]
}
Response: { id, pointsEarned, avgScore }
```

**Poin kalkulasi:**
- avgScore ≥ 90 → 50 pts
- avgScore ≥ 70 → 30 pts
- avgScore < 70 → 15 pts

Update `Gamification.totalPoints` dan `lastReadAt` (untuk streak).

---

## Mobile — Hook & State Machine

**`use-hafalan.ts`**

States: `idle → recording → analyzing → done | error`

```
startRecording()  — expo-av Audio.Recording.createAsync
stopRecording()   — stop → readAsBase64 → POST /tilawah/evaluate
saveSession()     — POST /hafalan/session (dipanggil di result screen)
reset()           — kembali idle untuk ayat berikutnya
```

State `done` menyimpan:
```ts
wordResults: { word: string; correct: boolean }[]
score: number
```

---

## UI States — `hafalan/[id].tsx`

| State | Verse Area | Tombol |
|---|---|---|
| `idle` | placeholder dots | 🎙️ Rekam |
| `recording` | waveform merah + timer | ⏹️ Selesai |
| `analyzing` | spinner + "Sedang dinilai..." | disabled |
| `done` | kata hijau/merah | Ayat Berikutnya + Ulangi |
| `error` | pesan error | Coba Lagi |

---

## Navigation Flow

```
Tab: Hafalan
  → hafalan/index.tsx    (pilih surah)
  → hafalan/[id].tsx     (sesi, ?verse=1..n)
  → hafalan/result.tsx   (ringkasan + poin)
```

---

## Error Handling

| Kondisi | Behaviour |
|---|---|
| Mic permission ditolak | Alert → arahkan ke Settings |
| Audio < 1 detik | Toast "Bacaan terlalu singkat" |
| Evaluate timeout/gagal | State `error` + tombol Coba Lagi |
| Save session gagal | Silent retry 1x, toast jika tetap gagal |

---

## Out of Scope

- Real-time word highlighting (streaming audio)
- Badge baru `hafalan_sessions` (bisa ditambah iterasi berikutnya)
- Mode belajar hafalan (teks terlihat)
