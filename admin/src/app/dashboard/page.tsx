import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { StoryList } from '@/components/story-list'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Daftar Kisah</h2>
        <Link href="/dashboard/stories/new" className={cn(buttonVariants())}>
          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
          Tambah Kisah
        </Link>
      </div>
      <StoryList />
    </div>
  )
}
