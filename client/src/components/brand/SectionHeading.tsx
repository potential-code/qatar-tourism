import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  title: ReactNode
  description?: ReactNode
  align?: 'start' | 'center'
  tone?: 'ink' | 'light'
  className?: string
}

/** Display-serif section title with optional supporting line (stacked, max 65ch). */
export function SectionHeading({
  title,
  description,
  align = 'start',
  tone = 'ink',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      <h2
        className={cn(
          'font-display text-3xl leading-[1.1] font-light md:text-5xl',
          tone === 'light' ? 'text-white' : 'text-ink',
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            'max-w-[65ch] text-base leading-relaxed md:text-lg',
            tone === 'light' ? 'text-white/85' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}
