'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

export function Checkbox({ id, checked, onCheckedChange, className }: CheckboxProps) {
  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'h-4 w-4 shrink-0 rounded border border-slate-300 flex items-center justify-center transition-colors',
        checked ? 'bg-slate-900 border-slate-900' : 'bg-white',
        className,
      )}
    >
      {checked && <Check size={10} strokeWidth={3} className="text-white" />}
    </button>
  )
}
