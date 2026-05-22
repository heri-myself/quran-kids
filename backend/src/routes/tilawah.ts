import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../hooks/authenticate.js'
import { getLevelFromPoints, isNewDay, isConsecutiveDay, POINTS as GAMIFICATION_POINTS } from '../lib/gamification.js'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { runpodTranscribe } from '../lib/runpod.js'

const evaluateSchema = z.object({
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

// ── Async job store ──────────────────────────────────────────
type JobStatus = 'pending' | 'completed' | 'failed'
interface Job {
  status: JobStatus
  result?: any
  error?: string
  createdAt: number
}
const jobs = new Map<string, Job>()

// Clean up jobs older than 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id)
  }
}, 60_000)

async function runEvaluate(jobId: string, chapterId: number, verseNumber: number, expectedText: string, audioBase64: string, sidecarPath: string) {
  try {
    const transcribeResult = await runpodTranscribe(audioBase64)
    const { transcription, word_timestamps } = transcribeResult

    const res = await fetch(`http://quran-kids-sidecar:8001/${sidecarPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcription, expected_text: expectedText, verse_number: verseNumber, chapter_id: chapterId, word_timestamps }),
    })
    if (!res.ok) throw new Error(`Tajweed sidecar error: ${await res.text()}`)
    const pythonResult = await res.json() as any

    jobs.set(jobId, {
      status: 'completed',
      createdAt: jobs.get(jobId)!.createdAt,
      result: {
        verseNumber,
        score: pythonResult.score,
        wordAccuracy: pythonResult.word_accuracy,
        tajweedScore: pythonResult.tajweed_score,
        stars: calcStars(pythonResult.score),
        wordResults: pythonResult.word_results,
        feedback: pythonResult.feedback,
        transcription,
      },
    })
  } catch (err: any) {
    jobs.set(jobId, {
      status: 'failed',
      createdAt: jobs.get(jobId)!.createdAt,
      error: err.message ?? 'Evaluation failed',
    })
  }
}

const tilawahRoutes: FastifyPluginAsync = async (app) => {
  // POST /tilawah/evaluate — submit async job, returns jobId immediately
  app.post('/evaluate', async (request, reply) => {
    const body = evaluateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { chapterId, verseNumber, expectedText, audioBase64 } = body.data
    const jobId = randomUUID()
    jobs.set(jobId, { status: 'pending', createdAt: Date.now() })

    // Run in background — do NOT await
    runEvaluate(jobId, chapterId, verseNumber, expectedText, audioBase64, 'analyze').catch(() => {})

    return reply.send({ jobId })
  })

  // GET /tilawah/job/:jobId — poll for async job result
  app.get('/job/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string }
    const job = jobs.get(jobId)
    if (!job) return reply.code(404).send({ error: 'Job tidak ditemukan' })
    if (job.status === 'pending') return reply.send({ status: 'pending' })
    if (job.status === 'failed') return reply.code(503).send({ status: 'failed', error: job.error })
    return reply.send({ status: 'completed', result: job.result })
  })

  // POST /tilawah/evaluate-simple — submit async job (word accuracy only)
  app.post('/evaluate-simple', async (request, reply) => {
    const body = evaluateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { chapterId, verseNumber, expectedText, audioBase64 } = body.data
    const jobId = randomUUID()
    jobs.set(jobId, { status: 'pending', createdAt: Date.now() })

    runEvaluate(jobId, chapterId, verseNumber, expectedText, audioBase64, 'analyze-simple').catch(() => {})

    return reply.send({ jobId })
  })

  // POST /tilawah/session — simpan hasil akhir sesi ke DB + beri poin
  app.post('/session', { preHandler: [authenticate] }, async (request, reply) => {
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

    // Tambah poin + update streak ke gamifikasi
    const gamification = await prisma.gamification.findUnique({ where: { profileId } })
    if (gamification) {
      let totalToAdd = pointsEarned
      let newStreak = gamification.currentStreak

      if (isNewDay(gamification.lastReadAt)) {
        if (isConsecutiveDay(gamification.lastReadAt)) {
          newStreak += 1
          totalToAdd += GAMIFICATION_POINTS.DAILY_STREAK
        } else {
          newStreak = 1
        }
      }

      const newTotal = gamification.totalPoints + totalToAdd
      await prisma.gamification.update({
        where: { profileId },
        data: {
          totalPoints: newTotal,
          currentLevel: getLevelFromPoints(newTotal),
          currentStreak: newStreak,
          lastReadAt: new Date(),
        },
      })
    }

    return reply.send({ sessionId: session.id, totalScore, stars, pointsEarned })
  })
}

export default tilawahRoutes
