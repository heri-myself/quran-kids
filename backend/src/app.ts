import Fastify, { FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import jwtPlugin from './plugins/jwt.js'
import multipartPlugin from './plugins/multipart.js'
import staticPlugin from './plugins/static.js'
import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profiles.js'
import storyRoutes from './routes/stories.js'
import progressRoutes from './routes/progress.js'
import subscriptionRoutes from './routes/subscription.js'
import tilawahRoutes from './routes/tilawah.js'
import hafalanRoutes from './routes/hafalan.js'
import adminStoryRoutes from './routes/admin/stories.js'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(cors, { origin: true })
  app.register(jwtPlugin)
  app.register(multipartPlugin)
  app.register(staticPlugin)

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })

  app.register(authRoutes, { prefix: '/auth' })
  app.register(profileRoutes, { prefix: '/profiles' })
  app.register(storyRoutes, { prefix: '/stories' })
  app.register(progressRoutes)
  app.register(subscriptionRoutes, { prefix: '/subscription' })
  app.register(tilawahRoutes, { prefix: '/tilawah' })
  app.register(hafalanRoutes, { prefix: '/hafalan' })
  app.register(adminStoryRoutes, { prefix: '/admin' })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
