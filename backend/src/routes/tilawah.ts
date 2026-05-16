import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../hooks/authenticate.js'
import { getLevelFromPoints, isNewDay, isConsecutiveDay, POINTS as GAMIFICATION_POINTS } from '../lib/gamification.js'
import { z } from 'zod'

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

const tilawahRoutes: FastifyPluginAsync = async (app) => {
  // POST /tilawah/evaluate — evaluasi satu ayat
  app.post('/evaluate', async (request, reply) => {
    const body = evaluateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { chapterId, verseNumber, expectedText, audioBase64 } = body.data

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
