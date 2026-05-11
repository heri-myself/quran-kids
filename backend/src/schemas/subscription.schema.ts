import { z } from 'zod'

export const activateSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
})

export const midtransWebhookSchema = z.object({
  order_id: z.string(),
  transaction_status: z.string(),
  fraud_status: z.string().optional(),
})
