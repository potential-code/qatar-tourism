import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PhotoPanelProps {
  src: string
  alt: string
  children?: ReactNode
  className?: string
  /** Where the readable gradient sits, mirroring the site's image masks. */
  fade?: 'bottom' | 'start' | 'full'
  priority?: boolean
}

/** Photograph with the site's gradient mask so overlaid white text stays readable. */
export function PhotoPanel({
  src,
  alt,
  children,
  className,
  fade = 'bottom',
  priority,
}: PhotoPanelProps) {
  const overlay = {
    bottom: 'bg-gradient-to-t from-ink/85 via-ink/35 to-transparent',
    start: 'bg-gradient-to-r from-ink/80 via-ink/40 to-transparent rtl:bg-gradient-to-l',
    full: 'bg-ink/45',
  }[fade]
  return (
    <div className={cn('relative isolate overflow-hidden', className)}>
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      <div aria-hidden="true" className={cn('absolute inset-0 -z-10', overlay)} />
      {children}
    </div>
  )
}
