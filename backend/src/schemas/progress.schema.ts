import { z } from 'zod'

export const updateProgressSchema = z.object({
  profileId: z.string(),
  storyId: z.string(),
  lastPage: z.number().int().min(1),
  isCompleted: z.boolean().default(false),
})
