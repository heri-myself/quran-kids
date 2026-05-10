import { buildApp } from './app.js'
import { config } from './config.js'
import fs from 'fs'

fs.mkdirSync(config.UPLOAD_DIR, { recursive: true })

const app = buildApp()

app.listen({ port: config.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
