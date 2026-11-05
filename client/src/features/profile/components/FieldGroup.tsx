import type { LucideIcon } from 'lucide-react'
import { createContext, type ReactNode, useContext, useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * How field groups draw: `card` in the onboarding wizard (each group is its own raised card),
 * `plain` on the Profile page, where the step already sits inside a section card.
 */
export const FieldGroupFrame = createContext<'card' | 'plain'>('plain')

/** A titled group of related fields with an icon, so long steps read as a few small tasks. */
export function FieldGroup({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  const frame = useContext(FieldGroupFrame)
  const headingId = useId()
  // The Profile page nests groups under its own section headings.
  const Heading = frame === 'card' ? 'h2' : 'h3'
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'grid gap-5',
        frame === 'card'
          ? 'rounded-xl border border-teal-night/8 bg-white p-5 sm:p-6'
          : 'border-ink/8 border-t pt-6 first:border-t-0 first:pt-0',
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-teal-mist to-sky-mist text-teal ring-1 ring-teal/10"
        >
          <Icon className="size-5" />
        </span>
        <div className="grid gap-0.5 pt-0.5">
          <Heading id={headingId} className="font-display text-xl leading-tight">
            {title}
          </Heading>
          {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}
