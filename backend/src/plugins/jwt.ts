import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { config } from '../config.js'

export default fp(async (app) => {
  app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
  })
})
