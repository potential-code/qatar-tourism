import { cn } from '@/lib/utils'

/** The `ArchFrame` outline as a hairline, placed behind an arch image for layered depth. */
export function GoldArch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none absolute inset-0 size-full overflow-visible', className)}
    >
      <path
        d="M0,1 V0.34 C0,0.25 0.2,0.17 0.36,0.1 C0.43,0.07 0.47,0.04 0.5,0 C0.53,0.04 0.57,0.07 0.64,0.1 C0.8,0.17 1,0.25 1,0.34 V1 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
