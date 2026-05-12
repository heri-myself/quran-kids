# Quran Kids — Fitur Saat Ini

> Terakhir diperbarui: 2026-05-12

---

## Stack Teknis

- **Mobile:** Expo (React Native), Expo Router (file-based routing), TanStack Query v5, AsyncStorage
- **Backend:** Fastify + Prisma + PostgreSQL, JWT auth
- **Admin:** React (Vite) + shadcn/ui
- **API Quran:** quran.com API v4 (gratis, tanpa auth)

---

## Struktur Navigasi Mobile

```
app/
├── index.tsx                  → Entry point (redirect ke auth atau child)
├── _layout.tsx                → Root layout, QueryClientProvider
│
├── (auth)/
│   ├── login.tsx              → Login dengan email + password
│   ├── register.tsx           → Daftar akun baru
│   └── profiles.tsx           → Pilih profil anak
│
├── (child)/                   → Area anak (bottom tab navigation)
│   ├── index.tsx              → Home: menu fitur + kisah pilihan
│   ├── stories/
│   │   ├── index.tsx          → Daftar kisah (filter kategori)
│   │   └── [slug].tsx         → Reader kisah per halaman (audio player)
│   ├── quran/
│   │   ├── index.tsx          → Daftar 114 surah (search, nama Arab SVG)
│   │   └── [id].tsx           → Reader word-by-word (kata Arab + arti + terjemahan)
│   └── rewards.tsx            → Lencana & pencapaian gamifikasi
│
└── (parent)/                  → Area orang tua (PIN gate)
    ├── index.tsx              → Dashboard: ringkasan aktivitas anak
    ├── profiles.tsx           → Kelola profil anak
    └── subscription.tsx       → Halaman langganan
```

---

## Fitur per Area

### Auth
| Fitur | Detail |
|---|---|
| Register | Email + password, simpan ke backend |
| Login | JWT, token disimpan di SecureStore |
| Pilih profil | Satu akun bisa punya banyak profil anak |

### Home (Child)
| Fitur | Detail |
|---|---|
| Salam + nama profil | "Assalamu'alaikum, {nama}!" |
| Streak harian 🔥 | Jumlah hari berturut-turut membaca |
| Poin & Level ⭐ | Progress bar poin, Level 1–5 (200 poin/level) |
| Menu Fitur Utama | Kartu: Al-Quran, Hadist (segera), Kisah Teladan |
| Kisah Pilihan | 4 kisah terbaru dari backend |

### Al-Quran
| Fitur | Detail |
|---|---|
| Daftar 114 surah | Nomor, nama latin, nama Indonesia, jumlah ayat, jenis (Makkiyyah/Madaniyyah) |
| Nama Arab surah | SVG bundle lokal (`assets/surah-names/001.svg`–`114.svg`) |
| Search surah | Filter real-time by nama latin / nama Indonesia |
| Reader word-by-word | Kartu per ayat: grid kata Arab RTL + arti (EN) + terjemahan Indonesia (Kemenag) |
| Bismillah | Ditampilkan di atas tiap surah kecuali Al-Fatihah (1) dan At-Taubah (9) |
| Offline cache | AsyncStorage per surah (`qk_chapters`, `qk_surah_{id}`), TanStack Query staleTime: Infinity |

### Kisah Teladan
| Fitur | Detail |
|---|---|
| Daftar kisah | Filter kategori: Sahabat Nabi, Kisah Al-Quran, Akhlaq |
| Reader kisah | Paginasi per halaman, AudioPlayer (play/pause/progress) |
| Konten | Dari backend (Fastify API), dengan slug |

### Gamifikasi (Rewards)
| Fitur | Detail |
|---|---|
| Poin | Bertambah saat menyelesaikan kisah/surah |
| Level | 5 level, setiap 200 poin naik level |
| Streak | Hitung hari berturut-turut membaca |
| Lencana (Badge) | Pencapaian khusus (badge dengan gambar & deskripsi) |
| Rewards screen | Tampilkan semua badge yang diraih |

### Parent Mode
| Fitur | Detail |
|---|---|
| PIN Gate | Masuk mode orang tua via PIN 4 digit |
| Dashboard | Ringkasan aktivitas anak (poin, streak, kisah dibaca) |
| Kelola profil | Tambah / edit profil anak |
| Subscription | Halaman info & kelola langganan |

---

## Backend — Model Data (Prisma)

| Model | Kegunaan |
|---|---|
| `User` | Akun orang tua (email, password hash) |
| `Profile` | Profil anak (nama, avatar, PIN) |
| `Story` | Konten kisah (judul, slug, kategori, audio URL) |
| `StoryPage` | Halaman per kisah (teks, urutan) |
| `Gamification` | Poin, level, streak per profil |
| `Badge` | Definisi lencana (nama, deskripsi, gambar) |
| `UserBadge` | Lencana yang diraih profil |
| `ReadingProgress` | Progress membaca per kisah per profil |
| `Subscription` | Status langganan per user |

---

## Komponen Reusable

| Komponen | Kegunaan |
|---|---|
| `RIcon` | SVG icon set (home, book, trophy, star, quran, dll) |
| `StoryCard` | Kartu kisah (thumbnail, judul, kategori) |
| `AudioPlayer` | Player audio kisah (play/pause, progress bar) |
| `BadgeCard` | Kartu lencana gamifikasi |
| `LevelBadge` | Badge level anak |
| `ProgressBar` | Bar progress generic |

---

## Fitur yang Belum Ada (Planned)

- Hadist (menu sudah ada, konten belum)
- Audio per ayat Al-Quran
- Bookmark ayat
- Tab Juz di daftar surah
- Integrasi Quran reading ke sistem streak/poin
- Push notification pengingat streak
