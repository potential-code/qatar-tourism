import { Link } from '@tanstack/react-router'
import { Languages } from 'lucide-react'
import { ArchFrame } from '@/components/brand'
import { PersonAvatar } from '@/components/data/PersonAvatar'
import { cn } from '@/lib/utils'
import type { PublicTrainer } from '../queries/programmes.queries'

const SHOWCASE_TONE = {
  teal: {
    card: 'bg-grad-teal text-white',
    arch: 'bg-teal-mist',
    muted: 'text-white/80',
    pill: 'bg-white/15 text-white',
  },
  maroon: {
    card: 'bg-grad-maroon text-white',
    arch: 'bg-rose-mist',
    muted: 'text-white/80',
    pill: 'bg-white/15 text-white',
  },
  sky: {
    card: 'bg-sky text-teal-night',
    arch: 'bg-sky-mist',
    muted: 'text-teal-night/80',
    pill: 'bg-white/50 text-teal-night',
  },
  gold: {
    card: 'bg-gold text-teal-night',
    arch: 'bg-gold-soft',
    muted: 'text-teal-night/80',
    pill: 'bg-white/50 text-teal-night',
  },
} as const

export type TrainerTone = keyof typeof SHOWCASE_TONE

/** Compact trainer link card for strips and grids. */
export function TrainerCard({
  trainer,
  showcase = false,
  tone = 'teal',
  className,
}: {
  trainer: PublicTrainer
  /** Homepage treatment: portrait in the pointed arch on a brand-coloured card. */
  showcase?: boolean
  tone?: TrainerTone
  className?: string
}) {
  if (showcase) {
    const t = SHOWCASE_TONE[tone]
    return (
      <Link
        to="/trainers/$code"
        params={{ code: trainer.code }}
        className={cn(
          'group relative isolate flex h-full flex-col gap-4 overflow-hidden rounded-[1.75rem] p-4 shadow-[0_30px_60px_-28px_rgb(0_0_0/0.6)] ring-1 ring-white/10 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-3 hover:rotate-[-1deg] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/70 motion-reduce:hover:transform-none',
          t.card,
          className,
        )}
      >
        <span
          aria-hidden
          className="qt-star-tile-dark absolute inset-x-0 bottom-0 -z-10 h-1/2 opacity-60 [mask-image:linear-gradient(to_top,black,transparent)]"
        />
        <ArchFrame className={cn('aspect-[4/5] overflow-hidden', t.arch)}>
          {trainer.avatarPath ? (
            <img
              src={trainer.avatarPath}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.1]"
            />
          ) : (
            <span className="flex size-full items-end justify-center pb-8">
              <PersonAvatar
                name={trainer.fullName}
                src={null}
                tone="teal"
                className="size-20 text-xl"
              />
            </span>
          )}
        </ArchFrame>
        <div className="grid gap-1 px-1">
          <p className="font-display text-xl leading-snug">{trainer.fullName}</p>
          <p className={cn('text-sm', t.muted)}>{trainer.headline}</p>
        </div>
        <p
          className={cn(
            'mt-auto inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-transform duration-500 group-hover:translate-x-1 rtl:group-hover:-translate-x-1',
            t.pill,
          )}
        >
          <Languages aria-hidden className="size-3.5" />
          {trainer.languages.join(' and ')}
        </p>
      </Link>
    )
  }
  return (
    <Link
      to="/trainers/$code"
      params={{ code: trainer.code }}
      className={cn(
        'group flex h-full flex-col gap-4 rounded-xl bg-white p-5 ring-1 ring-ink/5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className,
      )}
    >
      <PersonAvatar
        name={trainer.fullName}
        src={trainer.avatarPath}
        tone="teal"
        className="size-14 text-base"
      />
      <div className="grid gap-1">
        <p className="font-display text-lg text-ink leading-snug group-hover:text-teal">
          {trainer.fullName}
        </p>
        <p className="text-muted-foreground text-sm">{trainer.headline}</p>
      </div>
      <p className="mt-auto inline-flex items-center gap-1.5 text-ink/70 text-xs">
        <Languages aria-hidden className="size-3.5 text-teal" />
        {trainer.languages.join(' and ')}
      </p>
    </Link>
  )
}
