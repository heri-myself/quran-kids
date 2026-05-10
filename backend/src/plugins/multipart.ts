import fp from 'fastify-plugin'
import fastifyMultipart from '@fastify/multipart'

export default fp(async (app) => {
  app.register(fastifyMultipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  })
})
