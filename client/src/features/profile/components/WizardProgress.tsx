import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/**
 * Three-step progress: numbered nodes joined by a track that fills as steps are done. The current
 * step is announced to screen readers; done steps carry a check, not only a colour.
 */
export function WizardProgress({ steps, current }: { steps: readonly string[]; current: number }) {
  const { t } = useTranslation('learner')
  return (
    <ol className="grid grid-cols-3" aria-label={t('profile.common.stepsLabel')}>
      {steps.map((label, index) => {
        const n = index + 1
        const done = n < current
        const active = n === current
        const last = n === steps.length
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className="relative grid justify-items-start gap-2.5"
          >
            {last ? null : (
              <span
                aria-hidden
                className="absolute start-10 end-1 top-[1.0625rem] h-0.5 overflow-hidden rounded-full bg-ink/10"
              >
                <span
                  className={cn(
                    'block h-full origin-left bg-teal transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] rtl:origin-right',
                    done ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </span>
            )}
            <span
              aria-hidden
              className={cn(
                'relative grid size-9 place-items-center rounded-full font-medium text-sm transition-all duration-300',
                done && 'bg-teal text-white',
                active &&
                  'bg-white text-teal shadow-[var(--qt-shadow-glow)] ring-2 ring-teal ring-offset-2 ring-offset-sand',
                !done && !active && 'bg-white text-ink/50 ring-1 ring-ink/15',
              )}
            >
              {done ? <Check className="size-4" /> : n}
            </span>
            <span
              className={cn(
                'pe-2 text-xs leading-snug sm:text-sm',
                active ? 'font-medium text-ink' : 'text-muted-foreground',
              )}
            >
              <span className="sr-only">{t('profile.common.stepN', { n })}: </span>
              <span className={cn(active ? 'inline' : 'max-sm:sr-only')}>{label}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
