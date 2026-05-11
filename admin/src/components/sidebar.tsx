'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, LayoutDashboard, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLogout } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/stories/new', label: 'Tambah Kisah', icon: BookOpen },
]

export function Sidebar() {
  const pathname = usePathname()
  const logout = useLogout()

  return (
    <aside className="w-56 min-h-screen bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        <h1 className="font-bold text-lg text-emerald-700">Quran Kids</h1>
        <p className="text-xs text-slate-500">Admin Panel</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === item.href
                ? 'bg-emerald-50 text-emerald-700 font-medium'
                : 'text-slate-600 hover:bg-slate-50',
            )}
          >
            <item.icon className="w-4 h-4" aria-hidden={true} />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={logout}>
          <LogOut className="w-4 h-4" aria-hidden={true} />
          Keluar
        </Button>
      </div>
    </aside>
  )
}
