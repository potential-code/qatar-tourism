import { Link } from '@tanstack/react-router'
import { Languages } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PublicTrainer } from '../queries/programmes.queries'
import { TrainerAvatar } from './TrainerAvatar'

/** Compact trainer link card for strips and grids. */
export function TrainerCard({
  trainer,
  className,
}: {
  trainer: PublicTrainer
  className?: string
}) {
  return (
    <Link
      to="/trainers/$code"
      params={{ code: trainer.code }}
      className={cn(
        'group flex h-full flex-col gap-4 rounded-xl bg-white p-5 ring-1 ring-ink/5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className,
      )}
    >
      <TrainerAvatar
        name={trainer.fullName}
        code={trainer.code}
        src={trainer.avatarPath}
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
