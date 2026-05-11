'use client'

import { StoryPage } from '@/hooks/use-story-pages'
import { Badge } from '@/components/ui/badge'
import { FileAudio, ImageIcon } from 'lucide-react'

export function PageList({ pages }: { pages: StoryPage[] }) {
  if (pages.length === 0) {
    return <p className="text-slate-500 text-sm">Belum ada halaman. Upload halaman pertama di bawah.</p>
  }

  return (
    <div className="space-y-3">
      {pages.map((page) => (
        <div key={page.id} className="border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline">Halaman {page.pageNumber}</Badge>
            <div className="flex gap-2">
              {page.illustrationUrl && <ImageIcon className="w-4 h-4 text-blue-500" aria-hidden="true" />}
              {page.audioUrl && <FileAudio className="w-4 h-4 text-green-500" aria-hidden="true" />}
            </div>
          </div>
          {page.textArabic && (
            <p className="text-right text-lg mb-1 text-slate-700">{page.textArabic}</p>
          )}
          {page.textLatin && (
            <p className="text-sm text-slate-500 italic mb-1">{page.textLatin}</p>
          )}
          <p className="text-sm text-slate-700">{page.textTranslation}</p>
        </div>
      ))}
    </div>
  )
}
