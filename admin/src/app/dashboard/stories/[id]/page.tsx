'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageList } from '@/components/page-list'
import { PageUploadForm } from '@/components/page-upload-form'
import { useAllAdminStories, usePublishStory } from '@/hooks/use-stories'
import { useStoryPages } from '@/hooks/use-story-pages'
import { Eye, Globe, ArrowLeft } from 'lucide-react'

export default function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const { data: storiesData } = useAllAdminStories()
  const story = storiesData?.data.find((s) => s.id === id)
  const { data: pages = [] } = useStoryPages(story?.slug ?? '')
  const publishStory = usePublishStory()

  if (!storiesData) {
    return <p className="text-slate-500">Memuat kisah...</p>
  }
  if (!story) {
    return <p className="text-red-500">Kisah tidak ditemukan.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Kembali
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800">{story.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            {story.isPublished ? (
              <Badge className="bg-emerald-100 text-emerald-700">Published</Badge>
            ) : (
              <Badge variant="outline">Draft</Badge>
            )}
            <span className="text-sm text-slate-500">{pages.length} halaman</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/stories/${id}/preview`}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium h-7 hover:bg-muted"
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
            Preview
          </Link>
          {!story.isPublished && (
            <Button
              size="sm"
              onClick={() => {
                setPublishingId(id)
                publishStory.mutate(id, { onSettled: () => setPublishingId(null) })
              }}
              disabled={publishingId === id || pages.length === 0}
            >
              <Globe className="w-4 h-4 mr-1" aria-hidden="true" />
              Publish
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-slate-700 mb-3">Halaman ({pages.length})</h3>
          <PageList pages={pages} />
        </div>
        <div>
          <PageUploadForm storyId={id} nextPageNumber={pages.length + 1} />
        </div>
      </div>
    </div>
  )
}
