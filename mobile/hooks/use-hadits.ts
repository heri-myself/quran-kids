import { useMemo } from 'react'
import haditsData from '../assets/hadits/hadits.json'

export type KategoriHadits = 'semua' | 'akhlaq' | 'ibadah' | 'keluarga' | 'ilmu' | 'doa'

export interface Hadits {
  id: number
  arabic: string
  indonesia: string
  perawi: string
  kategori: KategoriHadits
  pelajaran: string
}

const ALL_HADITS: Hadits[] = haditsData as Hadits[]

export function useHadits(kategori: KategoriHadits = 'semua', query = '') {
  return useMemo(() => {
    let result = ALL_HADITS
    if (kategori !== 'semua') {
      result = result.filter(h => h.kategori === kategori)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(
        h => h.indonesia.toLowerCase().includes(q) || h.perawi.toLowerCase().includes(q)
      )
    }
    return result
  }, [kategori, query])
}

export function useHaditsById(id: number): Hadits | undefined {
  return useMemo(() => ALL_HADITS.find(h => h.id === id), [id])
}
