import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Small label above a section title: index numeral, a short rule and the section name. */
export function Eyebrow({
  index,
  children,
  tone = 'teal',
  className,
}: {
  index?: string
  children: ReactNode
  tone?: 'teal' | 'maroon' | 'light'
  className?: string
}) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-3 font-medium text-xs uppercase tracking-[0.22em]',
        tone === 'light' ? 'text-gold-soft' : tone === 'maroon' ? 'text-maroon' : 'text-teal',
        className,
      )}
    >
      {index ? <span className="font-display text-sm tracking-normal">{index}</span> : null}
      <span
        aria-hidden
        className={cn(
          'h-px w-10',
          tone === 'light' ? 'bg-gold' : tone === 'maroon' ? 'bg-maroon/60' : 'bg-teal/60',
        )}
      />
      {children}
    </p>
  )
}
