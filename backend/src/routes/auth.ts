import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { registerSchema, loginSchema } from '../schemas/auth.schema.js'

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const existing = await prisma.user.findUnique({ where: { email: body.data.email } })
    if (existing) return reply.code(409).send({ error: 'Email already registered' })

    const passwordHash = await hashPassword(body.data.password)
    const user = await prisma.user.create({
      data: { email: body.data.email, passwordHash },
    })

    await prisma.profile.create({
      data: { userId: user.id, name: body.data.name, role: 'parent' },
    })

    const accessToken = app.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: '7d' })

    return reply.code(201).send({
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    })
  })

  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const user = await prisma.user.findUnique({ where: { email: body.data.email } })
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' })

    const valid = await verifyPassword(body.data.password, user.passwordHash)
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })

    const accessToken = app.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: '7d' })

    return reply.send({
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    })
  })

  app.post('/refresh', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as { userId: string; role: string }
    const accessToken = app.jwt.sign(
      { userId: payload.userId, role: payload.role },
      { expiresIn: '7d' },
    )
    return reply.send({ accessToken })
  })
}

export default authRoutes
