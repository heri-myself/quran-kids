# Al-Quran Feature — Design Spec

**Date:** 2026-05-12  
**Status:** Approved  

---

## Overview

Tambahkan tab "Al-Quran" ke bottom navigation di child layout. Fitur menampilkan 114 surah dengan reader word-by-word (per kata Arab + arti per kata + terjemahan ayat), mengikuti gaya aplikasi Al-Quran Tafsir by Word. Warna mengikuti design system app yang sudah ada (ungu `#7C6FF1`).

---

## Screens

### Screen 1 — Daftar Surah (`quran/index.tsx`)

- Header ungu dengan judul "Al-Quran 📖" dan subtitle "114 Surah"
- Search bar untuk filter nama surah
- Tab **Surah** dan **Juz** (tab Juz bisa diimplementasi setelah Surah selesai)
- List 114 surah, tiap baris:
  - Nomor surah (kotak border ungu)
  - Nama latin + nama Indonesia + jumlah ayat + jenis (Makkiyyah/Madaniyyah)
  - Nama Arab kanan → **image PNG dari bundle lokal** (`assets/surah-names/001.png` … `114.png`)
- Tap baris → navigasi ke reader `quran/[id].tsx`

### Screen 2 — Reader Word-by-Word (`quran/[id].tsx`)

- Header ungu: tombol back (←), nama surah latin, subtitle "Surah {nomor} · {n} Ayat · {jenis}"
- Bismillah di atas (kecuali Surah At-Taubah / surah 9) — ditampilkan sebagai image
- Tiap ayat dalam kartu putih:
  - Badge nomor ayat (lingkaran ungu)
  - Grid kata Arab kanan-ke-kiri (`direction: rtl`) — tiap kata dalam kotak dengan arti di bawahnya (bahasa Inggris dari API)
  - Garis pemisah
  - Terjemahan bahasa Indonesia per ayat
- Scroll vertikal tanpa batas

---

## Navigasi

Bottom nav child layout diubah dari 3 tab menjadi 4 tab:

```
Beranda | Kisah | Al-Quran | Hadiah
```

Icon Al-Quran: tambah path SVG baru ke `RIcon.tsx` (`quran-fill` dan `quran-line`).

---

## Data Source

**API:** quran.com API v4 — gratis, tidak perlu autentikasi.

| Endpoint | Kegunaan | Cache key |
|---|---|---|
| `GET /api/v4/chapters` | List 114 surah | `qk_chapters` |
| `GET /api/v4/verses/by_chapter/{id}?words=true&translations=33&fields=text_uthmani` | Ayat + word-by-word + terjemahan ID | `qk_surah_{id}` |

**Translation ID 33** = terjemahan bahasa Indonesia (Kemenag).

**Gambar nama surah:** Bundle lokal di `mobile/assets/surah-names/` — 114 file PNG. Source: `cdn.qurancdn.com/images/quranic-place/` (download saat build).

---

## Caching

Library: `@react-native-async-storage/async-storage` (sudah tersedia di Expo).

```
useChapters()
  └─ cek AsyncStorage "qk_chapters"
       ├─ ada → return (offline)
       └─ tidak ada → fetch → simpan → return

useSurah(id)
  └─ cek AsyncStorage "qk_surah_{id}"
       ├─ ada → return (offline)
       └─ tidak ada → fetch → simpan → return
```

Setiap surah di-cache saat pertama kali dibuka. Surah yang belum pernah dibuka memerlukan koneksi internet.

---

## File yang Dibuat / Dimodifikasi

**Baru:**
- `mobile/app/(child)/quran/index.tsx` — daftar surah
- `mobile/app/(child)/quran/[id].tsx` — reader word-by-word
- `mobile/services/quran.ts` — fetch API + cache logic
- `mobile/hooks/use-quran.ts` — useChapters, useSurah hooks
- `mobile/assets/surah-names/001.png` … `114.png` — bundle gambar nama surah

**Dimodifikasi:**
- `mobile/app/(child)/_layout.tsx` — tambah tab Al-Quran (4 tab total)
- `mobile/components/RIcon.tsx` — tambah icon `quran-fill` dan `quran-line` (SVG path dari Remix Icon `book-open-fill` dan `book-open-line`)

---

## Out of Scope (versi pertama)

- Audio per ayat atau per kata
- Tafsir
- Bookmark / tandai ayat
- Tab Juz di screen daftar
- Download semua surah sekaligus
- Progress membaca
