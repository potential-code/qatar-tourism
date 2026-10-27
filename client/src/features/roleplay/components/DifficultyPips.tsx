import { cn } from '@/lib/utils'

const LEVELS = ['Introductory', 'Intermediate', 'Advanced'] as const

/** Difficulty as filled pips plus the word, so it is never shown by colour alone. */
export function DifficultyPips({
  difficulty,
  className,
}: {
  difficulty: string
  className?: string
}) {
  const level = Math.max(0, LEVELS.indexOf(difficulty as (typeof LEVELS)[number])) + 1
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}
    >
      <span aria-hidden className="flex gap-0.5">
        {LEVELS.map((name, i) => (
          <span
            key={name}
            className={cn('h-2.5 w-1 rounded-full', i < level ? 'bg-maroon' : 'bg-maroon/15')}
          />
        ))}
      </span>
      {difficulty}
    </span>
  )
}
