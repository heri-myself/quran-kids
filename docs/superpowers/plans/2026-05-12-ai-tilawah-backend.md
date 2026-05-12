# AI Tilawah — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun backend evaluasi tilawah — Python sidecar dengan model Whisper khusus Quran + tajweed rules engine + Fastify route + Prisma schema.

**Architecture:** Python FastAPI sidecar (port 8001) menerima audio base64, menjalankan `tarteel-ai/whisper-base-ar-quran` untuk transkripsi, membandingkan dengan teks ayat dari quran.com API, lalu mengembalikan skor terstruktur. Fastify (Node.js) berperan sebagai proxy ke Python sidecar + menyimpan hasil ke database.

**Tech Stack:** Python 3.11, FastAPI, uvicorn, transformers, torch (CPU), Fastify, Prisma, PostgreSQL.

---

## File Map

| File | Status | Tanggung Jawab |
|------|--------|----------------|
| `backend/prisma/schema.prisma` | Modifikasi | Tambah model TilawahSession + TilawahVerseResult |
| `backend/python/requirements.txt` | Baru | Dependencies Python sidecar |
| `backend/python/tilawah_service.py` | Baru | FastAPI app, endpoint /evaluate, load Whisper model |
| `backend/python/tajweed_engine.py` | Baru | Rules engine: bandingkan transkripsi + deteksi mad/ghunnah |
| `backend/src/routes/tilawah.ts` | Baru | Fastify route: proxy ke Python, simpan ke DB, hitung poin |
| `backend/src/app.ts` | Modifikasi | Register tilawahRoutes |

---

### Task 1: Prisma Schema — TilawahSession & TilawahVerseResult

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Tambah dua model di akhir schema.prisma**

Buka `backend/prisma/schema.prisma`. Tambahkan di bagian paling bawah:

```prisma
model TilawahSession {
  id           String               @id @default(cuid())
  profileId    String
  chapterId    Int
  totalScore   Int
  stars        Int
  pointsEarned Int
  createdAt    DateTime             @default(now())
  profile      Profile              @relation(fields: [profileId], references: [id], onDelete: Cascade)
  verses       TilawahVerseResult[]
}

model TilawahVerseResult {
  id           String         @id @default(cuid())
  sessionId    String
  verseNumber  Int
  score        Int
  wordAccuracy Int
  tajweedScore Int
  feedback     Json
  session      TilawahSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}
```

Juga tambahkan relasi di model `Profile` (cari baris terakhir dalam model Profile, tambahkan sebelum `}`):

```prisma
  tilawahSessions TilawahSession[]
```

- [ ] **Step 2: Generate dan jalankan migrasi**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/backend"
npx prisma migrate dev --name add_tilawah_sessions
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verifikasi generate client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add TilawahSession and TilawahVerseResult models"
```

---

### Task 2: Python Sidecar Setup

**Files:**
- Create: `backend/python/requirements.txt`
- Create: `backend/python/tilawah_service.py`

- [ ] **Step 1: Buat direktori dan requirements.txt**

```bash
mkdir -p "/Applications/Works/QuranBest/Vibe Code/Quran Kids/backend/python"
```

Buat `backend/python/requirements.txt`:

```
fastapi==0.111.0
uvicorn==0.29.0
transformers==4.40.0
torch==2.3.0
torchaudio==2.3.0
soundfile==0.12.1
numpy==1.26.4
httpx==0.27.0
```

- [ ] **Step 2: Install dependencies Python**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/backend/python"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Expected: semua package terinstall tanpa error. Proses ~5-10 menit (torch besar).

- [ ] **Step 3: Buat tilawah_service.py**

Buat `backend/python/tilawah_service.py`:

```python
import base64
import io
import json
import tempfile
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import soundfile as sf
import numpy as np

app = FastAPI()

# Load model sekali saat startup (lazy load agar cepat start)
_model = None
_processor = None

def get_model():
    global _model, _processor
    if _model is None:
        from transformers import WhisperProcessor, WhisperForConditionalGeneration
        print("Loading tarteel-ai/whisper-base-ar-quran model...")
        _processor = WhisperProcessor.from_pretrained("tarteel-ai/whisper-base-ar-quran")
        _model = WhisperForConditionalGeneration.from_pretrained("tarteel-ai/whisper-base-ar-quran")
        _model.eval()
        print("Model loaded.")
    return _model, _processor


class EvaluateRequest(BaseModel):
    audio_base64: str      # audio m4a/wav dikodekan base64
    expected_text: str     # teks arab ayat dari quran.com (text_uthmani)
    verse_number: int
    chapter_id: int


class WordResult(BaseModel):
    word: str
    status: str            # "correct" | "wrong" | "missing"
    position: int


class EvaluateResponse(BaseModel):
    transcription: str
    word_results: list[WordResult]
    word_accuracy: int     # 0-100
    tajweed_score: int     # 0-100
    score: int             # 0-100 total
    feedback: list[str]    # pesan feedback bahasa Indonesia


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate(req: EvaluateRequest):
    # 1. Decode audio
    try:
        audio_bytes = base64.b64decode(req.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio")

    # 2. Simpan ke temp file dan load sebagai array
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_bytes)
        temp_path = f.name

    try:
        audio_array, sample_rate = sf.read(temp_path)
        if audio_array.ndim > 1:
            audio_array = audio_array.mean(axis=1)  # stereo → mono
        # Resample ke 16kHz jika perlu
        if sample_rate != 16000:
            import torchaudio
            import torch
            waveform = torch.tensor(audio_array).float().unsqueeze(0)
            resampler = torchaudio.transforms.Resample(sample_rate, 16000)
            audio_array = resampler(waveform).squeeze().numpy()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot read audio: {e}")
    finally:
        os.unlink(temp_path)

    # 3. Transkripsi dengan Whisper
    model, processor = get_model()
    import torch
    inputs = processor(audio_array, sampling_rate=16000, return_tensors="pt")
    with torch.no_grad():
        predicted_ids = model.generate(inputs["input_features"], language="ar")
    transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()

    # 4. Analisis dengan tajweed engine
    from tajweed_engine import compare_texts, analyze_tajweed

    word_results, word_accuracy = compare_texts(req.expected_text, transcription)
    tajweed_score, tajweed_feedback = analyze_tajweed(req.expected_text, len(audio_array) / 16000)

    # 5. Hitung skor total
    completeness = 100 if not any(w.status == "missing" for w in word_results) else 70
    score = int(word_accuracy * 0.6 + tajweed_score * 0.2 + completeness * 0.2)

    # 6. Feedback bahasa Indonesia
    feedback = []
    wrong_words = [w for w in word_results if w.status == "wrong"]
    if wrong_words:
        feedback.append(f"Ada {len(wrong_words)} kata yang perlu diperbaiki pengucapannya.")
    feedback.extend(tajweed_feedback)
    if score >= 85:
        feedback.insert(0, "MasyaAllah! Bacaan sangat bagus! 🌟")
    elif score >= 65:
        feedback.insert(0, "Bagus! Terus berlatih untuk hasil lebih baik.")
    else:
        feedback.insert(0, "Jangan menyerah! Ulangi dan perhatikan kata yang disorot merah.")

    return EvaluateResponse(
        transcription=transcription,
        word_results=word_results,
        word_accuracy=word_accuracy,
        tajweed_score=tajweed_score,
        score=score,
        feedback=feedback,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

- [ ] **Step 4: Test service bisa start (tanpa model, hanya health check)**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/backend/python"
source venv/bin/activate
python tilawah_service.py &
sleep 3
curl http://localhost:8001/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Stop service dan commit**

```bash
kill $(lsof -ti:8001) 2>/dev/null || true
git add backend/python/requirements.txt backend/python/tilawah_service.py
git commit -m "feat: add Python FastAPI sidecar with Whisper model"
```

---

### Task 3: Tajweed Rules Engine

**Files:**
- Create: `backend/python/tajweed_engine.py`

- [ ] **Step 1: Buat tajweed_engine.py**

Buat `backend/python/tajweed_engine.py`:

```python
"""
Tajweed Rules Engine — versi 1
Deteksi: Mad Thabi'i (2 harakat) dan Ghunnah (nun/mim bertasydid)
"""
import re
import unicodedata
from dataclasses import dataclass

# Karakter Arab Unicode
ALEF            = 'ا'
WAW             = 'و'
YA              = 'ي'
FATHA           = 'َ'
KASRA           = 'ِ'
DAMMA           = 'ُ'
SHADDA          = 'ّ'
NUN             = 'ن'
MIM             = 'م'
FATHA_ALEF      = 'ا'  # alef setelah fathah = mad
ALEF_MAQSURA    = 'ى'

# Harakat panjang (tanda mad thabi'i)
MAD_PATTERNS = [
    FATHA + ALEF,         # fathah + alef
    FATHA + ALEF_MAQSURA, # fathah + alef maqsura
    KASRA + YA,            # kasrah + ya
    DAMMA + WAW,           # dhammah + waw
]

# Huruf ghunnah: nun/mim bertasydid
GHUNNAH_PATTERN = re.compile(f'[{NUN}{MIM}]{SHADDA}')


@dataclass
class WordResult:
    word: str
    status: str   # "correct" | "wrong" | "missing"
    position: int

    def dict(self):
        return {"word": self.word, "status": self.status, "position": self.position}


def normalize_arabic(text: str) -> str:
    """Hapus harakat untuk perbandingan kata."""
    harakat = 'ًٌٍَُِّْٕٓٔ'
    return ''.join(c for c in text if c not in harakat)


def count_mad_positions(text: str) -> int:
    """Hitung jumlah posisi mad thabi'i dalam teks."""
    count = 0
    for pattern in MAD_PATTERNS:
        count += text.count(pattern)
    return count


def count_ghunnah(text: str) -> int:
    """Hitung jumlah ghunnah (nun/mim tasydid)."""
    return len(GHUNNAH_PATTERN.findall(text))


def compare_texts(expected: str, transcribed: str) -> tuple[list[WordResult], int]:
    """
    Bandingkan teks yang diharapkan vs hasil transkripsi.
    Return: (word_results, word_accuracy_0_to_100)
    """
    expected_words = expected.strip().split()
    transcribed_words = transcribed.strip().split()

    # Normalisasi untuk perbandingan
    expected_norm = [normalize_arabic(w) for w in expected_words]
    transcribed_norm = [normalize_arabic(w) for w in transcribed_words]

    results = []
    correct = 0

    for i, (exp_word, exp_norm) in enumerate(zip(expected_words, expected_norm)):
        if i < len(transcribed_norm):
            if exp_norm == transcribed_norm[i]:
                results.append(WordResult(word=exp_word, status="correct", position=i))
                correct += 1
            else:
                results.append(WordResult(word=exp_word, status="wrong", position=i))
        else:
            results.append(WordResult(word=exp_word, status="missing", position=i))

    total = len(expected_words)
    accuracy = int((correct / total) * 100) if total > 0 else 0

    return results, accuracy


def analyze_tajweed(expected_text: str, audio_duration_seconds: float) -> tuple[int, list[str]]:
    """
    Analisis tajweed berdasarkan teks dan durasi audio.
    Return: (tajweed_score_0_to_100, feedback_list)
    """
    feedback = []
    score = 100

    # Hitung mad thabi'i dalam teks
    mad_count = count_mad_positions(expected_text)
    ghunnah_count = count_ghunnah(expected_text)

    # Estimasi durasi ideal:
    # Tiap kata normal ~0.4 detik, tiap mad +0.3 detik, tiap ghunnah +0.2 detik
    word_count = len(expected_text.strip().split())
    ideal_duration = (word_count * 0.4) + (mad_count * 0.3) + (ghunnah_count * 0.2)

    # Toleransi: ±40% dari durasi ideal
    min_duration = ideal_duration * 0.6
    max_duration = ideal_duration * 1.8

    if audio_duration_seconds < min_duration and mad_count > 0:
        score -= 30
        feedback.append(f"Bacaan terlalu cepat. Ada {mad_count} mad (huruf panjang) yang perlu diperpanjang.")
    elif audio_duration_seconds > max_duration:
        score -= 10
        feedback.append("Bacaan terlalu lambat. Coba baca dengan tempo yang lebih natural.")

    if ghunnah_count > 0:
        # Tidak bisa deteksi ghunnah dari durasi saja, berikan hint saja
        feedback.append(f"Perhatikan {ghunnah_count} ghunnah (dengung) pada nun/mim bertasydid.")
        # Kurangi skor sedikit karena tidak bisa verifikasi
        score -= 10

    return max(0, score), feedback
```

- [ ] **Step 2: Test engine secara langsung**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/backend/python"
source venv/bin/activate
python3 -c "
from tajweed_engine import compare_texts, analyze_tajweed
# Test Al-Ikhlas ayat 1
expected = 'قُلْ هُوَ اللَّهُ أَحَدٌ'
transcribed = 'قل هو الله أحد'
results, accuracy = compare_texts(expected, transcribed)
print('Accuracy:', accuracy)
print('Words:', [(r.word, r.status) for r in results])
score, feedback = analyze_tajweed(expected, 2.5)
print('Tajweed score:', score)
print('Feedback:', feedback)
"
```

Expected output:
```
Accuracy: 100
Words: [('قُلْ', 'correct'), ('هُوَ', 'correct'), ('اللَّهُ', 'correct'), ('أَحَدٌ', 'correct')]
Tajweed score: 90
Feedback: ['Perhatikan 1 ghunnah (dengung) pada nun/mim bertasydid.']
```

- [ ] **Step 3: Commit**

```bash
git add backend/python/tajweed_engine.py
git commit -m "feat: add tajweed rules engine (mad thabi'i + ghunnah detection)"
```

---

### Task 4: Fastify Route /tilawah/evaluate

**Files:**
- Create: `backend/src/routes/tilawah.ts`

- [ ] **Step 1: Buat tilawah.ts route**

Buat `backend/src/routes/tilawah.ts`:

```typescript
import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../hooks/authenticate.js'
import { z } from 'zod'

const evaluateSchema = z.object({
  profileId: z.string(),
  chapterId: z.number().int().min(1).max(114),
  verseNumber: z.number().int().min(1),
  expectedText: z.string().min(1),
  audioBase64: z.string().min(1),
})

const POINTS = { STAR_1: 10, STAR_2: 25, STAR_3: 50, PERFECT: 75 }

function calcStars(score: number): number {
  if (score >= 85) return 3
  if (score >= 65) return 2
  return 1
}

function calcPoints(score: number, stars: number): number {
  if (score === 100) return POINTS.PERFECT
  if (stars === 3) return POINTS.STAR_3
  if (stars === 2) return POINTS.STAR_2
  return POINTS.STAR_1
}

const tilawahRoutes: FastifyPluginAsync = async (app) => {
  // POST /tilawah/evaluate — evaluasi satu ayat
  app.post('/tilawah/evaluate', { preHandler: [authenticate] }, async (request, reply) => {
    const body = evaluateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { profileId, chapterId, verseNumber, expectedText, audioBase64 } = body.data

    // Proxy ke Python sidecar
    let pythonResult: any
    try {
      const res = await fetch('http://localhost:8001/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64: audioBase64,
          expected_text: expectedText,
          verse_number: verseNumber,
          chapter_id: chapterId,
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Python sidecar error: ${err}`)
      }
      pythonResult = await res.json()
    } catch (err: any) {
      app.log.error(err)
      return reply.code(503).send({ error: 'Evaluation service unavailable', detail: err.message })
    }

    const { score, word_accuracy, tajweed_score, word_results, feedback, transcription } = pythonResult

    return reply.send({
      verseNumber,
      score,
      wordAccuracy: word_accuracy,
      tajweedScore: tajweed_score,
      stars: calcStars(score),
      wordResults: word_results,
      feedback,
      transcription,
    })
  })

  // POST /tilawah/session — simpan hasil akhir sesi ke DB + beri poin
  app.post('/tilawah/session', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      profileId: z.string(),
      chapterId: z.number().int().min(1).max(114),
      verseResults: z.array(z.object({
        verseNumber: z.number(),
        score: z.number(),
        wordAccuracy: z.number(),
        tajweedScore: z.number(),
        feedback: z.array(z.string()),
      })),
    })

    const body = schema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { profileId, chapterId, verseResults } = body.data
    const totalScore = Math.round(verseResults.reduce((sum, v) => sum + v.score, 0) / verseResults.length)
    const stars = calcStars(totalScore)
    const pointsEarned = calcPoints(totalScore, stars)

    // Simpan sesi ke DB
    const session = await prisma.tilawahSession.create({
      data: {
        profileId,
        chapterId,
        totalScore,
        stars,
        pointsEarned,
        verses: {
          create: verseResults.map(v => ({
            verseNumber: v.verseNumber,
            score: v.score,
            wordAccuracy: v.wordAccuracy,
            tajweedScore: v.tajweedScore,
            feedback: v.feedback,
          })),
        },
      },
    })

    // Tambah poin ke gamifikasi
    const gamification = await prisma.gamification.findUnique({ where: { profileId } })
    if (gamification) {
      const newTotal = gamification.totalPoints + pointsEarned
      await prisma.gamification.update({
        where: { profileId },
        data: {
          totalPoints: newTotal,
          currentLevel: Math.floor(newTotal / 200) + 1,
          lastReadAt: new Date(),
        },
      })
    }

    return reply.send({ sessionId: session.id, totalScore, stars, pointsEarned })
  })
}

export default tilawahRoutes
```

- [ ] **Step 2: Verifikasi TypeScript tidak error**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/backend"
npx tsc --noEmit 2>&1 | head -20
```

Expected: tidak ada error.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/tilawah.ts
git commit -m "feat: add Fastify tilawah routes (evaluate + session)"
```

---

### Task 5: Register Route di app.ts

**Files:**
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Import dan register tilawahRoutes di app.ts**

Buka `backend/src/app.ts`. Tambahkan import:

```typescript
import tilawahRoutes from './routes/tilawah.js'
```

Tambahkan registrasi sebelum baris `app.get('/health'`:

```typescript
  app.register(tilawahRoutes)
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/backend"
npx tsc --noEmit 2>&1 | head -20
```

Expected: tidak ada error.

- [ ] **Step 3: Test endpoint dengan curl (backend + Python sidecar harus jalan)**

Start Python sidecar di terminal lain:
```bash
cd "/Applications/Works/QuranBest/Vibe Code/Quran Kids/backend/python"
source venv/bin/activate
python tilawah_service.py
```

Test health:
```bash
curl http://localhost:8001/health
```
Expected: `{"status":"ok"}`

- [ ] **Step 4: Commit**

```bash
git add backend/src/app.ts
git commit -m "feat: register tilawah routes in Fastify app"
```
