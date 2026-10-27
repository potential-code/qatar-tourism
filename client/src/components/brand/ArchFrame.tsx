import { type ReactNode, useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * Pointed-arch frame, the signature shape on qatartourism.com cards.
 * ACCENT ONLY: use for a few hero moments (programme cards, certificate, persona portraits), not every card.
 */
export function ArchFrame({ children, className }: { children: ReactNode; className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <div className={cn('relative', className)} style={{ clipPath: `url(#arch-${id})` }}>
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <clipPath id={`arch-${id}`} clipPathUnits="objectBoundingBox">
          <path d="M0,1 V0.34 C0,0.25 0.2,0.17 0.36,0.1 C0.43,0.07 0.47,0.04 0.5,0 C0.53,0.04 0.57,0.07 0.64,0.1 C0.8,0.17 1,0.25 1,0.34 V1 Z" />
        </clipPath>
      </svg>
      {children}
    </div>
  )
}
