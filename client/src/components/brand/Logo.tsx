import { cn } from '@/lib/utils'

interface LogoProps {
  variant?: 'color' | 'white'
  className?: string
  /** Shows the "Academy" wordmark beside the official logo. */
  withAcademy?: boolean
}

/** Official Qatar Tourism logo (from qatartourism.com). Proportions are preserved: size by height only. */
export function Logo({ variant = 'color', className, withAcademy = false }: LogoProps) {
  const src =
    variant === 'white' ? '/brand/qatar-tourism-logo-white.svg' : '/brand/qatar-tourism-logo.svg'
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <img src={src} alt="Qatar Tourism" className="h-full w-auto" />
      {withAcademy ? (
        <span
          className={cn(
            'border-s ps-3 font-display text-lg leading-none tracking-tight',
            variant === 'white' ? 'border-white/40 text-white' : 'border-border text-teal',
          )}
        >
          Academy
        </span>
      ) : null}
    </span>
  )
}
