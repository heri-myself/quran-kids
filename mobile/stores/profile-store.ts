import { create } from 'zustand'

export interface Profile {
  id: string
  name: string
  avatar: string | null
  age: number | null
  role: 'parent' | 'child'
  parentId: string | null
  userId: string
}

interface ProfileState {
  activeProfile: Profile | null
  setActiveProfile: (profile: Profile) => void
  clearActiveProfile: () => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  activeProfile: null,
  setActiveProfile: (profile) => set({ activeProfile: profile }),
  clearActiveProfile: () => set({ activeProfile: null }),
}))
