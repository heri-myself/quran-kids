import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
  UPLOAD_DIR: z.string().default('./uploads'),
  BASE_URL: z.string().default('http://localhost:3000'),
  MIDTRANS_SERVER_KEY: z.string(),
  MIDTRANS_CLIENT_KEY: z.string(),
  MIDTRANS_IS_PRODUCTION: z.coerce.boolean().default(false),
})

export const config = envSchema.parse(process.env)
