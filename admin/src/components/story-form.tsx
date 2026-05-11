'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateStory } from '@/hooks/use-stories'

const storySchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  slug: z.string().min(1, 'Slug wajib diisi').regex(/^[a-z0-9-]+$/, 'Slug hanya huruf kecil, angka, dan tanda hubung'),
  category: z.enum(['sahabat_nabi', 'kisah_quran', 'akhlaq']),
  difficultyLevel: z.enum(['easy', 'medium', 'hard']),
  isPremium: z.boolean(),
})

type StoryValues = z.infer<typeof storySchema>

export function StoryForm() {
  const router = useRouter()
  const createStory = useCreateStory()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StoryValues>({
    resolver: zodResolver(storySchema),
    defaultValues: { difficultyLevel: 'easy', isPremium: false, category: 'sahabat_nabi' },
  })

  function onTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const slug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
    setValue('slug', slug)
  }

  async function onSubmit(data: StoryValues) {
    const story = await createStory.mutateAsync(data)
    router.push(`/dashboard/stories/${story.id}`)
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Kisah Baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">Judul Kisah</Label>
            <Input
              id="title"
              {...register('title')}
              onChange={(e) => {
                register('title').onChange(e)
                onTitleChange(e)
              }}
              placeholder="Kisah Abu Bakar Ash-Shiddiq"
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="slug">Slug URL</Label>
            <Input id="slug" {...register('slug')} placeholder="kisah-abu-bakar-ash-shiddiq" />
            {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Kategori</Label>
            <Select defaultValue="sahabat_nabi" onValueChange={(v) => setValue('category', v as StoryValues['category'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sahabat_nabi">Sahabat Nabi</SelectItem>
                <SelectItem value="kisah_quran">Kisah Al-Quran</SelectItem>
                <SelectItem value="akhlaq">Akhlaq</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Tingkat Kesulitan</Label>
            <Select defaultValue="easy" onValueChange={(v) => setValue('difficultyLevel', v as StoryValues['difficultyLevel'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Mudah</SelectItem>
                <SelectItem value="medium">Sedang</SelectItem>
                <SelectItem value="hard">Sulit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPremium"
              {...register('isPremium')}
              className="rounded"
            />
            <Label htmlFor="isPremium">Konten Premium</Label>
          </div>

          {createStory.isError && (
            <p className="text-sm text-red-500">
              {createStory.error instanceof Error ? createStory.error.message : 'Gagal membuat kisah'}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={createStory.isPending}>
              {createStory.isPending ? 'Menyimpan...' : 'Simpan & Lanjut'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
