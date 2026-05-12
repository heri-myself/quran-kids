import AsyncStorage from '@react-native-async-storage/async-storage'

const QURAN_API = 'https://api.quran.com/api/v4'
const CACHE_CHAPTERS = 'qk_chapters'
const CACHE_SURAH_PREFIX = 'qk_surah_'

export interface Chapter {
  id: number
  name_simple: string
  translated_name: { name: string }
  verses_count: number
  revelation_place: 'makkah' | 'madinah'
  name_arabic: string
}

export interface WordTranslation {
  text: string
}

export interface Word {
  id: number
  position: number
  text_uthmani: string
  translation: WordTranslation
}

export interface VerseTranslation {
  text: string
}

export interface Verse {
  id: number
  verse_number: number
  words: Word[]
  translations: VerseTranslation[]
}

async function fetchWithCache<T>(cacheKey: string, url: string): Promise<T> {
  const cached = await AsyncStorage.getItem(cacheKey)
  if (cached) return JSON.parse(cached) as T

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Quran API error: ${res.status}`)
  const data = await res.json()
  await AsyncStorage.setItem(cacheKey, JSON.stringify(data))
  return data as T
}

export async function getChapters(): Promise<Chapter[]> {
  const data = await fetchWithCache<{ chapters: Chapter[] }>(
    CACHE_CHAPTERS,
    `${QURAN_API}/chapters?language=id`,
  )
  return data.chapters
}

export async function getSurahVerses(chapterId: number): Promise<Verse[]> {
  const data = await fetchWithCache<{ verses: Verse[] }>(
    `${CACHE_SURAH_PREFIX}${chapterId}`,
    `${QURAN_API}/verses/by_chapter/${chapterId}?words=true&translations=33&fields=text_uthmani&per_page=300&word_fields=text_uthmani,translation`,
  )
  return data.verses
}
