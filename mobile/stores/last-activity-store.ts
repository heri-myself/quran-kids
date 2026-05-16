import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface LastTilawahActivity {
  surahId: number
  surahName: string
  verseNumber: number
  timestamp: number
}

export interface LastHafalanActivity {
  surahId: number
  surahName: string
  timestamp: number
}

interface LastActivityState {
  lastTilawah: LastTilawahActivity | null
  lastHafalan: LastHafalanActivity | null
  setLastTilawah: (activity: LastTilawahActivity) => void
  setLastHafalan: (activity: LastHafalanActivity) => void
}

export const useLastActivityStore = create<LastActivityState>()(
  persist(
    (set) => ({
      lastTilawah: null,
      lastHafalan: null,
      setLastTilawah: (activity) => set({ lastTilawah: activity }),
      setLastHafalan: (activity) => set({ lastHafalan: activity }),
    }),
    {
      name: 'last-activity',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
