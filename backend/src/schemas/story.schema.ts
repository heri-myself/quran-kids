import { z } from 'zod'

export const storyFilterSchema = z.object({
  category: z.enum(['sahabat_nabi', 'kisah_quran', 'akhlaq']).optional(),
  premium: z.enum(['true', 'false']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
})

export const createStorySchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  category: z.enum(['sahabat_nabi', 'kisah_quran', 'akhlaq']),
  difficultyLevel: z.enum(['easy', 'medium', 'hard']).default('easy'),
  isPremium: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
})

export const createPageSchema = z.object({
  pageNumber: z.number().int().min(1),
  textArabic: z.string().optional(),
  textLatin: z.string().optional(),
  textTranslation: z.string().min(1),
  durationSeconds: z.number().optional(),
})
