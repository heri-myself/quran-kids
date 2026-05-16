# Tilawah AI Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve tilawah and hafalan evaluation accuracy by upgrading Whisper model to small, replacing naive positional word comparison with difflib sequence alignment, and adding real mad (panjang pendek) detection using word-level timestamps from stable-whisper.

**Architecture:** Three layers — (1) stable-whisper + whisper-small-ar-quran for better transcription and word timestamps, (2) difflib.SequenceMatcher in tajweed_engine for correct word alignment, (3) detect_mad_errors() uses timestamps to flag words with too-short mad as `"mad_short"`. Mobile adds yellow color for mad_short. All changes contained in Python sidecar + mobile rendering — no backend Node/Prisma/API contract changes.

**Tech Stack:** Python (stable-ts, difflib), FastAPI, React Native (Expo), TypeScript

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/python/requirements.txt` | Modify | Add stable-ts, remove transformers |
| `backend/python/tajweed_engine.py` | Modify | compare_texts (difflib), detect_mad_errors, analyze_tajweed |
| `backend/python/tilawah_service.py` | Modify | stable-whisper model, word timestamps, wire mad detection, updated WordResult pydantic |
| `backend/python/tests/test_tajweed_engine.py` | Create | Unit tests for engine functions |
| `mobile/services/tilawah.ts` | Modify | Add `status` field to WordResult interface |
| `mobile/services/hafalan.ts` | Modify | Add `status` field to HafalanWordResult interface |
| `mobile/app/(child)/tilawah/[id].tsx` | Modify | Yellow color for mad_short in word rendering |
| `mobile/app/(child)/hafalan/[id].tsx` | Modify | Yellow color for mad_short in WordResultRow |
| `mobile/app/(child)/tilawah/result.tsx` | Modify | Catatan Tajweed section from feedback |
| `mobile/app/(child)/hafalan/result.tsx` | Modify | Catatan Tajweed section from wordResults |

---

## Task 1: Upgrade tajweed_engine.py — difflib alignment + mad detection

**Files:**
- Modify: `backend/python/tajweed_engine.py`
- Create: `backend/python/tests/__init__.py`
- Create: `backend/python/tests/test_tajweed_engine.py`

- [ ] **Step 1: Create test file**

```bash
mkdir -p /path/to/project/backend/python/tests
touch backend/python/tests/__init__.py
```

Create `backend/python/tests/test_tajweed_engine.py`:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from tajweed_engine import compare_texts, detect_mad_errors, analyze_tajweed, WordResult


# ── compare_texts ──────────────────────────────────────────────────────────────

def test_compare_identical_returns_all_correct():
    results, acc = compare_texts("قُلْ هُوَ اللَّهُ أَحَدٌ", "قُلْ هُوَ اللَّهُ أَحَدٌ")
    assert all(r.status == "correct" for r in results)
    assert acc == 100

def test_compare_empty_transcription_returns_all_missing():
    results, acc = compare_texts("قُلْ هُوَ", "")
    assert all(r.status == "missing" for r in results)
    assert acc == 0

def test_compare_one_wrong_word_does_not_cascade():
    # Middle word wrong — first and last should still be correct
    results, acc = compare_texts("قُلْ هُوَ اللَّهُ", "قُلْ كلمة اللَّهُ")
    assert results[0].status == "correct"
    assert results[1].status == "wrong"
    assert results[2].status == "correct"

def test_compare_missing_last_word():
    results, acc = compare_texts("قُلْ هُوَ اللَّهُ", "قُلْ هُوَ")
    assert results[0].status == "correct"
    assert results[1].status == "correct"
    assert results[2].status == "missing"

def test_compare_accuracy_two_of_four_correct():
    results, acc = compare_texts("قُلْ هُوَ اللَّهُ أَحَدٌ", "قُلْ خطأ اللَّهُ خطأ")
    correct_count = sum(1 for r in results if r.status == "correct")
    assert correct_count == 2
    assert acc == 50


# ── detect_mad_errors ──────────────────────────────────────────────────────────

def test_detect_mad_short_flags_mad_short():
    # الرَّحْمَٰنِ contains kasrah+ya pattern (mad)
    word_results = [WordResult(word="الرَّحْمَٰنِ", status="correct", position=0)]
    timestamps = [{"word": "الرَّحْمَٰنِ", "start": 0.0, "end": 0.10}]  # 0.10s < 0.25s threshold
    detect_mad_errors(word_results, timestamps)
    assert word_results[0].status == "mad_short"

def test_detect_mad_sufficient_stays_correct():
    word_results = [WordResult(word="الرَّحْمَٰنِ", status="correct", position=0)]
    timestamps = [{"word": "الرَّحْمَٰنِ", "start": 0.0, "end": 0.40}]  # 0.40s >= 0.25s threshold
    detect_mad_errors(word_results, timestamps)
    assert word_results[0].status == "correct"

def test_detect_mad_skips_wrong_words():
    # Wrong words should not be re-evaluated for mad
    word_results = [WordResult(word="الرَّحْمَٰنِ", status="wrong", position=0)]
    timestamps = [{"word": "الرَّحْمَٰنِ", "start": 0.0, "end": 0.05}]
    detect_mad_errors(word_results, timestamps)
    assert word_results[0].status == "wrong"  # unchanged

def test_detect_mad_skips_words_without_mad():
    # قُلْ has no mad pattern
    word_results = [WordResult(word="قُلْ", status="correct", position=0)]
    timestamps = [{"word": "قُلْ", "start": 0.0, "end": 0.05}]
    detect_mad_errors(word_results, timestamps)
    assert word_results[0].status == "correct"


# ── analyze_tajweed ────────────────────────────────────────────────────────────

def test_analyze_tajweed_no_mad_short_returns_100():
    word_results = [
        WordResult(word="قُلْ", status="correct", position=0),
        WordResult(word="هُوَ", status="correct", position=1),
    ]
    score, feedback = analyze_tajweed(word_results)
    assert score == 100
    assert feedback == []

def test_analyze_tajweed_one_mad_short_reduces_score():
    word_results = [
        WordResult(word="الرَّحْمَٰنِ", status="mad_short", position=0),
    ]
    score, feedback = analyze_tajweed(word_results)
    assert score == 90
    assert len(feedback) == 1

def test_analyze_tajweed_max_penalty_is_50():
    word_results = [
        WordResult(word=f"word{i}", status="mad_short", position=i)
        for i in range(10)
    ]
    score, feedback = analyze_tajweed(word_results)
    assert score == 50
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend/python
source venv/bin/activate
pip install pytest
python -m pytest tests/test_tajweed_engine.py -v 2>&1 | head -40
```

Expected: multiple FAILED — `compare_texts` positional bug causes `test_compare_one_wrong_word_does_not_cascade` to fail, `detect_mad_errors` and `analyze_tajweed` don't exist yet.

- [ ] **Step 3: Rewrite tajweed_engine.py**

Replace entire `backend/python/tajweed_engine.py` with:

```python
"""
Tajweed Rules Engine — versi 2
- compare_texts: difflib SequenceMatcher (alignment-aware)
- detect_mad_errors: timestamp-based mad duration check
- analyze_tajweed: score from actual mad_short count
"""
import re
from dataclasses import dataclass
from difflib import SequenceMatcher

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
ALEF_MAQSURA    = 'ى'

MAD_PATTERNS = [
    FATHA + ALEF,
    FATHA + ALEF_MAQSURA,
    KASRA + YA,
    DAMMA + WAW,
]

GHUNNAH_PATTERN = re.compile(f'[{NUN}{MIM}]{SHADDA}')

# Threshold durasi per kata untuk mad 2 harakat (detik)
MAD_MIN_DURATION = 0.25


@dataclass
class WordResult:
    word: str
    status: str   # "correct" | "wrong" | "missing" | "mad_short"
    position: int

    def dict(self):
        return {"word": self.word, "status": self.status, "position": self.position}


def normalize_arabic(text: str) -> str:
    """Hapus harakat untuk perbandingan kata."""
    harakat = 'ًٌٍَُِّْٕٓٔ'
    return ''.join(c for c in text if c not in harakat)


def has_mad_pattern(word: str) -> bool:
    """Cek apakah kata mengandung pola mad thabi'i."""
    return any(pattern in word for pattern in MAD_PATTERNS)


def compare_texts(expected: str, transcribed: str) -> tuple[list[WordResult], int]:
    """
    Bandingkan teks yang diharapkan vs hasil transkripsi menggunakan sequence alignment.
    Handles insertions, deletions, reorderings — satu kata salah tidak merusak penilaian setelahnya.
    Return: (word_results, word_accuracy_0_to_100)
    """
    expected_words = expected.strip().split()
    transcribed_words = transcribed.strip().split()

    if not expected_words:
        return [], 0

    expected_norm = [normalize_arabic(w) for w in expected_words]
    transcribed_norm = [normalize_arabic(w) for w in transcribed_words]

    results: list[WordResult | None] = [None] * len(expected_words)
    matcher = SequenceMatcher(None, expected_norm, transcribed_norm, autojunk=False)

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1):
                idx = i1 + k
                results[idx] = WordResult(word=expected_words[idx], status="correct", position=idx)
        elif tag == 'replace':
            for k in range(i2 - i1):
                idx = i1 + k
                results[idx] = WordResult(word=expected_words[idx], status="wrong", position=idx)
        elif tag == 'delete':
            for k in range(i2 - i1):
                idx = i1 + k
                results[idx] = WordResult(word=expected_words[idx], status="missing", position=idx)
        # 'insert': extra words from transcription — abaikan

    # Safety: fill any None slot (replace opcode bisa menghasilkan range yang lebih pendek dari expected)
    final_results = [
        r if r is not None else WordResult(word=expected_words[i], status="missing", position=i)
        for i, r in enumerate(results)
    ]

    correct = sum(1 for r in final_results if r.status == "correct")
    accuracy = int((correct / len(expected_words)) * 100)

    return final_results, accuracy


def detect_mad_errors(
    word_results: list[WordResult],
    word_timestamps: list[dict],  # [{"word": str, "start": float, "end": float}]
) -> None:
    """
    Mutate word_results in-place.
    Kata yang status-nya 'correct' dan mengandung mad pattern tapi durasinya < MAD_MIN_DURATION
    akan diubah statusnya menjadi 'mad_short'.
    """
    for i, wr in enumerate(word_results):
        if wr.status != "correct":
            continue
        if not has_mad_pattern(wr.word):
            continue
        if i >= len(word_timestamps):
            continue
        ts = word_timestamps[i]
        duration = ts["end"] - ts["start"]
        if duration < MAD_MIN_DURATION:
            wr.status = "mad_short"


def analyze_tajweed(word_results: list[WordResult]) -> tuple[int, list[str]]:
    """
    Hitung tajweed score dari jumlah mad_short yang terdeteksi.
    Return: (tajweed_score_0_to_100, feedback_list)
    """
    mad_short_count = sum(1 for w in word_results if w.status == "mad_short")
    score = max(50, 100 - mad_short_count * 10)

    feedback = []
    if mad_short_count > 0:
        feedback.append(
            f"Ada {mad_short_count} kata dengan mad (huruf panjang) yang terlalu pendek. "
            "Perhatikan kata yang ditandai kuning."
        )

    return score, feedback
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend/python
source venv/bin/activate
python -m pytest tests/test_tajweed_engine.py -v
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/python/tajweed_engine.py backend/python/tests/
git commit -m "feat: upgrade tajweed engine — difflib alignment + mad timestamp detection"
```

---

## Task 2: Upgrade tilawah_service.py — stable-whisper + wire mad detection

**Files:**
- Modify: `backend/python/requirements.txt`
- Modify: `backend/python/tilawah_service.py`

- [ ] **Step 1: Update requirements.txt**

Replace `backend/python/requirements.txt` with:

```
fastapi==0.111.0
uvicorn==0.29.0
stable-ts>=2.17.0
torch==2.3.0
torchaudio==2.3.0
numpy==1.26.4
httpx==0.27.0
av>=12.0.0
pytest>=8.0.0
```

`stable-ts` menggantikan `transformers` dan `soundfile` — stable-whisper menggunakan transformers secara internal tapi kita tidak perlu import langsung lagi.

- [ ] **Step 2: Install stable-ts**

```bash
cd backend/python
source venv/bin/activate
pip install "stable-ts>=2.17.0"
```

Expected: Successfully installed stable-ts-X.X.X (akan download transformers sebagai dependency).

- [ ] **Step 3: Rewrite tilawah_service.py**

Replace entire `backend/python/tilawah_service.py` with:

```python
import base64
import tempfile
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

_model = None


def get_model():
    global _model
    if _model is None:
        import stable_whisper
        print("Loading tarteel-ai/whisper-small-ar-quran model...")
        _model = stable_whisper.load_model("tarteel-ai/whisper-small-ar-quran")
        print("Model loaded.")
    return _model


def load_audio_to_tempfile(audio_bytes: bytes) -> str:
    """Write audio bytes to a temp file, return path. Caller must delete."""
    with tempfile.NamedTemporaryFile(suffix='.audio', delete=False) as f:
        f.write(audio_bytes)
        return f.name


class EvaluateRequest(BaseModel):
    audio_base64: str
    expected_text: str
    verse_number: int
    chapter_id: int


class WordResult(BaseModel):
    word: str
    correct: bool   # True jika status "correct" atau "mad_short" (kata benar, mad kurang)
    expected: str
    status: str     # "correct" | "wrong" | "missing" | "mad_short"


class EvaluateResponse(BaseModel):
    transcription: str
    word_results: list[WordResult]
    word_accuracy: int
    tajweed_score: int
    score: int
    feedback: list[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate(req: EvaluateRequest):
    try:
        audio_bytes = base64.b64decode(req.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio")

    temp_path = None
    try:
        temp_path = load_audio_to_tempfile(audio_bytes)
        model = get_model()

        # stable-whisper: transcribe dengan word timestamps
        result = model.transcribe(temp_path, language="ar", word_timestamps=True)
        transcription = result.text.strip()

        # Ekstrak word timestamps dari semua segment
        word_timestamps = []
        for segment in result.segments:
            for w in (segment.words or []):
                word_timestamps.append({
                    "word": w.word.strip(),
                    "start": w.start,
                    "end": w.end,
                })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot process audio: {e}")
    finally:
        if temp_path:
            try:
                os.unlink(temp_path)
            except Exception:
                pass

    from tajweed_engine import compare_texts, detect_mad_errors, analyze_tajweed

    raw_word_results, word_accuracy = compare_texts(req.expected_text, transcription)
    detect_mad_errors(raw_word_results, word_timestamps)
    tajweed_score, tajweed_feedback = analyze_tajweed(raw_word_results)

    word_results = [
        WordResult(
            word=w.word,
            correct=(w.status in ("correct", "mad_short")),
            expected=w.word,
            status=w.status,
        )
        for w in raw_word_results
    ]

    completeness = 100 if not any(w.status == "missing" for w in raw_word_results) else 70
    score = int(word_accuracy * 0.60 + tajweed_score * 0.25 + completeness * 0.15)

    feedback: list[str] = []
    wrong_count = sum(1 for w in raw_word_results if w.status == "wrong")
    if wrong_count > 0:
        feedback.append(f"Ada {wrong_count} kata yang perlu diperbaiki pengucapannya.")
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

- [ ] **Step 4: Verify service starts without error**

```bash
cd backend/python
source venv/bin/activate
python -c "from tilawah_service import app; print('OK')"
```

Expected: prints `OK` (model tidak diload sampai request pertama masuk).

- [ ] **Step 5: Commit**

```bash
git add backend/python/requirements.txt backend/python/tilawah_service.py
git commit -m "feat: switch to stable-whisper-small + wire mad detection in evaluate endpoint"
```

---

## Task 3: Update mobile TypeScript types — tambah status field

**Files:**
- Modify: `mobile/services/tilawah.ts` (line 5-9)
- Modify: `mobile/services/hafalan.ts` (line 4-8)

- [ ] **Step 1: Update WordResult in tilawah service**

Di `mobile/services/tilawah.ts`, ubah interface `WordResult` dari:

```typescript
export interface WordResult {
  word: string
  correct: boolean
  expected: string
}
```

Menjadi:

```typescript
export interface WordResult {
  word: string
  correct: boolean
  expected: string
  status?: 'correct' | 'wrong' | 'missing' | 'mad_short'
}
```

- [ ] **Step 2: Update HafalanWordResult in hafalan service**

Di `mobile/services/hafalan.ts`, ubah interface `HafalanWordResult` dari:

```typescript
export interface HafalanWordResult {
  word: string
  correct: boolean
  expected: string
}
```

Menjadi:

```typescript
export interface HafalanWordResult {
  word: string
  correct: boolean
  expected: string
  status?: 'correct' | 'wrong' | 'missing' | 'mad_short'
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd mobile
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (status adalah optional field, tidak breaking).

- [ ] **Step 4: Commit**

```bash
git add mobile/services/tilawah.ts mobile/services/hafalan.ts
git commit -m "feat: add status field to WordResult and HafalanWordResult types"
```

---

## Task 4: Update mobile word rendering — warna kuning untuk mad_short

**Files:**
- Modify: `mobile/app/(child)/tilawah/[id].tsx` (sekitar line 382-393)
- Modify: `mobile/app/(child)/hafalan/[id].tsx` (line 69-87, fungsi WordResultRow)

- [ ] **Step 1: Update tilawah [id].tsx word rendering**

Di `mobile/app/(child)/tilawah/[id].tsx`, cari block ini (sekitar line 382):

```typescript
words.map((w, i) => {
  const wordResult = currentEval.wordResults?.[i]
  const isCorrect = !wordResult || wordResult.correct !== false
  return (
    <Text
      key={i}
      style={[styles.arabicWord, { color: isCorrect ? '#10B981' : '#EF4444' }]}
    >
      {w.text_uthmani}
    </Text>
  )
})
```

Ganti menjadi:

```typescript
words.map((w, i) => {
  const wordResult = currentEval.wordResults?.[i]
  const status = wordResult?.status ?? (wordResult?.correct === false ? 'wrong' : 'correct')
  const wordColor = status === 'mad_short' ? '#EAB308' : status === 'correct' ? '#10B981' : '#EF4444'
  return (
    <Text
      key={i}
      style={[styles.arabicWord, { color: wordColor }]}
    >
      {w.text_uthmani}
    </Text>
  )
})
```

- [ ] **Step 2: Update hafalan [id].tsx WordResultRow**

Di `mobile/app/(child)/hafalan/[id].tsx`, cari fungsi `WordResultRow` (line 69-87):

```typescript
function WordResultRow({ words, wordResults }: { words: Verse['words']; wordResults: HafalanWordResult[] }) {
  return (
    <View style={styles.wordsRow}>
      {words.map((w, i) => {
        const result = wordResults[i]
        const isCorrect = !result || result.correct !== false
        return (
          <View
            key={i}
            style={[styles.wordChip, isCorrect ? styles.wordCorrect : styles.wordWrong]}
          >
            <Text style={[styles.wordText, { color: isCorrect ? '#16A34A' : '#DC2626' }]}>
              {w.text_uthmani}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
```

Ganti menjadi:

```typescript
function WordResultRow({ words, wordResults }: { words: Verse['words']; wordResults: HafalanWordResult[] }) {
  return (
    <View style={styles.wordsRow}>
      {words.map((w, i) => {
        const result = wordResults[i]
        const status = result?.status ?? (result?.correct === false ? 'wrong' : 'correct')
        const isMadShort = status === 'mad_short'
        const isCorrect = status === 'correct' || isMadShort
        return (
          <View
            key={i}
            style={[
              styles.wordChip,
              isMadShort ? styles.wordMadShort : isCorrect ? styles.wordCorrect : styles.wordWrong,
            ]}
          >
            <Text
              style={[
                styles.wordText,
                { color: isMadShort ? '#854D0E' : isCorrect ? '#16A34A' : '#DC2626' },
              ]}
            >
              {w.text_uthmani}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
```

- [ ] **Step 3: Tambah style wordMadShort di hafalan [id].tsx**

Di `StyleSheet.create({...})` pada `mobile/app/(child)/hafalan/[id].tsx`, cari `wordCorrect` dan `wordWrong`:

```typescript
wordCorrect: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
wordWrong: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
```

Tambahkan `wordMadShort` setelah `wordWrong`:

```typescript
wordCorrect: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
wordWrong: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
wordMadShort: { backgroundColor: '#FEF9C3', borderColor: '#FDE047' },
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd mobile
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add mobile/app/\(child\)/tilawah/\[id\].tsx mobile/app/\(child\)/hafalan/\[id\].tsx
git commit -m "feat: add yellow color for mad_short words in tilawah and hafalan screens"
```

---

## Task 5: Add Catatan Tajweed section to result screens

**Files:**
- Modify: `mobile/app/(child)/tilawah/result.tsx`
- Modify: `mobile/app/(child)/hafalan/result.tsx`

- [ ] **Step 1: Add tajweed section to tilawah result.tsx**

Di `mobile/app/(child)/tilawah/result.tsx`, cari `VerseResult` type di `hooks/use-tilawah.ts` — sudah ada `feedback: string[]` per verse. Kumpulkan semua feedback unik dari verseResults.

Tambahkan block ini setelah `</View>` penutup `recapCard` dan sebelum button "Ulangi Surah":

```typescript
{(() => {
  const tajweedFeedback = verseResults
    .flatMap((v) => v.feedback)
    .filter((f) => f.includes('mad') || f.includes('panjang'))
  const unique = [...new Set(tajweedFeedback)]
  if (unique.length === 0) return null
  return (
    <View style={styles.tajweedCard}>
      <Text style={styles.tajweedTitle}>📝 Catatan Tajweed</Text>
      {unique.map((f, i) => (
        <Text key={i} style={styles.tajweedItem}>• {f}</Text>
      ))}
    </View>
  )
})()}
```

Tambahkan styles berikut ke `StyleSheet.create({...})` di tilawah result.tsx:

```typescript
tajweedCard: {
  width: '100%',
  backgroundColor: 'rgba(234,179,8,0.12)',
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: 'rgba(234,179,8,0.3)',
},
tajweedTitle: { color: '#854D0E', fontWeight: '700', fontSize: 14, marginBottom: 8 },
tajweedItem: { color: '#92400E', fontSize: 13, lineHeight: 20 },
```

- [ ] **Step 2: Add tajweed section to hafalan result.tsx**

Di `mobile/app/(child)/hafalan/result.tsx`, `verseResults` punya `wordResults: HafalanWordResult[]`. Hitung jumlah `mad_short` dari semua verse untuk generate feedback.

Tambahkan variabel ini setelah `const stars = ...`:

```typescript
const madShortCount = verseResults.reduce(
  (total, v) => total + (v.wordResults ?? []).filter((w) => w.status === 'mad_short').length,
  0
)
```

Tambahkan block ini setelah `</View>` penutup `recapCard` dan sebelum button "Ulangi Surah" di hafalan result.tsx:

```typescript
{madShortCount > 0 && (
  <View style={styles.tajweedCard}>
    <Text style={styles.tajweedTitle}>📝 Catatan Tajweed</Text>
    <Text style={styles.tajweedItem}>
      • Ada {madShortCount} kata dengan mad (huruf panjang) yang terlalu pendek.
      Perhatikan kata yang ditandai kuning.
    </Text>
  </View>
)}
```

Tambahkan styles berikut ke `StyleSheet.create({...})` di hafalan result.tsx:

```typescript
tajweedCard: {
  width: '100%',
  backgroundColor: 'rgba(234,179,8,0.12)',
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: 'rgba(234,179,8,0.3)',
},
tajweedTitle: { color: '#854D0E', fontWeight: '700', fontSize: 14, marginBottom: 8 },
tajweedItem: { color: '#92400E', fontSize: 13, lineHeight: 20 },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd mobile
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/\(child\)/tilawah/result.tsx mobile/app/\(child\)/hafalan/result.tsx
git commit -m "feat: add Catatan Tajweed section to tilawah and hafalan result screens"
```

---

## Final Verification

- [ ] **Restart Python sidecar dan test manual**

```bash
cd backend/python
source venv/bin/activate
# Hentikan proses lama jika ada
pkill -f "uvicorn tilawah_service" 2>/dev/null || true
# Start ulang
python tilawah_service.py
```

First run akan download model whisper-small (~500MB). Tunggu sampai log menampilkan `Model loaded.`

- [ ] **Test health endpoint**

```bash
curl http://localhost:8001/health
```

Expected: `{"status":"ok"}`

- [ ] **Run semua Python tests**

```bash
cd backend/python
source venv/bin/activate
python -m pytest tests/test_tajweed_engine.py -v
```

Expected: all PASS.
