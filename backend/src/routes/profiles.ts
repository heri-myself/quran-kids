import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { createProfileSchema, updateProfileSchema } from '../schemas/profile.schema.js'
import { authenticate, JwtPayload } from '../hooks/authenticate.js'

const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user as JwtPayload
    const profiles = await prisma.profile.findMany({
      where: { userId },
      include: { gamification: true },
    })
    return reply.send(profiles)
  })

  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user as JwtPayload
    const body = createProfileSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const parentProfile = await prisma.profile.findFirst({
      where: { userId, role: 'parent' },
    })

    if (!parentProfile) {
      return reply.code(400).send({ error: 'No parent profile found for this account' })
    }

    const profile = await prisma.profile.create({
      data: {
        userId,
        name: body.data.name,
        avatar: body.data.avatar ?? 'avatar_1',
        age: body.data.age,
        role: 'child',
        parentId: parentProfile.id,
      },
    })

    await prisma.gamification.create({
      data: { profileId: profile.id },
    })

    return reply.code(201).send(profile)
  })

  app.put('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user as JwtPayload
    const { id } = request.params as { id: string }
    const body = updateProfileSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const existing = await prisma.profile.findFirst({ where: { id, userId } })
    if (!existing) return reply.code(404).send({ error: 'Profile not found' })

    const profile = await prisma.profile.update({ where: { id }, data: body.data })
    return reply.send(profile)
  })

  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user as JwtPayload
    const { id } = request.params as { id: string }

    const existing = await prisma.profile.findFirst({ where: { id, userId, role: 'child' } })
    if (!existing) return reply.code(404).send({ error: 'Profile not found' })

    await prisma.profile.delete({ where: { id } })
    return reply.code(204).send()
  })
}

export default profileRoutes
