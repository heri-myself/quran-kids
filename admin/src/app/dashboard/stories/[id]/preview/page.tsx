'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useAllAdminStories } from '@/hooks/use-stories'
import { useStoryPages } from '@/hooks/use-story-pages'

export default function StoryPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [currentPage, setCurrentPage] = useState(0)
  const { data: storiesData } = useAllAdminStories()
  const story = storiesData?.data.find((s) => s.id === id)
  const { data: pages = [] } = useStoryPages(story?.slug ?? '')

  if (!storiesData) return <p className="text-slate-500">Memuat...</p>
  if (!story) return <p className="text-red-500">Kisah tidak ditemukan.</p>

  const page = pages[currentPage]

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/dashboard/stories/${id}`}
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" />
          Kembali
        </Link>
        <h2 className="font-bold text-slate-800">{story.title}</h2>
      </div>

      {pages.length === 0 ? (
        <p className="text-slate-500 text-center py-12">Belum ada halaman untuk di-preview.</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {page.illustrationUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.illustrationUrl}
              alt={`Ilustrasi halaman ${page.pageNumber}`}
              className="w-full aspect-video object-cover"
            />
          )}
          <div className="p-6 space-y-3">
            {page.textArabic && (
              <p className="text-right text-2xl leading-loose text-slate-800">
                {page.textArabic}
              </p>
            )}
            {page.textLatin && (
              <p className="text-sm text-slate-500 italic">{page.textLatin}</p>
            )}
            <p className="text-slate-700">{page.textTranslation}</p>
            {page.audioUrl && (
              <audio controls src={page.audioUrl} className="w-full mt-2">
                <track kind="captions" />
              </audio>
            )}
          </div>
          <div className="flex items-center justify-between px-6 pb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              aria-label="Halaman sebelumnya"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
            <span className="text-sm text-slate-500">
              {currentPage + 1} / {pages.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
              disabled={currentPage === pages.length - 1}
              aria-label="Halaman berikutnya"
            >
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
