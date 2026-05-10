import { prisma } from '../../src/lib/prisma.js'

export async function cleanDb() {
  await prisma.subscription.deleteMany()
  await prisma.userBadge.deleteMany()
  await prisma.readingProgress.deleteMany()
  await prisma.gamification.deleteMany()
  await prisma.profile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.storyPage.deleteMany()
  await prisma.story.deleteMany()
  await prisma.badge.deleteMany()
}
