# AI Tilawah Evaluator — Design Spec

**Date:** 2026-05-12
**Status:** Approved

---

## Overview

Fitur latihan membaca Al-Quran dengan penilaian AI. Anak merekam bacaan ayat, sistem mentranskripsi dengan model Whisper khusus Quran (Tarteel AI, open source), membandingkan dengan teks ayat yang benar, dan memberikan skor + feedback detail per kata. Diakses via floating button di bottom nav.

---

## User Flow

```
Home (tap floating 🎙️ button)
  → Pilih Surah (list + rekomendasi surah pendek)
    → Latihan per Ayat:
        Teks Arab ditampilkan
        → Tap Rekam → baca → Tap Stop
          → Loading analisis AI (~2-3 detik)
            → Hasil ayat: bintang + skor + feedback kata
              → Lanjut ayat berikutnya / Ulangi ayat ini
    → (setelah semua ayat)
      → Hasil Akhir Sesi: total skor + poin + badge + rekap
```

---

## Screens

### Screen 1 — Floating Entry Point

Floating button di tengah bottom navigation bar (posisi 3 dari 5):
- Ikon 🎙️ dengan gradient ungu `#7C6FF1 → #9B5DE5`
- Animasi pulse (Reanimated) — lingkaran melebar keluar setiap 2 detik
- Label "AI Tilawah" di bawah tombol
- Bottom nav menjadi 5 item: Beranda | Kisah | **[AI]** | Al-Quran | Hadiah

### Screen 2 — Pilih Surah (`tilawah/index.tsx`)

- Header gradient ungu, judul "🎙️ Latihan Tilawah"
- Search bar filter nama surah
- Seksi **"Surah Pendek (Direkomendasikan)"**: Al-Ikhlas (112), Al-Falaq (113), An-Nas (114), Al-Fatihah (1) — dengan badge rating bintang
- Seksi **"Semua Surah"**: FlatList 114 surah lengkap
- Rating bintang per surah berdasarkan jumlah ayat: ≤10 ayat = ⭐⭐⭐, ≤30 = ⭐⭐, >30 = tidak ada rating

### Screen 3 — Mode Latihan (`tilawah/[id].tsx`)

- Background dark `#1A1A2E` (mode fokus)
- Progress bar atas: "Ayat X / N"
- Kartu ayat: nomor ayat (badge ungu) + teks Arab besar (serif, RTL) + terjemahan Indonesia
- Area rekam bawah:
  - Status: "Tap untuk mulai" / "🔴 Sedang merekam..." / "⏳ Menganalisis..."
  - Waveform animasi saat rekam (Reanimated — bar naik-turun)
  - Tombol besar: Mikrofon (idle) → Stop (recording) → Loading spinner (analyzing)
- Setelah analisis: highlight kata per kata (hijau = benar, merah = salah/perlu perhatian)

### Screen 4 — Hasil Akhir Sesi (`tilawah/result.tsx`)

- Bintang 1–3 (Lottie animation saat muncul)
- Skor rata-rata (0–100)
- Poin yang didapat (Lottie confetti jika ≥ 2 bintang)
- Badge baru jika ada pencapaian
- Rekap per ayat: bar chart skor tiap ayat
- Tombol: "Ulangi Surah" / "Kembali ke Home"

---

## Arsitektur Sistem

### Mobile (React Native / Expo)

```
expo-av          → Rekam audio (m4a/wav)
expo-file-system → Baca file audio sebagai base64
fetch            → POST ke backend /api/tilawah/evaluate
                   body: { chapterId, verseNumber, audioBase64 }
Response         → { score, wordResults[], feedback[] }
Lottie           → Animasi bintang & confetti
Reanimated       → Waveform, pulse button, transisi
```

### Backend (Fastify + Python Sidecar)

Karena model ML Python tidak bisa jalan langsung di Node.js, gunakan **Python sidecar** — service terpisah yang dijalankan bersama backend:

```
Mobile
  → POST /api/tilawah/evaluate  (Fastify / Node.js)
       ↓
  Python Sidecar (FastAPI, port 8001)
       ↓ load audio base64
  tarteel-ai/whisper-base-ar-quran  (HuggingFace Transformers)
       ↓ transkripsi Arab
  Tajweed Rules Engine (Python)
       ↓ bandingkan dengan teks ayat (quran.com data)
  → { transcription, wordResults, tajweedIssues }
       ↓
  Fastify → scoring → simpan ke DB → response ke mobile
```

### Python Sidecar

File: `backend/python/tilawah_service.py`

Library:
- `fastapi` + `uvicorn` — HTTP server
- `transformers` + `torch` — load Whisper model
- `arabic-reshaper` — normalisasi teks Arab untuk perbandingan

### Tajweed Rules Engine

Rules programatik berdasarkan harakat pada `text_uthmani` dari quran.com:

| Rule | Deteksi |
|---|---|
| **Mad Thabi'i** (2 harakat) | Huruf mad (ا و ي) setelah harakat panjang |
| **Mad Wajib/Jaiz** (4-6 harakat) | Mad bertemu hamzah dalam satu kata |
| **Ghunnah** | Nun/Mim bertasydid |
| **Idgham** | Nun mati/tanwin bertemu huruf idgham |
| **Qalqalah** | Huruf qalqalah (ق ط ب ج د) sukun |

Untuk versi pertama: **deteksi Mad Thabi'i dan Ghunnah saja** — paling umum dan paling mudah diajarkan ke anak SD.

---

## Sistem Penilaian

### Per Ayat (0–100)

```
Akurasi Kata     = (kata benar / total kata) × 60
Panjang-Pendek   = estimasi dari durasi audio vs durasi ideal × 20
Kelengkapan      = tidak ada kata yang skip × 20
```

**Durasi ideal:** dihitung dari jumlah suku kata + mad dalam ayat × rata-rata 0.3 detik/suku kata.

### Bintang

| Skor | Bintang |
|---|---|
| ≥ 85 | ⭐⭐⭐ |
| 65–84 | ⭐⭐ |
| < 65 | ⭐ |

### Poin Gamifikasi

| Hasil | Poin |
|---|---|
| 1 bintang | +10 |
| 2 bintang | +25 |
| 3 bintang | +50 |
| Sempurna (100) | +75 |

---

## Database

Tambah model baru di Prisma:

```prisma
model TilawahSession {
  id          String   @id @default(cuid())
  profileId   String
  chapterId   Int
  totalScore  Int
  stars       Int
  pointsEarned Int
  createdAt   DateTime @default(now())
  profile     Profile  @relation(fields: [profileId], references: [id])
  verses      TilawahVerseResult[]
}

model TilawahVerseResult {
  id            String   @id @default(cuid())
  sessionId     String
  verseNumber   Int
  score         Int
  wordAccuracy  Int
  tajweedScore  Int
  feedback      Json
  session       TilawahSession @relation(fields: [sessionId], references: [id])
}
```

---

## File yang Dibuat / Dimodifikasi

**Mobile — Baru:**
- `mobile/app/(child)/tilawah/index.tsx` — pilih surah
- `mobile/app/(child)/tilawah/[id].tsx` — mode latihan per ayat
- `mobile/app/(child)/tilawah/result.tsx` — hasil akhir sesi
- `mobile/hooks/use-tilawah.ts` — hook evaluasi + state management
- `mobile/services/tilawah.ts` — API call ke backend
- `mobile/assets/animations/stars.json` — Lottie bintang
- `mobile/assets/animations/confetti.json` — Lottie confetti

**Mobile — Modifikasi:**
- `mobile/app/(child)/_layout.tsx` — tambah floating button + route tilawah

**Backend — Baru:**
- `backend/python/tilawah_service.py` — FastAPI + Whisper model
- `backend/python/tajweed_engine.py` — rules tajweed
- `backend/python/requirements.txt`
- `backend/src/routes/tilawah.ts` — Fastify route proxy ke Python sidecar
- `backend/prisma/schema.prisma` — tambah model TilawahSession + TilawahVerseResult

---

## Out of Scope (versi pertama)

- Deteksi tajweed selain Mad Thabi'i dan Ghunnah
- Rekaman ulang per kata (hanya per ayat)
- Riwayat sesi tilawah di profile anak
- Leaderboard antar anak
- Mode offline (butuh koneksi untuk analisis AI)
- Suara feedback (TTS)
