'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUploadPage } from '@/hooks/use-story-pages'

const pageSchema = z.object({
  pageNumber: z.preprocess((v) => Number(v), z.number().int().min(1, 'Nomor halaman minimal 1')),
  textArabic: z.string().optional(),
  textLatin: z.string().optional(),
  textTranslation: z.string().min(1, 'Terjemahan wajib diisi'),
  durationSeconds: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().optional()),
})

type PageValues = z.infer<typeof pageSchema>

export function PageUploadForm({
  storyId,
  nextPageNumber,
}: {
  storyId: string
  nextPageNumber: number
}) {
  const uploadPage = useUploadPage(storyId)
  const [illustrationFile, setIllustrationFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PageValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(pageSchema) as Resolver<PageValues>,
    defaultValues: { pageNumber: nextPageNumber },
  })

  async function onSubmit(data: PageValues) {
    const form = new FormData()
    form.append('pageNumber', String(data.pageNumber))
    form.append('textTranslation', data.textTranslation)
    if (data.textArabic) form.append('textArabic', data.textArabic)
    if (data.textLatin) form.append('textLatin', data.textLatin)
    if (data.durationSeconds) form.append('durationSeconds', String(data.durationSeconds))
    if (illustrationFile) form.append('illustration', illustrationFile)
    if (audioFile) form.append('audio', audioFile)

    try {
      await uploadPage.mutateAsync(form)
      reset({ pageNumber: data.pageNumber + 1 })
      setIllustrationFile(null)
      setAudioFile(null)
    } catch {
      // error surfaced via uploadPage.isError
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Halaman Baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="pageNumber">Nomor Halaman</Label>
            <Input id="pageNumber" type="number" {...register('pageNumber')} className="w-24" />
            {errors.pageNumber && <p className="text-sm text-red-500">{errors.pageNumber.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="textArabic">Teks Arab (opsional)</Label>
            <Textarea id="textArabic" {...register('textArabic')} rows={2} dir="rtl" className="text-right text-lg" placeholder="بسم الله..." />
          </div>

          <div className="space-y-1">
            <Label htmlFor="textLatin">Teks Latin (opsional)</Label>
            <Input id="textLatin" {...register('textLatin')} placeholder="Bismillah..." />
          </div>

          <div className="space-y-1">
            <Label htmlFor="textTranslation">Terjemahan Indonesia *</Label>
            <Textarea
              id="textTranslation"
              {...register('textTranslation')}
              rows={3}
              placeholder="Dengan nama Allah..."
              aria-invalid={!!errors.textTranslation}
              aria-describedby={errors.textTranslation ? 'translation-error' : undefined}
            />
            {errors.textTranslation && (
              <p id="translation-error" role="alert" className="text-sm text-red-500">{errors.textTranslation.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="illustration">Ilustrasi (gambar)</Label>
              <Input
                id="illustration"
                type="file"
                accept="image/*"
                onChange={(e) => setIllustrationFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="audio">Audio Narasi</Label>
              <Input
                id="audio"
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              />
              <div className="space-y-1 mt-2">
                <Label htmlFor="durationSeconds" className="text-xs text-slate-500">Durasi (detik, opsional)</Label>
                <Input id="durationSeconds" type="number" {...register('durationSeconds')} className="w-24" placeholder="60" />
              </div>
            </div>
          </div>

          {uploadPage.isError && (
            <p className="text-sm text-red-500">
              {uploadPage.error instanceof Error ? uploadPage.error.message : 'Gagal upload halaman'}
            </p>
          )}

          <Button type="submit" disabled={uploadPage.isPending}>
            {uploadPage.isPending ? 'Mengupload...' : 'Upload Halaman'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
