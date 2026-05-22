# Fast Continuous Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/evaluate-simple` endpoint that skips tajweed/mad analysis and uses word_accuracy directly as score, then wire up both continuous consumers to use it with a 50% pass threshold.

**Architecture:** Python sidecar gets a new `/evaluate-simple` route that runs ASR + compare_texts only. Express adds a proxy route `/tilawah/evaluate-simple`. Mobile adds `evaluateVerseSimple()` in services, then `use-continuous-hafalan.ts` and `tilawah/[id].tsx` switch to it.

**Tech Stack:** FastAPI (Python sidecar), Fastify (Express backend), React Native / Expo

---

### Task 1: Python sidecar — `/evaluate-simple` endpoint

**Files:**
- Modify: `backend/python/tilawah_service.py`

- [ ] **Step 1: Add the `/evaluate-simple` route**

Open `backend/python/tilawah_service.py` and add after the existing `/evaluate` route (after line 139, before `if __name__ == "__main__":`):

```python
@app.post("/evaluate-simple", response_model=EvaluateResponse)
def evaluate_simple(req: EvaluateRequest):
    try:
        audio_bytes = base64.b64decode(req.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio")

    temp_path = None
    try:
        temp_path = load_audio_to_tempfile(audio_bytes)
        model = get_model()
        result = model.transcribe(temp_path, language="ar", word_timestamps=True)
        transcription = result.text.strip()
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

    from tajweed_engine import compare_texts

    print(f"[SIMPLE][EXPECTED]    {req.expected_text}")
    print(f"[SIMPLE][TRANSCRIBED] {transcription}")

    raw_word_results, word_accuracy = compare_texts(req.expected_text, transcription)

    for w in raw_word_results:
        print(f"  [{w.status.upper():10}] {w.word}")

    word_results = [
        WordResult(
            word=w.word,
            correct=(w.status in ("correct", "mad_short")),
            expected=w.word,
            status=w.status,
        )
        for w in raw_word_results
    ]

    score = word_accuracy

    if score >= 80:
        feedback_msg = "MasyaAllah! Bacaan sangat bagus! 🌟"
    elif score >= 50:
        feedback_msg = "Bagus! Terus berlatih."
    else:
        feedback_msg = "Ulangi dan perhatikan kata yang disorot merah."

    return EvaluateResponse(
        transcription=transcription,
        word_results=word_results,
        word_accuracy=word_accuracy,
        tajweed_score=0,
        score=score,
        feedback=[feedback_msg],
    )
```

- [ ] **Step 2: Verify the sidecar starts without error**

```bash
cd "backend/python"
python -c "import tilawah_service; print('OK')"
```

Expected: `OK` (no import errors)

- [ ] **Step 3: Commit**

```bash
git add backend/python/tilawah_service.py
git commit -m "feat: add /evaluate-simple endpoint to Python sidecar (skip tajweed, score=word_accuracy)"
```

---

### Task 2: Express — proxy route for `/tilawah/evaluate-simple`

**Files:**
- Modify: `backend/src/routes/tilawah.ts`

- [ ] **Step 1: Add the proxy route**

In `backend/src/routes/tilawah.ts`, add after the closing `}` of the `POST /evaluate` handler (after line 72, before the `POST /session` route):

```typescript
  // POST /tilawah/evaluate-simple — fast evaluation (word accuracy only, no tajweed)
  app.post('/evaluate-simple', async (request, reply) => {
    const body = evaluateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { chapterId, verseNumber, expectedText, audioBase64 } = body.data

    let pythonResult: any
    try {
      const res = await fetch('http://localhost:8001/evaluate-simple', {
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
      stars: score >= 85 ? 3 : score >= 65 ? 2 : 1,
      wordResults: word_results,
      feedback,
      transcription,
    })
  })
```

- [ ] **Step 2: Build and check for TypeScript errors**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/tilawah.ts
git commit -m "feat: add POST /tilawah/evaluate-simple proxy route to Express"
```

---

### Task 3: Mobile service — `evaluateVerseSimple()`

**Files:**
- Modify: `mobile/services/tilawah.ts`

- [ ] **Step 1: Add `evaluateVerseSimple` function**

In `mobile/services/tilawah.ts`, add after the closing `}` of `evaluateVerse` (after line 61):

```typescript
export async function evaluateVerseSimple(
  chapterId: number,
  verseNumber: number,
  expectedText: string,
  audioBase64: string
): Promise<EvaluateResponse> {
  const res = await fetch(`${API_URL}/tilawah/evaluate-simple`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chapterId, verseNumber, expectedText, audioBase64 }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error ?? (err as any).message ?? `Evaluasi gagal (${res.status})`)
  }
  return res.json()
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd mobile
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add mobile/services/tilawah.ts
git commit -m "feat: add evaluateVerseSimple() service function"
```

---

### Task 4: Hook — switch `use-continuous-hafalan.ts` to `evaluateVerseSimple`, threshold 50%

**Files:**
- Modify: `mobile/hooks/use-continuous-hafalan.ts`

- [ ] **Step 1: Update import**

In `mobile/hooks/use-continuous-hafalan.ts` line 5-6, change:

```typescript
import { evaluateVerse } from '../services/tilawah'
import type { EvaluateResponse } from '../services/tilawah'
```

to:

```typescript
import { evaluateVerseSimple } from '../services/tilawah'
import type { EvaluateResponse } from '../services/tilawah'
```

- [ ] **Step 2: Update the evaluate call and pass threshold**

In `mobile/hooks/use-continuous-hafalan.ts`, inside `evaluateCurrentVerse` (around line 116), change:

```typescript
      const result = await evaluateVerse(chapterId, cur.verseNumber, expectedText, base64)
```

to:

```typescript
      const result = await evaluateVerseSimple(chapterId, cur.verseNumber, expectedText, base64)
```

Then change the pass threshold on line 121 from:

```typescript
        const passed = result.score >= 60
```

to:

```typescript
        const passed = result.score >= 50
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd mobile
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add mobile/hooks/use-continuous-hafalan.ts
git commit -m "feat: use-continuous-hafalan now uses evaluateVerseSimple with 50% pass threshold"
```

---

### Task 5: Tilawah screen — switch `tilawah/[id].tsx` to `evaluateVerseSimple`, threshold 50%

**Files:**
- Modify: `mobile/app/(child)/tilawah/[id].tsx`

- [ ] **Step 1: Find current evaluateVerse import and call**

The file imports `evaluateVerse` from `'../../../services/tilawah'` (or similar relative path). Find these two things:
1. The import statement
2. The call `await evaluateVerse(...)` inside the evaluate function

- [ ] **Step 2: Replace import**

Change:

```typescript
import { evaluateVerse, ... } from '../../../services/tilawah'
```

to:

```typescript
import { evaluateVerseSimple, ... } from '../../../services/tilawah'
```

(Keep any other imports from that file unchanged.)

- [ ] **Step 3: Replace the call site and threshold**

Find `await evaluateVerse(` and change to `await evaluateVerseSimple(`.

Find the pass threshold (currently `result.score >= 60` or similar) and change to `result.score >= 50`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd mobile
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add mobile/app/(child)/tilawah/[id].tsx
git commit -m "feat: tilawah continuous screen uses evaluateVerseSimple with 50% pass threshold"
```
