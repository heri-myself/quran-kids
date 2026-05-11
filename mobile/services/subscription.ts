import { api } from './api'

export interface Subscription {
  id: string
  userId: string
  plan: 'monthly' | 'yearly'
  status: 'active' | 'expired'
  startedAt: string
  expiresAt: string
}

export interface CheckoutResponse {
  snapToken: string
  redirectUrl: string
}

export function getSubscriptionApi(): Promise<Subscription | null> {
  return api.get<Subscription | null>('/subscription').catch(() => null)
}

export function createCheckoutApi(plan: 'monthly' | 'yearly'): Promise<CheckoutResponse> {
  return api.post<CheckoutResponse>('/subscription/checkout', { plan })
}
