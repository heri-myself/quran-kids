import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {},
    setupFiles: ['dotenv/config'],
    fileParallelism: false,
  },
})
