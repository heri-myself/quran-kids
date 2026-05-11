import { useQuery, useMutation } from '@tanstack/react-query'
import { getSubscriptionApi, createCheckoutApi } from '../services/subscription'

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: getSubscriptionApi,
  })
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (plan: 'monthly' | 'yearly') => createCheckoutApi(plan),
  })
}
