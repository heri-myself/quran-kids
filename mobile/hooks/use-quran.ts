import { getChapters, getSurahVerses } from '../services/quran'
import type { Chapter, Verse } from '../services/quran'

export function useChapters(): { data: Chapter[]; isLoading: boolean; isError: boolean } {
  return { data: getChapters(), isLoading: false, isError: false }
}

export function useSurahVerses(chapterId: number | undefined): { data: Verse[]; isLoading: boolean; isError: boolean } {
  if (!chapterId) return { data: [], isLoading: false, isError: false }
  return { data: getSurahVerses(chapterId), isLoading: false, isError: false }
}
