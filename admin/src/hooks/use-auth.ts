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
    mutationFn: (data: { email: string; password: string; remember: boolean }) =>
      api.post<LoginResponse>('/auth/login', { email: data.email, password: data.password }).then((res) => ({
        ...res,
        remember: data.remember,
      })),
    onSuccess: (data) => {
      setToken(data.accessToken, data.remember)
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
