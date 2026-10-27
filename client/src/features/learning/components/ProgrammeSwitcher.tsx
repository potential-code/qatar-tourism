import type { ProgrammeCode } from '@shared/constants'
import { motion, useReducedMotion } from 'motion/react'
import { spring } from '@/components/motion/variants'
import { cn } from '@/lib/utils'
import type { EnrolmentSummary } from '../types'

/**
 * Explicit programme switcher (brief §5). Shown whenever the learner holds more than one
 * enrolment; with one it reads as a static label so the context is always visible.
 */
export function ProgrammeSwitcher({
  enrolments,
  value,
  onChange,
  tone = 'light',
  className,
}: {
  enrolments: readonly EnrolmentSummary[]
  value: ProgrammeCode
  onChange: (programme: ProgrammeCode) => void
  tone?: 'light' | 'photo'
  className?: string
}) {
  const reduce = useReducedMotion()
  const onPhoto = tone === 'photo'
  if (enrolments.length <= 1) {
    const only = enrolments[0]
    if (!only) return null
    return (
      <p
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium',
          onPhoto ? 'bg-white/15 text-white backdrop-blur-md' : 'bg-teal-mist text-teal-deep',
          className,
        )}
      >
        Program {only.programme}: {only.programmeTitle}
      </p>
    )
  }
  return (
    <div
      role="radiogroup"
      aria-label="Programme"
      className={cn(
        'inline-flex flex-wrap gap-1 rounded-full p-1',
        onPhoto
          ? 'border border-white/30 bg-white/10 backdrop-blur-md'
          : 'border bg-white shadow-xs',
        className,
      )}
    >
      {enrolments.map((enrolment) => {
        const active = enrolment.programme === value
        return (
          // biome-ignore lint/a11y/useSemanticElements: a pill radiogroup reads better than native radios here
          <button
            key={enrolment.programme}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(enrolment.programme)}
            className={cn(
              'relative isolate rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none',
              active
                ? onPhoto
                  ? 'text-teal-deep'
                  : 'text-white'
                : onPhoto
                  ? 'text-white/85 hover:text-white'
                  : 'text-muted-foreground hover:text-teal-deep',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`programme-pill-${tone}`}
                transition={reduce ? { duration: 0 } : spring}
                className={cn(
                  'absolute inset-0 -z-10 rounded-full',
                  onPhoto ? 'bg-white' : 'bg-teal',
                )}
              />
            ) : null}
            <span className="whitespace-nowrap">
              Program {enrolment.programme}
              <span className="hidden sm:inline">: {enrolment.programmeTitle}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
