// backend/src/lib/runpod.ts

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY!
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID!
const BASE_URL = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`

const POLL_INTERVAL_MS = 1_000
const TIMEOUT_MS = 180_000  // 3 menit — cukup untuk cold start RunPod

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
    if (Date.now() - start >= TIMEOUT_MS) break
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
