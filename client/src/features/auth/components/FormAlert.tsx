import { AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function FormAlert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success' | 'info'
  children: ReactNode
}) {
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-2.5 rounded-lg p-3.5 text-sm',
        tone === 'error' && 'bg-destructive/10 text-destructive',
        tone === 'success' && 'bg-teal-mist text-teal-deep',
        tone === 'info' && 'bg-sand-deep text-ink',
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="grid gap-1">{children}</div>
    </div>
  )
}
