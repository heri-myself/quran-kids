import { api } from './api'
import { Profile } from '../stores/profile-store'

export function getProfilesApi(): Promise<Profile[]> {
  return api.get<Profile[]>('/profiles')
}

export function createProfileApi(data: {
  name: string
  age: number
  role: 'child'
}): Promise<Profile> {
  return api.post<Profile>('/profiles', data)
}

export function updateProfileApi(id: string, data: { name?: string; age?: number }): Promise<Profile> {
  return api.put<Profile>(`/profiles/${id}`, data)
}

export function deleteProfileApi(id: string): Promise<void> {
  return api.delete(`/profiles/${id}`)
}
