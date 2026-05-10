import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { storyFilterSchema } from '../schemas/story.schema.js'

const storyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const query = storyFilterSchema.safeParse(request.query)
    if (!query.success) return reply.code(400).send({ error: query.error.flatten() })

    const { category, premium, page, limit } = query.data
    const skip = (page - 1) * limit

    const where = {
      isPublished: true,
      ...(category && { category }),
      ...(premium !== undefined && { isPremium: premium === 'true' }),
    }

    const [data, total] = await Promise.all([
      prisma.story.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.story.count({ where }),
    ])

    return reply.send({ data, total, page, limit })
  })

  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const story = await prisma.story.findFirst({
      where: { slug, isPublished: true },
    })
    if (!story) return reply.code(404).send({ error: 'Story not found' })
    return reply.send(story)
  })

  app.get('/:slug/pages', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const story = await prisma.story.findFirst({
      where: { slug, isPublished: true },
      include: { pages: { orderBy: { pageNumber: 'asc' } } },
    })
    if (!story) return reply.code(404).send({ error: 'Story not found' })
    return reply.send(story.pages)
  })
}

export default storyRoutes
