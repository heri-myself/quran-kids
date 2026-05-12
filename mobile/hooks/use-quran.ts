import { useQuery } from '@tanstack/react-query'
import { getChapters, getSurahVerses } from '../services/quran'

export function useChapters() {
  return useQuery({
    queryKey: ['quran-chapters'],
    queryFn: getChapters,
    staleTime: Infinity,
  })
}

export function useSurahVerses(chapterId: number | undefined) {
  return useQuery({
    queryKey: ['quran-surah', chapterId],
    queryFn: () => getSurahVerses(chapterId!),
    enabled: !!chapterId,
    staleTime: Infinity,
  })
}
