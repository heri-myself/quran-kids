# Fitur Hadits — Design Spec

**Date:** 2026-05-12
**Status:** Approved

---

## Overview

Tambahkan fitur Hadits ke aplikasi Quran Kids. Konten hadits di-bundle sebagai JSON lokal (~300 hadits) — offline sepenuhnya tanpa API call. Dua screen: daftar hadits (search + filter kategori) dan detail hadits (teks Arab + terjemahan Indonesia + pelajaran untuk anak).

---

## Screens

### Screen 1 — Daftar Hadits (`hadits/index.tsx`)

- Header kuning `#F59E0B` dengan judul "Hadits 📜" dan subtitle
- Search bar untuk filter teks hadits / perawi
- Chip filter kategori: **Semua, Akhlaq, Ibadah, Keluarga, Ilmu, Doa**
- FlatList kartu hadits, tiap kartu:
  - Label nomor + kategori (e.g. "HADITS #1 · AKHLAQ")
  - Teks terjemahan Indonesia (2–3 baris, truncated)
  - Tag sumber/perawi (e.g. "HR. Bukhari")
- Tap kartu → navigasi ke `hadits/[id].tsx`

### Screen 2 — Detail Hadits (`hadits/[id].tsx`)

- Header kuning: tombol back, judul "Detail Hadits", subtitle nomor + kategori
- Kartu kuning muda: teks Arab (font serif, RTL, ukuran besar)
- Terjemahan Indonesia lengkap (italic)
- Perawi (nama kitab)
- Kotak "💡 Pelajaran untuk Kita" — penjelasan sederhana anak-anak

---

## Navigasi

Fitur Hadits **tidak** ditambahkan ke bottom tab navigation — diakses dari home feature menu card "Hadits" yang sudah ada. Bottom nav tetap 4 tab (Beranda, Kisah, Al-Quran, Hadiah).

Route: `/(child)/hadits/index` dan `/(child)/hadits/[id]` — keduanya hidden dari tab bar.

---

## Data

**Format JSON lokal** — `mobile/assets/hadits/hadits.json`

```json
[
  {
    "id": 1,
    "arabic": "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    "indonesia": "Sesungguhnya setiap amalan tergantung pada niatnya, dan setiap orang akan mendapatkan sesuai niatnya.",
    "perawi": "HR. Bukhari & Muslim",
    "kategori": "akhlaq",
    "pelajaran": "Niat itu penting! Sebelum melakukan kebaikan, niatkan karena Allah agar pahala kita sempurna."
  }
]
```

**Kategori:** `akhlaq` | `ibadah` | `keluarga` | `ilmu` | `doa`

**Jumlah:** ~300 hadits pilihan yang sesuai untuk anak-anak, dikurasi dari Arbain Nawawi + hadits pilihan Bukhari, Muslim, Tirmidzi, Abu Dawud, Ibnu Majah.

**Data generation:** Script `scripts/generate-hadits.ts` — fetch dari `https://hadith-api.vercel.app` (API gratis, koleksi EN) lalu terjemahkan/kurasi ke format Indonesia. Data disimpan sekali, tidak perlu regenerate.

---

## File yang Dibuat / Dimodifikasi

**Baru:**
- `mobile/assets/hadits/hadits.json` — ~300 hadits bundle lokal
- `mobile/app/(child)/hadits/index.tsx` — daftar hadits
- `mobile/app/(child)/hadits/[id].tsx` — detail hadits
- `mobile/hooks/use-hadits.ts` — useHadits(), useHaditsById(id)

**Dimodifikasi:**
- `mobile/app/(child)/_layout.tsx` — tambah route hadits/index dan hadits/[id] sebagai hidden screens
- `mobile/app/(child)/index.tsx` — aktifkan route pada kartu Hadits di feature menu

---

## Out of Scope (versi pertama)

- Audio hadits
- Bookmark hadits
- Hadits harian (random setiap hari)
- Integrasi poin/gamifikasi dari membaca hadits
- Pencarian teks Arab
