# RunPod Serverless Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pindahkan inferensi Whisper dari Python sidecar di VPS (CPU) ke RunPod Serverless Worker (RTX 3090 GPU) agar lebih cepat dan bayar per request.

**Architecture:** Backend Node.js saat ini memanggil `http://localhost:8001/evaluate` ke Python sidecar. Kita ganti URL itu ke RunPod async API. Python sidecar tetap jalan di VPS untuk `tajweed_engine.py` — hanya bagian transkripsi Whisper yang pindah ke RunPod. RunPod Worker baru (`runpod_handler.py`) hanya bertugas: terima audio base64 → transkripsi Whisper → kembalikan teks.

**Tech Stack:** RunPod Python SDK (`runpod`), HuggingFace `transformers`, Docker, ffmpeg, Node.js `fetch` untuk polling RunPod async API.

---

## File Structure

| File | Action | Tanggung Jawab |
|------|--------|----------------|
| `backend/python/runpod_handler.py` | **CREATE** | RunPod Worker — terima input, jalankan Whisper, kembalikan transcription |
| `backend/python/Dockerfile.runpod` | **CREATE** | Docker image untuk RunPod Worker (CUDA base + model baked-in) |
| `backend/python/tilawah_service.py` | **MODIFY** | Pisahkan `transcribe_audio()` ke fungsi standalone agar bisa diimpor handler |
| `backend/src/lib/runpod.ts` | **CREATE** | Client RunPod API — submit job, poll result, timeout handling |
| `backend/src/routes/tilawah.ts` | **MODIFY** | Ganti `fetch('http://localhost:8001/evaluate')` → pakai `runpodTranscribe()` |
| `backend/.env.example` | **MODIFY** | Tambah `RUNPOD_API_KEY` dan `RUNPOD_ENDPOINT_ID` |

---

## Task 1: Buat RunPod Worker Handler

**Files:**
- Create: `backend/python/runpod_handler.py`

Ini adalah entry point yang dijalankan RunPod. Menerima `input.audio_base64`, menjalankan Whisper, mengembalikan `transcription`.

- [ ] **Step 1: Buat file `runpod_handler.py`**

```python
# backend/python/runpod_handler.py
import runpod
import base64
import os
import subprocess
import tempfile

import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline as hf_pipeline
import numpy as np

MODEL_ID = os.environ.get("MODEL_ID", "naazimsnh02/whisper-large-v3-turbo-ar-quran")

_pipe = None
_processor = None


def get_pipe():
    global _pipe, _processor
    if _pipe is None:
        print(f"[WORKER] Loading model {MODEL_ID} ...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32
        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            low_cpu_mem_usage=True,
            use_safetensors=True,
        ).to(device)
        _processor = AutoProcessor.from_pretrained(MODEL_ID)
        _processor.tokenizer.set_prefix_tokens(language="arabic", task="transcribe")
        prefix = _processor.tokenizer.prefix_tokens[1:]
        model.generation_config.forced_decoder_ids = [(i + 1, tok) for i, tok in enumerate(prefix)]
        _pipe = hf_pipeline(
            "automatic-speech-recognition",
            model=model,
            tokenizer=_processor.tokenizer,
            feature_extractor=_processor.feature_extractor,
            torch_dtype=dtype,
            device=device,
        )
        print(f"[WORKER] Model loaded on {device}.")
    return _pipe


def audio_bytes_to_array(audio_bytes: bytes) -> np.ndarray:
    with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name
    try:
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-i", tmp_path,
            "-ar", "16000", "-ac", "1", "-f", "f32le", "pipe:1",
        ]
        proc = subprocess.run(cmd, capture_output=True)
        if proc.returncode != 0:
            raise ValueError(f"ffmpeg error: {proc.stderr.decode()}")
        return np.frombuffer(proc.stdout, dtype=np.float32)
    finally:
        os.unlink(tmp_path)


def handler(job):
    """RunPod job handler — dipanggil untuk setiap request."""
    job_input = job.get("input", {})
    audio_b64 = job_input.get("audio_base64")

    if not audio_b64:
        return {"error": "audio_base64 is required"}

    try:
        audio_bytes = base64.b64decode(audio_b64)
    except Exception as e:
        return {"error": f"Invalid base64: {e}"}

    try:
        audio_array = audio_bytes_to_array(audio_bytes)
        pipe = get_pipe()
        result = pipe(
            {"raw": audio_array, "sampling_rate": 16000},
            generate_kwargs={"num_beams": 1, "max_new_tokens": 128},
        )
        transcription = result["text"].strip()
        print(f"[WORKER] Transcribed: {transcription}")
        return {"transcription": transcription}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
```

- [ ] **Step 2: Verifikasi syntax tidak error**

```bash
cd "backend/python"
python3 -c "import ast; ast.parse(open('runpod_handler.py').read()); print('OK')"
```
Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/python/runpod_handler.py
git commit -m "feat(runpod): add serverless worker handler for Whisper transcription"
```

---

## Task 2: Buat Dockerfile untuk RunPod Worker

**Files:**
- Create: `backend/python/Dockerfile.runpod`

Docker image ini di-build dan di-push ke Docker Hub / GitHub Container Registry, lalu didaftarkan ke RunPod sebagai custom endpoint.

- [ ] **Step 1: Buat `Dockerfile.runpod`**

```dockerfile
# backend/python/Dockerfile.runpod
FROM runpod/base:0.4.0-cuda11.8.0

# System deps
RUN apt-get update && apt-get install -y ffmpeg git && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.runpod.txt /requirements.runpod.txt
RUN pip install --no-cache-dir -r /requirements.runpod.txt

# Pre-download model into image (baked-in — tidak perlu download saat cold start)
RUN python3 -c "\
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor; \
AutoModelForSpeechSeq2Seq.from_pretrained('naazimsnh02/whisper-large-v3-turbo-ar-quran', use_safetensors=True); \
AutoProcessor.from_pretrained('naazimsnh02/whisper-large-v3-turbo-ar-quran'); \
print('Model baked in.')"

# Copy handler
COPY runpod_handler.py /handler.py

CMD ["python3", "-u", "/handler.py"]
```

- [ ] **Step 2: Buat `requirements.runpod.txt`**

```
runpod==1.6.2
torch==2.3.0
torchaudio==2.3.0
transformers==4.41.0
accelerate>=0.27.0
numpy==1.26.4
```

- [ ] **Step 3: Verifikasi Dockerfile syntax**

```bash
docker build --dry-run -f backend/python/Dockerfile.runpod backend/python/ 2>&1 | head -5
# Jika docker tidak ada di local, cukup cek file ada dan tidak typo:
cat backend/python/Dockerfile.runpod | grep "^FROM\|^RUN\|^COPY\|^CMD"
```
Expected: Baris-baris FROM/RUN/COPY/CMD tampil tanpa error.

- [ ] **Step 4: Commit**

```bash
git add backend/python/Dockerfile.runpod backend/python/requirements.runpod.txt
git commit -m "feat(runpod): add Dockerfile and requirements for RunPod worker"
```

---

## Task 3: Build & Push Docker Image ke Registry

**Prasyarat:** Punya akun Docker Hub (`docker login`) atau GitHub Container Registry.

- [ ] **Step 1: Build image**

```bash
cd "backend/python"
docker build -f Dockerfile.runpod -t <DOCKERHUB_USERNAME>/quran-kids-whisper:latest .
```
Expected: Build selesai, terakhir muncul baris `Model baked in.` — artinya model sudah masuk ke image.

- [ ] **Step 2: Push ke Docker Hub**

```bash
docker push <DOCKERHUB_USERNAME>/quran-kids-whisper:latest
```
Expected: Layer push berhasil, URL image tersedia.

- [ ] **Step 3: Daftarkan ke RunPod**

1. Buka https://www.runpod.io/console/serverless
2. Klik **+ New Endpoint**
3. Pilih **Custom** → masukkan image: `<DOCKERHUB_USERNAME>/quran-kids-whisper:latest`
4. GPU: **RTX 3090** (atau pilih yang tersedia termurah)
5. Max Workers: **3**, Min Workers: **0** (serverless sejati, cold start dibiarkan)
6. Klik **Deploy**
7. Catat **Endpoint ID** (format: `abc123xyz`) — diperlukan di Task 4

---

## Task 4: Buat RunPod Client di Backend Node.js

**Files:**
- Create: `backend/src/lib/runpod.ts`

Client ini bertugas: kirim job ke RunPod → poll status → kembalikan transcription. RunPod menggunakan async API (submit → poll), bukan HTTP sinkron.

- [ ] **Step 1: Buat `backend/src/lib/runpod.ts`**

```typescript
// backend/src/lib/runpod.ts

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY!
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID!
const BASE_URL = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`

const POLL_INTERVAL_MS = 500
const TIMEOUT_MS = 60_000  // 60 detik timeout total

interface RunPodOutput {
  transcription?: string
  error?: string
}

async function submitJob(audioBase64: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    },
    body: JSON.stringify({ input: { audio_base64: audioBase64 } }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`RunPod submit failed: ${res.status} ${text}`)
  }
  const data = await res.json() as { id: string }
  return data.id
}

async function pollJob(jobId: string): Promise<RunPodOutput> {
  const start = Date.now()
  while (Date.now() - start < TIMEOUT_MS) {
    const res = await fetch(`${BASE_URL}/status/${jobId}`, {
      headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` },
    })
    if (!res.ok) throw new Error(`RunPod poll failed: ${res.status}`)

    const data = await res.json() as { status: string; output?: RunPodOutput; error?: string }

    if (data.status === 'COMPLETED') {
      return data.output ?? {}
    }
    if (data.status === 'FAILED') {
      throw new Error(`RunPod job failed: ${data.error ?? 'unknown error'}`)
    }
    // IN_QUEUE or IN_PROGRESS — tunggu
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
  throw new Error(`RunPod job timeout after ${TIMEOUT_MS}ms`)
}

export async function runpodTranscribe(audioBase64: string): Promise<string> {
  const jobId = await submitJob(audioBase64)
  const output = await pollJob(jobId)
  if (output.error) throw new Error(`Worker error: ${output.error}`)
  if (!output.transcription) throw new Error('Worker returned empty transcription')
  return output.transcription
}
```

- [ ] **Step 2: Tambah env vars ke `.env.example`**

Buka `backend/.env.example` dan tambahkan:

```
RUNPOD_API_KEY=your_runpod_api_key_here
RUNPOD_ENDPOINT_ID=your_endpoint_id_here
```

- [ ] **Step 3: Tambah env vars ke VPS `.env`**

SSH ke VPS lalu edit file `.env`:
```bash
ssh ubuntu@<VPS_HOST>
nano /opt/quran-kids/backend/.env
# Tambahkan:
# RUNPOD_API_KEY=<api_key_dari_runpod_console>
# RUNPOD_ENDPOINT_ID=<endpoint_id_dari_task_3>
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/lib/runpod.ts backend/.env.example
git commit -m "feat(runpod): add RunPod async job client with polling and timeout"
```

---

## Task 5: Update tilawah.ts — Ganti localhost:8001 ke RunPod

**Files:**
- Modify: `backend/src/routes/tilawah.ts`

Ini adalah satu-satunya perubahan di routing layer. `tajweed_engine` dan scoring tidak berubah — yang berubah hanya bagaimana kita mendapat `transcription`.

- [ ] **Step 1: Buat Python sidecar endpoint baru khusus tajweed (tanpa Whisper)**

Buka `backend/python/tilawah_service.py` dan tambahkan endpoint `/transcribe-and-analyze` baru yang menerima `transcription` (sudah jadi teks) — **tanpa memanggil Whisper lagi**:

```python
class AnalyzeRequest(BaseModel):
    transcription: str
    expected_text: str
    verse_number: int
    chapter_id: int


@app.post("/analyze", response_model=EvaluateResponse)
def analyze(req: AnalyzeRequest):
    """Terima transcription teks langsung, lakukan analisis tajweed saja."""
    from tajweed_engine import compare_texts, detect_mad_errors, analyze_tajweed, detect_tajweed_rules

    print(f"[ANALYZE][EXPECTED]     {req.expected_text}")
    print(f"[ANALYZE][TRANSCRIBED]  {req.transcription}")

    raw_word_results, word_accuracy = compare_texts(req.expected_text, req.transcription)
    detect_mad_errors(raw_word_results, [])
    tajweed_score, tajweed_feedback = analyze_tajweed(raw_word_results)

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

    completeness = 100 if not any(w.status == "missing" for w in raw_word_results) else 70
    score = int(word_accuracy * 0.60 + tajweed_score * 0.25 + completeness * 0.15)

    feedback: list[str] = []
    expected_words = req.expected_text.strip().split()
    wrong_words = [w for w in raw_word_results if w.status == "wrong"]
    missing_words = [w.word for w in raw_word_results if w.status == "missing"]

    if wrong_words:
        feedback.append(f"Kata yang perlu diperbaiki: {', '.join(w.word for w in wrong_words)}")
        for w in wrong_words:
            next_word = expected_words[w.position + 1] if w.position + 1 < len(expected_words) else ''
            rules = detect_tajweed_rules(w.word, next_word)
            seen = set()
            for rule_name, explanation in rules:
                if rule_name not in seen:
                    seen.add(rule_name)
                    feedback.append(f"• {explanation}")

    if missing_words:
        feedback.append(f"Kata yang tidak terdengar: {', '.join(missing_words)} — coba ucapkan lebih jelas.")
    feedback.extend(tajweed_feedback)

    if score >= 85:
        feedback.insert(0, "MasyaAllah! Bacaan sangat bagus! 🌟")
    elif score >= 65:
        feedback.insert(0, "Bagus! Terus berlatih untuk hasil lebih baik.")
    else:
        feedback.insert(0, "Jangan menyerah! Ulangi dan perhatikan kata yang disorot merah.")

    return EvaluateResponse(
        transcription=req.transcription,
        word_results=word_results,
        word_accuracy=word_accuracy,
        tajweed_score=tajweed_score,
        score=score,
        feedback=feedback,
    )


@app.post("/analyze-simple", response_model=EvaluateResponse)
def analyze_simple(req: AnalyzeRequest):
    """Versi simple — hanya word accuracy, tanpa tajweed detail."""
    from tajweed_engine import compare_texts

    raw_word_results, word_accuracy = compare_texts(req.expected_text, req.transcription)

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
        transcription=req.transcription,
        word_results=word_results,
        word_accuracy=word_accuracy,
        tajweed_score=0,
        score=score,
        feedback=[feedback_msg],
    )
```

- [ ] **Step 2: Update `backend/src/routes/tilawah.ts` — ganti kedua `fetch` ke RunPod + sidecar analyze**

Ganti seluruh isi `/evaluate` dan `/evaluate-simple` handler. Import `runpodTranscribe` di atas file:

```typescript
import { runpodTranscribe } from '../lib/runpod.js'
```

Ganti handler `/evaluate`:

```typescript
app.post('/evaluate', async (request, reply) => {
  const body = evaluateSchema.safeParse(request.body)
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

  const { chapterId, verseNumber, expectedText, audioBase64 } = body.data

  // Step 1: Transkripsi via RunPod GPU
  let transcription: string
  try {
    transcription = await runpodTranscribe(audioBase64)
  } catch (err: any) {
    app.log.error(err)
    return reply.code(503).send({ error: 'Transcription service unavailable', detail: err.message })
  }

  // Step 2: Analisis tajwid via Python sidecar lokal (tajweed_engine.py)
  let pythonResult: any
  try {
    const res = await fetch('http://localhost:8001/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcription,
        expected_text: expectedText,
        verse_number: verseNumber,
        chapter_id: chapterId,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Tajweed sidecar error: ${err}`)
    }
    pythonResult = await res.json()
  } catch (err: any) {
    app.log.error(err)
    return reply.code(503).send({ error: 'Analysis service unavailable', detail: err.message })
  }

  const { score, word_accuracy, tajweed_score, word_results, feedback } = pythonResult

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
```

Ganti handler `/evaluate-simple`:

```typescript
app.post('/evaluate-simple', async (request, reply) => {
  const body = evaluateSchema.safeParse(request.body)
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

  const { chapterId, verseNumber, expectedText, audioBase64 } = body.data

  let transcription: string
  try {
    transcription = await runpodTranscribe(audioBase64)
  } catch (err: any) {
    app.log.error(err)
    return reply.code(503).send({ error: 'Transcription service unavailable', detail: err.message })
  }

  let pythonResult: any
  try {
    const res = await fetch('http://localhost:8001/analyze-simple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcription,
        expected_text: expectedText,
        verse_number: verseNumber,
        chapter_id: chapterId,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Tajweed sidecar error: ${err}`)
    }
    pythonResult = await res.json()
  } catch (err: any) {
    app.log.error(err)
    return reply.code(503).send({ error: 'Analysis service unavailable', detail: err.message })
  }

  const { score, word_accuracy, tajweed_score, word_results, feedback } = pythonResult

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

- [ ] **Step 3: Verifikasi TypeScript compile**

```bash
cd backend
npx tsc --noEmit
```
Expected: Tidak ada error.

- [ ] **Step 4: Commit**

```bash
git add backend/python/tilawah_service.py backend/src/routes/tilawah.ts
git commit -m "feat(runpod): split transcription (RunPod) from tajweed analysis (local sidecar)"
```

---

## Task 6: Deploy ke VPS

- [ ] **Step 1: Push semua perubahan ke GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Deploy backend ke VPS via script**

```bash
./backend/deploy-vps.sh
```
Expected: Container restart, log terakhir tidak ada error.

- [ ] **Step 3: Restart Python sidecar di VPS**

```bash
ssh ubuntu@<VPS_HOST>
cd /opt/quran-kids/backend/python
# Kill sidecar lama
pkill -f tilawah_service.py || true
# Start ulang
nohup python3 tilawah_service.py > /tmp/sidecar.log 2>&1 &
echo "Sidecar PID: $!"
```

- [ ] **Step 4: Smoke test dari VPS**

```bash
# Test endpoint /analyze langsung ke sidecar
curl -s -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{"transcription":"بِسمِ اللَّهِ","expected_text":"بِسمِ اللَّهِ","verse_number":1,"chapter_id":1}' \
  | python3 -m json.tool | head -20
```
Expected: JSON dengan `score`, `word_results`, `feedback`.

- [ ] **Step 5: Test end-to-end via backend API**

Dari local atau Postman, kirim request ke backend dengan audio nyata:
```
POST https://<VPS_DOMAIN>/api/tilawah/evaluate
{
  "chapterId": 1,
  "verseNumber": 1,
  "expectedText": "بِسمِ اللَّهِ الرَّحمَنِ الرَّحِيمِ",
  "audioBase64": "<base64 audio>"
}
```
Expected: Response dengan `score`, `stars`, `wordResults`, `transcription`.

- [ ] **Step 6: Cek log RunPod di console**

Buka https://www.runpod.io/console/serverless → pilih endpoint → tab **Logs**.
Expected: Muncul baris `[WORKER] Transcribed: بِسمِ...`

---

## Task 7: Verifikasi & Monitoring

- [ ] **Step 1: Cek cold start pertama**

Biarkan endpoint idle 5 menit, lalu kirim request. Catat waktu total dari submit sampai response. Expected: 15–30 detik (cold start + inferensi).

- [ ] **Step 2: Cek warm request**

Kirim request kedua langsung setelah pertama. Expected: 3–6 detik total.

- [ ] **Step 3: Cek biaya di RunPod dashboard**

Buka https://www.runpod.io/console/billing → pastikan charged per request, bukan flat.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat(runpod): migration complete — Whisper now runs on RunPod RTX 3090"
```

---

## Catatan Upgrade ke Warm-up Ping (Nanti)

Ketika siap upgrade dari Opsi A ke Opsi B, tambahkan cron job ini di VPS:

```bash
# Edit crontab
crontab -e

# Tambahkan baris (ping setiap 5 menit):
*/5 * * * * curl -s -X POST https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/run \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input":{"audio_base64":"AAAA"}}' > /dev/null
```

Tidak perlu ubah apapun di kode — hanya cron job ini.
