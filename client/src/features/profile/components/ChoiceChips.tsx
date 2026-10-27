import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Multi-select chips with a maximum (brief §4: up to three goals). */
export function ChoiceChips<T extends string>({
  options,
  value,
  max,
  onChange,
  labelledBy,
}: {
  options: readonly (readonly [T, string])[]
  value: readonly T[]
  max: number
  onChange: (value: T[]) => void
  labelledBy: string
}) {
  const full = value.length >= max
  return (
    <fieldset aria-labelledby={labelledBy} className="m-0 flex flex-wrap gap-2 border-0 p-0">
      {options.map(([key, label]) => {
        const on = value.includes(key)
        const disabled = !on && full
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(on ? value.filter((v) => v !== key) : [...value, key])}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]',
              on ? 'border-teal bg-teal text-white' : 'border-ink/15 bg-white hover:border-teal/50',
              disabled && 'cursor-not-allowed opacity-45',
            )}
          >
            {on ? <Check aria-hidden className="size-3.5" /> : null}
            {label}
          </button>
        )
      })}
    </fieldset>
  )
}

/** Single choice as large tappable cards (weekly learning time). */
export function ChoiceCards<T extends string | number>({
  options,
  value,
  onChange,
  labelledBy,
  name,
}: {
  options: readonly (readonly [T, string, string?])[]
  value: T | null
  onChange: (value: T) => void
  labelledBy: string
  name: string
}) {
  return (
    <fieldset
      aria-labelledby={labelledBy}
      className="m-0 grid grid-cols-2 gap-2 border-0 p-0 sm:grid-cols-4"
    >
      {options.map(([key, label, sub]) => {
        const on = value === key
        return (
          <label
            key={String(key)}
            className={cn(
              'grid cursor-pointer gap-0.5 rounded-xl border p-4 text-center transition-all duration-200 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
              on
                ? 'border-teal bg-teal-mist text-teal-deep'
                : 'border-ink/10 bg-white hover:border-teal/40',
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={on}
              onChange={() => onChange(key)}
            />
            <span className="font-display text-2xl">{label}</span>
            {sub ? <span className="text-muted-foreground text-xs">{sub}</span> : null}
          </label>
        )
      })}
    </fieldset>
  )
}
