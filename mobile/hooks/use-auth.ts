import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { loginApi, registerApi } from '../services/auth'
import { useAuthStore } from '../stores/auth-store'

export function useLogin() {
  const { setAuth } = useAuthStore()
  const router = useRouter()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginApi(email, password),
    onSuccess: async (data) => {
      await setAuth(data.user, data.accessToken, data.refreshToken)
      router.replace('/(auth)/profiles')
    },
  })
}

export function useRegister() {
  const { setAuth } = useAuthStore()
  const router = useRouter()

  return useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      registerApi(email, password, name),
    onSuccess: async (data) => {
      await setAuth(data.user, data.accessToken, data.refreshToken)
      router.replace('/(child)')
    },
  })
}

export function useLogout() {
  const { logout } = useAuthStore()
  const router = useRouter()

  return async () => {
    await logout()
    router.replace('/(auth)/login')
  }
}
