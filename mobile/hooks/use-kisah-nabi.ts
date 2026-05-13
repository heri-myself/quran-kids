import kisahNabiData from '../assets/kisah-nabi/kisah_nabi.json'

export interface KisahNabi {
  id: number
  slug: string
  title: string
  category: string
  prophet: string
  summary: string
  content: string
  source: string
  license: string
  attribution: string
  tags: string[]
  readTime: number
  thumbnail: string | null
}

const data = kisahNabiData as KisahNabi[]

export function useKisahNabiList(): KisahNabi[] {
  return data
}

export function useKisahNabiDetail(id: number): KisahNabi | undefined {
  return data.find((k) => k.id === id)
}
