import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Three-step progress with names; the current step is announced to screen readers. */
export function WizardProgress({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Profile steps">
      {steps.map((label, index) => {
        const n = index + 1
        const done = n < current
        const active = n === current
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className="grid gap-2">
            <span className="h-1 overflow-hidden rounded-full bg-ink/10">
              <span
                className={cn(
                  'block h-full rounded-full bg-teal transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  done || active ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
                )}
              />
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-xs',
                active ? 'font-medium text-ink' : 'text-muted-foreground',
              )}
            >
              {done ? <Check aria-hidden className="size-3.5 text-teal" /> : null}
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">Step {n}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
