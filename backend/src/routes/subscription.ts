import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate, JwtPayload } from '../hooks/authenticate.js'
import { activateSchema, midtransWebhookSchema } from '../schemas/subscription.schema.js'
import { snap } from '../lib/midtrans.js'

const PLAN_PRICES = {
  monthly: { amount: 29000, durationDays: 30 },
  yearly: { amount: 249000, durationDays: 365 },
}

const subscriptionRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user as JwtPayload
    const subscription = await prisma.subscription.findUnique({ where: { userId } })
    return reply.send(subscription ?? { status: 'none' })
  })

  app.post('/checkout', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user as JwtPayload
    const body = activateSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.code(404).send({ error: 'User not found' })

    const { amount } = PLAN_PRICES[body.data.plan]
    const orderId = `QK-${userId}-${Date.now()}`

    const snapParams = {
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: { email: user.email },
      metadata: { userId, plan: body.data.plan },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transaction = await snap.createTransaction(snapParams as any)

    return reply.send({ snapToken: transaction.token, redirectUrl: transaction.redirect_url })
  })

  // Midtrans webhook
  app.post('/activate', async (request, reply) => {
    const body = midtransWebhookSchema.safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid webhook' })

    const { order_id, transaction_status, fraud_status } = body.data

    const isSuccess =
      (transaction_status === 'capture' && fraud_status === 'accept') ||
      transaction_status === 'settlement'

    if (!isSuccess) return reply.send({ received: true })

    // Parse userId from order_id format: QK-{userId}-{timestamp}
    const parts = order_id.split('-')
    // order_id format: QK-{cuid}-{timestamp}
    // cuid looks like: cm123abc456 (no dashes), so parts[1] is the userId
    const userId = parts[1]
    const webhookBody = request.body as Record<string, unknown>
    const metadata = webhookBody.metadata as Record<string, string> | undefined
    const planRaw = metadata?.plan ?? 'monthly'
    const plan = planRaw as 'monthly' | 'yearly'

    const { durationDays } = PLAN_PRICES[plan]
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + durationDays)

    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan, status: 'active', expiresAt },
      update: { plan, status: 'active', expiresAt, startedAt: new Date() },
    })

    return reply.send({ received: true })
  })
}

export default subscriptionRoutes
