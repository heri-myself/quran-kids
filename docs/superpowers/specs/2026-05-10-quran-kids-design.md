# Quran Kids App — Design Spec
**Date:** 2026-05-10  
**Status:** Approved

---

## Overview

Aplikasi Quran interaktif untuk anak-anak berbasis storytelling — kisah para sahabat Nabi dan kisah Al-Quran dengan ilustrasi sunnah, audio narasi, dan sistem gamifikasi lengkap. Target platform awal: Android.

**Tiga produk dalam satu ekosistem:**
1. Mobile App (React Native + Expo) — untuk anak & orang tua
2. Backend API (Fastify + PostgreSQL + Prisma) — di VPS
3. Admin Panel (Next.js web) — untuk upload dan kelola konten

---

## Target Pengguna

- **Anak** usia 4–12 tahun sebagai pengguna utama konten
- **Orang tua** sebagai pengelola akun, monitor aktivitas, dan pengambil keputusan berlangganan
- Satu akun orang tua dapat memiliki beberapa profil anak (family sharing)

---

## Format Konten

- Teks per halaman: Arab + Latin + Terjemahan Indonesia
- Ilustrasi full-width per halaman (dibuat sendiri, upload bertahap)
- Audio narasi opsional per halaman (tombol Play)
- Konten dikelola via Admin Panel, disimpan di VPS

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────┐
│           React Native + Expo (Android)          │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Child UI │  │Parent UI │  │  Admin Panel  │  │
│  │ (stories,│  │(dashboard│  │  (Web, Next.js│  │
│  │  games)  │  │ control) │  │  upload CMS)  │  │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
└───────┼─────────────┼───────────────┼────────────┘
        │             │               │
        └─────────────┴───────────────┘
                      │ HTTPS REST API
        ┌─────────────▼────────────────┐
        │    Fastify v5 + Node.js      │
        │  JWT Auth | REST API         │
        │  File Upload (Audio/Image)   │
        └─────────────┬────────────────┘
                      │
        ┌─────────────▼────────────────┐
        │    PostgreSQL 16 (VPS)       │
        │    Prisma ORM                │
        └──────────────────────────────┘
```

File statis (ilustrasi + audio) disimpan di `/uploads/` VPS, diserve via `@fastify/static`.

---

## Database Schema (PostgreSQL)

```sql
users
  id, email, password_hash, role (parent|child|admin), created_at, updated_at

profiles
  id, user_id (FK), name, avatar, age
  role (parent|child), parent_id (FK → profiles)

stories
  id, title, slug, category (sahabat_nabi|kisah_quran|akhlaq)
  difficulty_level (easy|medium|hard), is_premium (boolean)
  cover_image_url, total_pages, created_at

story_pages
  id, story_id (FK), page_number
  text_arabic, text_latin, text_translation
  illustration_url, audio_url, duration_seconds

gamification
  id, profile_id (FK)
  total_points, current_level, current_streak, last_read_at

badges
  id, name, description, icon_url
  requirement_type (stories_completed|streak_days|points)
  requirement_value

user_badges
  id, profile_id (FK), badge_id (FK), earned_at

reading_progress
  id, profile_id (FK), story_id (FK)
  last_page, is_completed, completed_at

subscriptions
  id, user_id (FK), plan (monthly|yearly)
  status (active|expired), started_at, expires_at
```

---

## Fitur & Layar Mobile App

### Mode Anak
| Layar | Deskripsi |
|-------|-----------|
| Splash / Onboarding | Logo, pilih profil anak (avatar + nama besar) |
| Home | Greeting + streak, lanjutkan kisah, kategori, poin & level |
| Story List | Grid card kisah, badge GRATIS/PREMIUM, filter kategori |
| Story Reader | Ilustrasi full-width, teks 3 bahasa, tombol audio, progress bar halaman, konfeti saat selesai |
| Rewards | Koleksi badge, total poin + level, streak calendar, leaderboard antar profil |

### Mode Orang Tua (PIN protected)
| Layar | Deskripsi |
|-------|-----------|
| Parent Dashboard | Ringkasan aktivitas tiap anak, waktu belajar |
| Kontrol Konten | Aktifkan/nonaktifkan kategori per profil anak |
| Kelola Profil | Tambah, edit, hapus profil anak |
| Langganan | Status aktif, upgrade premium, riwayat pembayaran |

---

## Backend API Endpoints

```
Auth
  POST /auth/register
  POST /auth/login
  POST /auth/refresh

Profiles
  GET    /profiles
  POST   /profiles
  PUT    /profiles/:id
  DELETE /profiles/:id

Stories
  GET  /stories              (filter: kategori, premium)
  GET  /stories/:slug
  GET  /stories/:slug/pages

Progress & Gamifikasi
  POST /progress
  GET  /gamification/:profileId

Subscription
  GET  /subscription
  POST /subscription/activate   (Midtrans webhook)

Admin (role=admin)
  POST   /admin/stories
  POST   /admin/stories/:id/pages
  PUT    /admin/stories/:id
  DELETE /admin/stories/:id
```

---

## Admin Panel (Next.js Web)

- Login akun admin
- Dashboard: list semua kisah, status draft/published
- Form upload kisah: judul, kategori, cover, toggle premium
- Form upload per halaman: teks Arab/Latin/terjemahan, ilustrasi, audio
- Preview kisah sebelum publish

---

## Monetisasi

### Freemium
- **Gratis:** 5–10 kisah pertama per kategori, semua fitur gamifikasi aktif
- **Premium:** Semua kisah (target 50+), audio full, ilustrasi eksklusif

### Paket Langganan
| Paket | Harga |
|-------|-------|
| Bulanan | Rp 29.000/bulan |
| Tahunan | Rp 249.000/tahun (~30% hemat) |

1 akun = semua profil anak (family sharing)

**Payment Gateway:** Midtrans (QRIS, transfer bank, e-wallet)

---

## Sistem Gamifikasi

### Poin
| Aksi | Poin |
|------|------|
| Selesai baca 1 kisah | +50 |
| Streak harian | +20/hari |
| Baca 3 kisah dalam sehari | +30 bonus |

### Level
| Level | Nama | Threshold |
|-------|------|-----------|
| 1 | Santri Baru | 0–200 |
| 2 | Pencari Ilmu | 201–500 |
| 3 | Hafizh Muda | 501–1000 |
| 4 | Sahabat Sejati | 1001–2000 |
| 5 | Ulama Cilik | 2001+ |

### Badge Contoh
- "Pembaca Perdana" — selesai kisah pertama
- "Api Semangat" — streak 7 hari
- "Sahabat Abu Bakar" — selesai semua kisah Abu Bakar
- "Khatam Kategori" — selesai 1 kategori penuh

---

## Tech Stack

### Mobile App
- React Native + Expo SDK 52
- Expo Router v4 (file-based navigation)
- NativeWind v4 (Tailwind styling)
- Zustand (state management)
- TanStack Query (data fetching + caching)
- Expo AV (audio player)
- React Native Reanimated 3 (animasi)
- React Native Lottie (animasi konfeti/reward)

### Backend API
- Node.js + Fastify v5
- Prisma ORM + PostgreSQL 16
- @fastify/jwt (JWT auth)
- @fastify/multipart (upload file)
- @fastify/static (serve file statis)
- Zod (validasi request)

### Admin Panel
- Next.js 15 App Router
- shadcn/ui + Tailwind CSS
- TanStack Query
- React Hook Form + Zod

### DevOps (VPS)
- PM2 (process manager)
- Nginx (reverse proxy)
- PostgreSQL 16
- SSL via Certbot (Let's Encrypt)

---

## Struktur Folder Mobile App

```
quran-kids/
├── app/
│   ├── (auth)/            # login, register, pilih profil
│   ├── (child)/           # home, stories, reader, rewards
│   ├── (parent)/          # dashboard, settings, subscription
│   └── _layout.tsx
├── components/            # UI components reusable
├── hooks/                 # custom hooks
├── stores/                # Zustand stores
├── services/              # API calls (TanStack Query)
├── constants/             # warna, tema, level config
└── assets/                # font, icon lokal
```

---

## Success Criteria MVP

- [ ] Anak bisa login via profil, baca kisah dengan audio, dapat poin & badge
- [ ] Orang tua bisa monitor aktivitas dan upgrade langganan
- [ ] Admin bisa upload kisah baru via web panel
- [ ] Pembayaran via Midtrans berjalan (minimal QRIS)
- [ ] Berjalan smooth di Android (target minimum Android 10)
