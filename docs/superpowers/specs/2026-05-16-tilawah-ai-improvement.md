# Tilawah AI Improvement — Design Spec

**Goal:** Improve tilawah and hafalan evaluation accuracy by upgrading the Whisper model, replacing naive positional word comparison with sequence alignment, and adding real mad (panjang pendek) detection using word-level timestamps.

**Date:** 2026-05-16

---

## Problem

Current implementation has two compounding issues:

1. **Model terlalu kecil** — `tarteel-ai/whisper-base-ar-quran` (74M params) sering salah transkripsi, terutama ayat dengan harakat kompleks.
2. **Algoritma perbandingan naif** — positional word-by-word comparison: satu kata salah membuat semua kata setelahnya ikut dianggap salah.
3. **Tajweed heuristik** — analisis mad/ghunnah hanya berdasarkan durasi total rekaman, bukan per kata. Tidak akurat dan tidak actionable.

---

## Architecture

Perubahan sepenuhnya terlokalisir di Python sidecar (`backend/python/`). Tidak ada perubahan di Node/Fastify, Prisma schema, atau kontrak API — hanya field `word_results` yang mendapat status baru `"mad_short"`.

### Three Layers

**Layer 1 — Transkripsi lebih akurat**
- Ganti model: `tarteel-ai/whisper-base-ar-quran` → `tarteel-ai/whisper-small-ar-quran` (244M params, ~3× lebih besar)
- Ganti library: raw `transformers` → `stable-ts` (stable-whisper)
- `stable-whisper` mengekstrak word-level timestamps dari attention map Whisper — tanpa model tambahan

**Layer 2 — Perbandingan kata lebih cerdas**
- Ganti `compare_texts()` dari positional ke `difflib.SequenceMatcher`
- Handles insertions, deletions, reorderings dengan benar
- Satu kata salah tidak merusak penilaian kata setelahnya

**Layer 3 — Deteksi mad (panjang pendek)**
- `detect_mad_errors()` baru di `tajweed_engine.py`
- Input: expected text + word timestamps dari stable-whisper
- Identifikasi kata yang mengandung mad pattern (fathah+alef, kasrah+ya, dammah+waw)
- Bandingkan durasi kata aktual vs threshold per jenis mad:
  - Mad 2 harakat → durasi ≥ 0.25s
  - Mad 4 harakat → durasi ≥ 0.40s
  - Mad 6 harakat → durasi ≥ 0.55s
- Status `"mad_short"` jika durasi tidak memenuhi threshold

---

## Word Result Status

| Status | Warna Mobile | Makna |
|---|---|---|
| `correct` | Hijau | Kata benar, mad cukup |
| `wrong` | Merah | Kata salah diucapkan |
| `missing` | Merah | Kata tidak diucapkan |
| `mad_short` | Kuning | Kata benar tapi mad terlalu pendek |

---

## Scoring

```
tajweed_score = 100 - (jumlah mad_short × 10), min 50
score = word_accuracy × 0.60 + tajweed_score × 0.25 + completeness × 0.15
```

`completeness` = 100 jika tidak ada kata `missing`, 70 jika ada.

---

## Data Flow

```
Mobile → POST /evaluate { audio_base64, expected_text, verse_number, chapter_id }
  ↓
stable-whisper transcribe → transcription + word_timestamps[]
  ↓
compare_texts(difflib) → word_results [correct/wrong/missing]
  ↓
detect_mad_errors(timestamps) → update mad_short status
  ↓
hitung score
  ↓
return { transcription, word_results, word_accuracy, tajweed_score, score, feedback[] }
```

---

## Files Changed

### `backend/python/tilawah_service.py`
- Hapus import `WhisperProcessor`, `WhisperForConditionalGeneration` dari transformers
- Tambah import `stable_whisper`
- `get_model()` load `stable_whisper.load_model("tarteel-ai/whisper-small-ar-quran")`
- `evaluate()` gunakan `model.transcribe()` yang mengembalikan result dengan `.segments` berisi word timestamps
- Ekstrak `word_timestamps: list[{word, start, end}]` dan teruskan ke `detect_mad_errors()`

### `backend/python/tajweed_engine.py`
- `compare_texts()`: ganti loop positional dengan `difflib.SequenceMatcher(None, expected_norm, transcribed_norm)`
  - opcode `equal` → `correct`
  - opcode `replace` → `wrong`
  - opcode `delete` → `missing`
  - opcode `insert` → abaikan (extra kata dari transkripsi)
- `detect_mad_errors(word_results, word_timestamps, expected_words)`: fungsi baru
  - Untuk tiap kata di word_results yang status-nya `correct`, cek apakah mengandung mad pattern
  - Ambil timestamp kata dari word_timestamps (match by index/word)
  - Hitung durasi = `end - start`
  - Tentukan jenis mad: 2/4/6 harakat berdasarkan konteks (default: 2 harakat)
  - Jika durasi < threshold → ubah status ke `"mad_short"`
- `analyze_tajweed()`: hitung tajweed_score dari jumlah `mad_short`, hapus heuristik durasi total

### `backend/python/requirements.txt`
- Ganti `transformers` entry dengan `stable-ts>=2.17`
- Pertahankan `torch`, `av`, `fastapi`, `uvicorn`, `numpy`

### `mobile/app/(child)/tilawah/[id].tsx`
- Tambah warna kuning untuk status `mad_short` di WordResultRow component
- Tambah label "Mad pendek" di bawah kata kuning (opsional, bisa tooltip)

### `mobile/app/(child)/hafalan/[id].tsx`
- Sama seperti tilawah — tambah warna kuning untuk `mad_short`

### `mobile/app/(child)/tilawah/result.tsx`
- Tambah section "Catatan Tajweed" jika ada tajweed_feedback dari server
- Tampilkan list feedback (string[]) yang sudah dikirim backend

### `mobile/app/(child)/hafalan/result.tsx`
- Sama — tambah section "Catatan Tajweed"

---

## Testing

Unit test di `backend/tests/test_tajweed_engine.py`:

```python
# compare_texts dengan input identik → semua correct
def test_compare_identical():
    results, acc = compare_texts("بِسْمِ اللَّهِ", "بِسْمِ اللَّهِ")
    assert all(r.status == "correct" for r in results)
    assert acc == 100

# satu kata salah → hanya kata itu wrong, sisanya correct
def test_compare_one_wrong():
    results, acc = compare_texts("بِسْمِ اللَّهِ الرَّحْمَٰنِ", "بِسْمِ كلمة الرَّحْمَٰنِ")
    assert results[0].status == "correct"
    assert results[1].status == "wrong"
    assert results[2].status == "correct"

# detect_mad_errors dengan durasi pendek → mad_short
def test_mad_short_detected():
    word_results = [WordResult(word="الرَّحْمَٰنِ", status="correct", position=0)]
    timestamps = [{"word": "الرَّحْمَٰنِ", "start": 0.0, "end": 0.1}]  # 0.1s, terlalu pendek
    detect_mad_errors(word_results, timestamps, ["الرَّحْمَٰنِ"])
    assert word_results[0].status == "mad_short"

# detect_mad_errors dengan durasi cukup → tetap correct
def test_mad_sufficient():
    word_results = [WordResult(word="الرَّحْمَٰنِ", status="correct", position=0)]
    timestamps = [{"word": "الرَّحْمَٰنِ", "start": 0.0, "end": 0.4}]
    detect_mad_errors(word_results, timestamps, ["الرَّحْمَٰنِ"])
    assert word_results[0].status == "correct"
```

Integration test: kirim audio fixture Al-Ikhlas ayat 1 ke `/evaluate`, verifikasi response punya `word_results` dan `score > 0`.

---

## Dependencies

```
stable-ts>=2.17
torch>=2.0
av
fastapi
uvicorn
numpy
pydantic
```

`stable-ts` menggantikan penggunaan langsung `transformers` untuk Whisper. Model weights tetap didownload dari HuggingFace pada first run (~500MB untuk whisper-small).

---

## Out of Scope

- Deteksi ghunnah berbasis audio (butuh phoneme-level model terpisah)
- Perubahan Node/Fastify backend
- Perubahan Prisma schema
- Perubahan mobile navigation atau UI layout
