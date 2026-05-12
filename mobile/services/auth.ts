import { api } from './api'

export interface User {
  id: string
  email: string
  role: 'parent' | 'admin'
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export function loginApi(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login', { email, password })
}

export function registerApi(email: string, password: string, name: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/register', { email, password, name })
}

export function refreshApi(refreshToken: string): Promise<{ accessToken: string }> {
  return api.post<{ accessToken: string }>('/auth/refresh', { refreshToken })
}
