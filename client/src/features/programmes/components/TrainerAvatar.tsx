import { cn } from '@/lib/utils'
import { initials } from '../utils/format'

const TONES = [
  'bg-teal text-white',
  'bg-maroon text-white',
  'bg-teal-mist text-teal-deep',
  'bg-maroon-mist text-maroon-deep',
] as const

/** Trainer portrait, or tinted initials until generated avatars exist (docs/DECISIONS.md). */
export function TrainerAvatar({
  name,
  code,
  src,
  className,
}: {
  name: string
  code: string
  src?: string | null
  className?: string
}) {
  const tone = TONES[(Number(code.replace(/\D/g, '')) || 0) % TONES.length]
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn('size-10 shrink-0 rounded-full object-cover', className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-full font-medium text-sm',
        tone,
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
