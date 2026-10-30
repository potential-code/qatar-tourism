import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { StatusPill } from '../../hub/components/StatusPill'

/** Connection state as a pill with an icon and a word (never colour alone). */
export function StateBadge({ state }: { state: string }) {
  const tone =
    state === 'Connected demo' ? 'good' : state === 'Test failed' ? 'bad' : ('muted' as const)
  return <StatusPill tone={tone}>{state}</StatusPill>
}

/** A read-only value such as a masked credential. The browser never holds a real secret. */
export function ReadOnlyValue({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="flex items-center gap-2 rounded-lg border bg-sand/60 px-3 py-2 font-mono text-sm text-ink/80">
        <Lock aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="break-all">{value}</span>
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/** A group of checkboxes over a fixed list of values. */
export function CheckGroup({
  legend,
  idPrefix,
  options,
  value,
  onChange,
  error,
}: {
  legend: string
  idPrefix: string
  options: readonly string[]
  value: readonly string[]
  onChange: (next: string[]) => void
  error?: string
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {options.map((option) => {
          const id = `${idPrefix}-${option}`
          return (
            <div key={option} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={value.includes(option)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked === true ? [...value, option] : value.filter((v) => v !== option),
                  )
                }
              />
              <Label htmlFor={id} className="text-sm font-normal capitalize">
                {option}
              </Label>
            </div>
          )
        })}
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

/** Field-level messages from a failed save, keyed by field path. */
export function issueMap(error: unknown): Record<string, string> {
  const issues = (error as { details?: { issues?: { path: string; message: string }[] } } | null)
    ?.details?.issues
  return Object.fromEntries((issues ?? []).map((i) => [i.path, i.message]))
}

export function FieldNote({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
      {error}
    </p>
  ) : null
}

export function Grid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-5 md:grid-cols-2', className)}>{children}</div>
}
