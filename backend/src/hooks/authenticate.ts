import { FastifyRequest, FastifyReply } from 'fastify'

export type JwtPayload = {
  userId: string
  role: string
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply)
  if (reply.sent) return
  const payload = request.user as JwtPayload
  if (payload.role !== 'admin') {
    reply.code(403).send({ error: 'Forbidden' })
  }
}
