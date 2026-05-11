import { z } from 'zod'

export const createProfileSchema = z.object({
  name: z.string().min(1),
  avatar: z.string().optional(),
  age: z.number().int().min(1).max(18).optional(),
})

export const updateProfileSchema = createProfileSchema.partial()

export type CreateProfileInput = z.infer<typeof createProfileSchema>
