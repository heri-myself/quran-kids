import chaptersData from '../assets/quran/chapters.json'
import versesData from '../assets/quran/verses.json'

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

export function getChapters(): Chapter[] {
  return chaptersData as unknown as Chapter[]
}

export function getSurahVerses(chapterId: number): Verse[] {
  return ((versesData as any)[String(chapterId)] ?? []) as Verse[]
}
