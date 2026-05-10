import fp from 'fastify-plugin'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { config } from '../config.js'

export default fp(async (app) => {
  app.register(fastifyStatic, {
    root: path.resolve(config.UPLOAD_DIR),
    prefix: '/uploads/',
  })
})
