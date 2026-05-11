'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
                  onClick={() => {
                    setPublishingId(story.id)
                    publishStory.mutate(story.id, { onSettled: () => setPublishingId(null) })
                  }}
                  disabled={publishingId === story.id}
                  aria-label={`Publish ${story.title}`}
                >
                  <Globe className="w-4 h-4" aria-hidden="true" />
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === story.id}
                      className="text-red-500 hover:text-red-700"
                      aria-label={`Hapus ${story.title}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus kisah?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Kisah &quot;{story.title}&quot; akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setDeletingId(story.id)
                        deleteStory.mutate(story.id, { onSettled: () => setDeletingId(null) })
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
