'use client'

import { useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { setToken, clearToken } from '@/lib/auth'
import { useRouter } from 'next/navigation'

type LoginResponse = {
  accessToken: string
  user: { id: string; email: string; role: string }
}

export function useLogin() {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<LoginResponse>('/auth/login', data),
    onSuccess: (data) => {
      setToken(data.accessToken)
      router.push('/dashboard')
    },
  })
}

export function useLogout() {
  const router = useRouter()
  return useCallback(() => {
    clearToken()
    router.push('/login')
  }, [router])
}
