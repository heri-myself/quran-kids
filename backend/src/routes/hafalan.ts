// backend/src/routes/hafalan.ts
import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../hooks/authenticate.js'
import { getLevelFromPoints, isNewDay, isConsecutiveDay, POINTS as GAMIFICATION_POINTS } from '../lib/gamification.js'
import { z } from 'zod'

const sessionSchema = z.object({
  profileId: z.string().min(1),
  chapterId: z.number().int().min(1).max(114),
  verses: z.array(z.object({
    verseNumber: z.number().int().min(1).max(286),
    score: z.number().int().min(0).max(100),
    wordResults: z.array(z.object({
      word: z.string(),
      correct: z.boolean(),
      expected: z.string(),
    })),
  })).min(1).max(286),
})

function calcPointsFromAvg(avgScore: number): number {
  if (avgScore >= 90) return 50
  if (avgScore >= 70) return 30
  return 15
}

const hafalanRoutes: FastifyPluginAsync = async (app) => {
  app.post('/session', { preHandler: [authenticate] }, async (request, reply) => {
    const body = sessionSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { profileId, chapterId, verses } = body.data
    const avgScore = Math.round(verses.reduce((sum, v) => sum + v.score, 0) / verses.length)
    const pointsEarned = calcPointsFromAvg(avgScore)

    try {
      const session = await prisma.hafalanSession.create({
        data: {
          profileId,
          chapterId,
          totalVerses: verses.length,
          avgScore,
          pointsEarned,
          verses: {
            create: verses.map((v) => ({
              verseNumber: v.verseNumber,
              score: v.score,
              wordResults: v.wordResults,
            })),
          },
        },
      })

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

      return reply.send({ sessionId: session.id, avgScore, pointsEarned })
    } catch (err: any) {
      app.log.error(err)
      return reply.code(500).send({ error: 'Gagal menyimpan sesi hafalan' })
    }
  })
}

export default hafalanRoutes
