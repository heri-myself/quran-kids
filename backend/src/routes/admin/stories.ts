import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { requireAdmin } from '../../hooks/authenticate.js'
import { createStorySchema, createPageSchema } from '../../schemas/story.schema.js'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import { config } from '../../config.js'
import { randomUUID } from 'crypto'

const adminStoryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/stories', { preHandler: [requireAdmin] }, async (request, reply) => {
    const stories = await prisma.story.findMany({ orderBy: { createdAt: 'desc' } })
    return reply.send({ data: stories, total: stories.length, page: 1, limit: stories.length })
  })

  app.post('/stories', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = createStorySchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const story = await prisma.story.create({ data: body.data })
    return reply.code(201).send(story)
  })

  app.put('/stories/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = createStorySchema.partial().safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const story = await prisma.story.update({ where: { id }, data: body.data })
    return reply.send(story)
  })

  app.delete('/stories/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.story.delete({ where: { id } })
    return reply.code(204).send()
  })

  // Upload page with optional audio + illustration files
  app.post('/stories/:id/pages', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parts = request.parts()

    const fields: Record<string, string> = {}
    let illustrationUrl: string | undefined
    let audioUrl: string | undefined

    for await (const part of parts) {
      if (part.type === 'file') {
        const ext = path.extname(part.filename)
        const filename = `${randomUUID()}${ext}`
        const dest = path.join(config.UPLOAD_DIR, filename)
        await pipeline(part.file, fs.createWriteStream(dest))
        const url = `${config.BASE_URL}/uploads/${filename}`
        if (part.fieldname === 'illustration') illustrationUrl = url
        if (part.fieldname === 'audio') audioUrl = url
      } else {
        fields[part.fieldname] = part.value as string
      }
    }

    const pageData = createPageSchema.safeParse({
      ...fields,
      pageNumber: Number(fields.pageNumber),
      durationSeconds: fields.durationSeconds ? Number(fields.durationSeconds) : undefined,
    })
    if (!pageData.success) return reply.code(400).send({ error: pageData.error.flatten() })

    const page = await prisma.storyPage.create({
      data: { storyId: id, ...pageData.data, illustrationUrl, audioUrl },
    })

    await prisma.story.update({
      where: { id },
      data: { totalPages: { increment: 1 } },
    })

    return reply.code(201).send(page)
  })

  app.put('/stories/:id/publish', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const story = await prisma.story.update({ where: { id }, data: { isPublished: true } })
    return reply.send(story)
  })

  app.post('/stories/:id/cover', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parts = request.parts()

    let coverUrl: string | undefined
    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'cover') {
        const ext = path.extname(part.filename)
        const filename = `${randomUUID()}${ext}`
        const dest = path.join(config.UPLOAD_DIR, filename)
        await pipeline(part.file, fs.createWriteStream(dest))
        coverUrl = `${config.BASE_URL}/uploads/${filename}`
      }
    }

    if (!coverUrl) return reply.code(400).send({ error: 'File cover wajib diisi' })

    const story = await prisma.story.update({ where: { id }, data: { coverImageUrl: coverUrl } })
    return reply.send(story)
  })
}

export default adminStoryRoutes
