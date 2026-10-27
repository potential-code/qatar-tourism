import { Check, Lock } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { easeOut } from '@/components/motion/variants'
import { cn } from '@/lib/utils'
import type { Journey } from '../types'

type Gate = Journey['gates'][number]

const STATE_TEXT: Record<Gate['state'], string> = {
  completed: 'Complete',
  current: 'In progress',
  locked: 'Locked',
}

/**
 * Program A level and stage map (brief §6): Onboarding, Level 1, Level 2, Final, Certification,
 * with locked and unlocked states and what each one needs. Horizontal on wide screens,
 * vertical on phones.
 */
export function StageMap({
  gates,
  compact = false,
}: {
  gates: readonly Gate[]
  compact?: boolean
}) {
  const reduce = useReducedMotion()
  if (gates.length === 0) return null
  const done = gates.filter((g) => g.state === 'completed').length
  return (
    <ol
      aria-label={`Programme stages: ${done} of ${gates.length} complete`}
      className={cn(
        'relative grid gap-4',
        compact ? 'sm:grid-cols-5 sm:gap-2' : 'md:grid-cols-5 md:gap-3',
      )}
    >
      {gates.map((gate, index) => (
        <motion.li
          key={gate.key}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: easeOut, delay: index * 0.07 }}
          className={cn(
            'relative flex gap-3',
            compact ? 'sm:flex-col sm:items-start' : 'md:flex-col md:items-start',
          )}
        >
          {/* Connector */}
          {index < gates.length - 1 ? (
            <span
              aria-hidden
              className={cn(
                'absolute start-4 top-9 bottom-[-1rem] w-px',
                compact
                  ? 'sm:start-9 sm:end-[-0.5rem] sm:top-4 sm:bottom-auto sm:h-px sm:w-auto'
                  : 'md:start-9 md:end-[-0.75rem] md:top-4 md:bottom-auto md:h-px md:w-auto',
                gate.state === 'completed' ? 'bg-teal' : 'bg-border',
              )}
            />
          ) : null}
          <span
            className={cn(
              'relative z-10 grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold',
              gate.state === 'completed' && 'border-teal bg-teal text-white',
              gate.state === 'current' &&
                'border-teal bg-white text-teal shadow-[var(--qt-shadow-glow)]',
              gate.state === 'locked' && 'border-border bg-sand-deep text-muted-foreground',
            )}
          >
            {gate.state === 'completed' ? (
              <Check aria-hidden className="size-4" />
            ) : gate.state === 'locked' ? (
              <Lock aria-hidden className="size-3.5" />
            ) : (
              index + 1
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-1 pb-1">
            <p className="text-sm font-medium text-ink">{gate.label}</p>
            <p
              className={cn(
                'text-xs font-medium',
                gate.state === 'completed' && 'text-teal',
                gate.state === 'current' && 'text-maroon',
                gate.state === 'locked' && 'text-muted-foreground',
              )}
            >
              {STATE_TEXT[gate.state]}
            </p>
            {compact ? null : (
              <p className="text-xs leading-relaxed text-muted-foreground">{gate.explanation}</p>
            )}
          </div>
        </motion.li>
      ))}
    </ol>
  )
}
