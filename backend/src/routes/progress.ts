import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { updateProgressSchema } from '../schemas/progress.schema.js'
import { authenticate } from '../hooks/authenticate.js'
import {
  POINTS,
  getLevelFromPoints,
  isNewDay,
  isConsecutiveDay,
} from '../lib/gamification.js'
import { BadgeRequirementType } from '@prisma/client'

const progressRoutes: FastifyPluginAsync = async (app) => {
  app.post('/progress', { preHandler: [authenticate] }, async (request, reply) => {
    const body = updateProgressSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const { profileId, storyId, lastPage, isCompleted } = body.data

    const progress = await prisma.readingProgress.upsert({
      where: { profileId_storyId: { profileId, storyId } },
      create: { profileId, storyId, lastPage, isCompleted },
      update: {
        lastPage,
        isCompleted,
        ...(isCompleted && { completedAt: new Date() }),
      },
    })

    if (isCompleted) {
      const gamification = await prisma.gamification.findUnique({ where: { profileId } })
      if (gamification) {
        let pointsToAdd = POINTS.STORY_COMPLETE
        let newStreak = gamification.currentStreak

        if (isNewDay(gamification.lastReadAt)) {
          if (isConsecutiveDay(gamification.lastReadAt)) {
            newStreak += 1
            pointsToAdd += POINTS.DAILY_STREAK
          } else {
            newStreak = 1
          }
        }

        const newTotal = gamification.totalPoints + pointsToAdd
        await prisma.gamification.update({
          where: { profileId },
          data: {
            totalPoints: newTotal,
            currentLevel: getLevelFromPoints(newTotal),
            currentStreak: newStreak,
            lastReadAt: new Date(),
          },
        })

        await checkAndAwardBadges(profileId, newTotal, newStreak)
      }
    }

    return reply.send(progress)
  })

  app.get('/gamification/:profileId', async (request, reply) => {
    const { profileId } = request.params as { profileId: string }
    const gamification = await prisma.gamification.findUnique({ where: { profileId } })
    if (!gamification) return reply.code(404).send({ error: 'Not found' })

    const userBadges = await prisma.userBadge.findMany({
      where: { profileId },
      include: { badge: true },
    })
    const allBadges = await prisma.badge.findMany()

    const earnedIds = new Set(userBadges.map((ub) => ub.badgeId))
    const badges = allBadges.map((b) => ({
      ...b,
      earned: earnedIds.has(b.id),
      earnedAt: userBadges.find((ub) => ub.badgeId === b.id)?.earnedAt ?? null,
    }))

    return reply.send({ ...gamification, badges })
  })
}

async function checkAndAwardBadges(profileId: string, totalPoints: number, streak: number) {
  const completedCount = await prisma.readingProgress.count({
    where: { profileId, isCompleted: true },
  })

  const badges = await prisma.badge.findMany()

  for (const badge of badges) {
    const alreadyHas = await prisma.userBadge.findUnique({
      where: { profileId_badgeId: { profileId, badgeId: badge.id } },
    })
    if (alreadyHas) continue

    let earned = false
    if (badge.requirementType === BadgeRequirementType.stories_completed && completedCount >= badge.requirementValue) earned = true
    if (badge.requirementType === BadgeRequirementType.streak_days && streak >= badge.requirementValue) earned = true
    if (badge.requirementType === BadgeRequirementType.points && totalPoints >= badge.requirementValue) earned = true

    if (earned) {
      await prisma.userBadge.create({ data: { profileId, badgeId: badge.id } })
    }
  }
}

export default progressRoutes
