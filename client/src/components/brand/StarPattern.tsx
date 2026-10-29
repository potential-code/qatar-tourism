import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * Islamic eight-point star lattice drawn inline (small fills such as the AI tile and mobile menu).
 * Decorative only: fills its positioned parent, draws in `currentColor`, so set colour and
 * strength with text utilities (e.g. `text-white/10`).
 */
export function StarPattern({
  className,
  size = 64,
  strokeWidth = 1,
}: {
  className?: string
  size?: number
  strokeWidth?: number
}) {
  const id = `star-${useId().replace(/:/g, '')}`
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none absolute inset-0 size-full', className)}
    >
      <defs>
        <pattern
          id={id}
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          viewBox="0 0 64 64"
        >
          <g fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
            <rect x="19" y="19" width="26" height="26" />
            <path d="M32 13.6 50.4 32 32 50.4 13.6 32Z" />
            <path d="M32 0v13.6M32 50.4V64M0 32h13.6M50.4 32H64" />
            <path d="M0 6 6 0M58 0l6 6M64 58l-6 6M6 64 0 58" />
            <circle cx="32" cy="32" r="4" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** A single eight-point star, used as a separator and bullet. */
export function StarGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn('size-4', className)}
    >
      <path
        fill="currentColor"
        d="M12 1.5 14.5 6.5 19.4 4.6 17.5 9.5 22.5 12 17.5 14.5 19.4 19.4 14.5 17.5 12 22.5 9.5 17.5 4.6 19.4 6.5 14.5 1.5 12 6.5 9.5 4.6 4.6 9.5 6.5Z"
      />
    </svg>
  )
}
