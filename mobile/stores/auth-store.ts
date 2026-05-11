import { create } from 'zustand'
import { storeTokens, clearTokens } from '../services/api'
import { User } from '../services/auth'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  setAuth: async (user, accessToken, refreshToken) => {
    await storeTokens(accessToken, refreshToken)
    set({ user, isAuthenticated: true })
  },

  logout: async () => {
    await clearTokens()
    set({ user: null, isAuthenticated: false })
  },
}))
