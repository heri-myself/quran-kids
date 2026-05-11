'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAllAdminStories, useDeleteStory, usePublishStory } from '@/hooks/use-stories'
import { BookOpen, Eye, Trash2, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS = {
  sahabat_nabi: 'Sahabat Nabi',
  kisah_quran: 'Kisah Al-Quran',
  akhlaq: 'Akhlaq',
}

const DIFFICULTY_LABELS = {
  easy: 'Mudah',
  medium: 'Sedang',
  hard: 'Sulit',
}

export function StoryList() {
  const { data, isLoading, isError } = useAllAdminStories()
  const deleteStory = useDeleteStory()
  const publishStory = usePublishStory()

  if (isLoading) return <p className="text-slate-500">Memuat kisah...</p>
  if (isError) return <p className="text-red-500">Gagal memuat daftar kisah.</p>

  const stories = data?.data ?? []

  if (stories.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" aria-hidden="true" />
        <p className="text-slate-500">Belum ada kisah. Tambah kisah pertama!</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {stories.map((story) => (
        <Card key={story.id}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-800">{story.title}</h3>
                {story.isPremium && <Badge variant="secondary">Premium</Badge>}
                {story.isPublished ? (
                  <Badge className="bg-emerald-100 text-emerald-700">Published</Badge>
                ) : (
                  <Badge variant="outline">Draft</Badge>
                )}
              </div>
              <p className="text-sm text-slate-500">
                {CATEGORY_LABELS[story.category]} · {DIFFICULTY_LABELS[story.difficultyLevel]} ·{' '}
                {story.totalPages} halaman
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/stories/${story.id}`}
                aria-label={`Edit ${story.title}`}
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href={`/dashboard/stories/${story.id}/preview`}
                aria-label={`Preview ${story.title}`}
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
              >
                <Eye className="w-4 h-4" aria-hidden="true" />
              </Link>
              {!story.isPublished && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => publishStory.mutate(story.id)}
                  disabled={publishStory.isPending}
                  aria-label={`Publish ${story.title}`}
                >
                  <Globe className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm(`Hapus kisah "${story.title}"?`)) {
                    deleteStory.mutate(story.id)
                  }
                }}
                disabled={deleteStory.isPending}
                className="text-red-500 hover:text-red-700"
                aria-label={`Hapus ${story.title}`}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
