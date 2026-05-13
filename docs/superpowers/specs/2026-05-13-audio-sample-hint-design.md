# Audio Sample Hint — Implementation Design

**Goal:** Setelah user 3x merekam ayat yang sama (tanpa peduli skor), tampilkan bottom sheet tawaran audio contoh bacaan yang benar dari qari Al-Husary Muallim.

**Architecture:** Perubahan mobile-only. Tidak ada backend change. Audio diambil langsung dari quran.com CDN via API v4. Dua file yang berubah: hook `use-tilawah.ts` dan screen `tilawah/[id].tsx`.

**Tech Stack:** expo-av (sudah terinstall), quran.com API v4 recitations (recitation ID 12 = Mahmoud Al-Husary Muallim), React Native Modal/Animated.

---

## Files

- Modify: `mobile/hooks/use-tilawah.ts` — tambah `retryCount` state
- Modify: `mobile/app/(child)/tilawah/[id].tsx` — tambah `AudioSampleSheet` component + trigger logic

---

## Design Detail

### 1. Hook — `use-tilawah.ts`

Tambah `retryCount: number` ke state hook. Increment setiap kali `stopAndEvaluate()` selesai (resolved, apapun hasilnya — score tinggi atau rendah). Reset ke 0 setiap kali `reset()` dipanggil.

```ts
const [retryCount, setRetryCount] = useState(0)

// di dalam stopAndEvaluate(), setelah setRecordingState('done') atau setRecordingState('error'):
setRetryCount(c => c + 1)

// di dalam reset():
setRetryCount(0)
```

Return value tambah `retryCount`.

### 2. Screen — `AudioSampleSheet` component

Komponen inline di `tilawah/[id].tsx`. Ditampilkan sebagai React Native `Modal` (transparent, animateType slide) dari bawah layar.

**Trigger:** `isDone && retryCount >= 3 && !sheetDismissed`

**State lokal di screen:**
```ts
const [sheetDismissed, setSheetDismissed] = useState(false)
const [audioPlaying, setAudioPlaying] = useState(false)
```

Reset `sheetDismissed = false` setiap kali pindah ayat (di `handleNext` sebelum `reset()`).

**Audio URL:**
```
GET https://api.quran.com/api/v4/recitations/12/by_ayah/{chapterId}:{verseNumber}
Response: { audio_files: [{ verse_key: "1:1", url: "https://..." }] }
```

Fetch URL saat user tap "Dengar Contoh", lalu play dengan `expo-av` `Sound.createAsync({ uri })`.

**UI Bottom Sheet:**
```
┌─────────────────────────────┐
│        ▬▬▬  (handle)        │
│  🎧 Mau dengar contoh?      │
│  Sudah 3x mencoba ayat ini  │
│                             │
│  [▶▶▶▶▶▶▶▶▶] Al-Fatihah:1  │  ← waveform animasi saat play
│                             │
│  [ Lewati ]  [ ▶ Dengar ]   │
└─────────────────────────────┘
```

**Behaviour:**
- Tap **Lewati** → `setSheetDismissed(true)`, sheet tutup, user bisa retry atau next
- Tap **▶ Dengar Contoh** → fetch audio URL → play → sheet tutup setelah audio selesai
- Sheet hanya muncul **sekali per ayat** — setelah dismiss tidak muncul lagi meski retry lagi
- Pindah ayat → `sheetDismissed` reset ke `false`, `retryCount` reset ke 0

### 3. State Flow

```
retryCount 0,1,2   → tidak ada hint
retryCount >= 3    → isDone → tampilkan bottom sheet
tap "Lewati"       → sheetDismissed = true
tap "Dengar"       → fetch + play audio → sheetDismissed = true
pindah ayat        → retryCount = 0, sheetDismissed = false
```

### 4. Waveform Animasi

Gunakan komponen `WaveformBar` yang sudah ada di `tilawah/[id].tsx` (Reanimated). Aktifkan saat `audioPlaying === true`.

---

## Error Handling

- Jika fetch audio URL gagal (network error): tampilkan pesan "Audio tidak tersedia" di dalam sheet, tombol "Dengar" disabled
- Jika audio gagal play: sama, show error message inline
- Tidak crash app, sheet tetap bisa di-dismiss

---

## Out of Scope

- Tidak ada perubahan backend
- Tidak ada penyimpanan history "sudah dengar contoh"
- Tidak ada pilihan qari lain oleh user
