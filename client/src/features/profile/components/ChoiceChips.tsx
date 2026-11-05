import { Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Multi-select chips with a maximum (brief §4: up to three goals). */
export function ChoiceChips<T extends string>({
  options,
  value,
  max,
  onChange,
  labelledBy,
  icons,
}: {
  options: readonly (readonly [T, string])[]
  value: readonly T[]
  max: number
  onChange: (value: T[]) => void
  labelledBy: string
  /** Optional icon per option, shown until the option is chosen. */
  icons?: Partial<Record<T, LucideIcon>>
}) {
  const full = value.length >= max
  return (
    <fieldset
      aria-labelledby={labelledBy}
      className="m-0 grid grid-cols-1 gap-2.5 border-0 p-0 min-[420px]:grid-cols-2 md:grid-cols-3"
    >
      {options.map(([key, label]) => {
        const on = value.includes(key)
        const disabled = !on && full
        const Icon: LucideIcon | undefined = on ? Check : icons?.[key]
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(on ? value.filter((v) => v !== key) : [...value, key])}
            className={cn(
              'group inline-flex min-h-12 items-center gap-3 rounded-full border py-2 ps-2 pe-4 text-start text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]',
              on
                ? 'border-teal bg-teal text-white shadow-[var(--qt-shadow-glow)]'
                : 'border-ink/12 bg-white hover:-translate-y-0.5 hover:border-teal/50 hover:shadow-sm',
              disabled && 'cursor-not-allowed opacity-45 hover:translate-y-0 hover:shadow-none',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-200',
                on ? 'bg-white/20 text-white' : 'bg-teal-mist text-teal',
              )}
            >
              {Icon ? <Icon className="size-4" /> : null}
            </span>
            <span className="font-medium">{label}</span>
          </button>
        )
      })}
    </fieldset>
  )
}

/** Single choice as large tappable cards (weekly learning time), with a small intensity meter. */
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
      className="m-0 grid grid-cols-2 gap-2.5 border-0 p-0 sm:grid-cols-4"
    >
      {options.map(([key, label, sub], index) => {
        const on = value === key
        return (
          <label
            key={String(key)}
            className={cn(
              'relative grid cursor-pointer justify-items-center gap-1 rounded-xl border px-3 pt-5 pb-4 text-center transition-all duration-200 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
              on
                ? 'border-teal bg-grad-teal text-white shadow-[var(--qt-shadow-glow)]'
                : 'border-ink/10 bg-white hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-sm',
            )}
          >
            <input
              type="radio"
              name={name}
              // Centred so a pointer on the input lands inside the card, not its rounded corner.
              className="sr-only start-1/2 top-1/2"
              checked={on}
              onChange={() => onChange(key)}
            />
            {on ? (
              <Check
                aria-hidden
                className="absolute end-2.5 top-2.5 size-4 rounded-full bg-white p-0.5 text-teal"
              />
            ) : null}
            <span
              className={cn(
                'font-display font-light text-4xl leading-none',
                on ? 'text-white' : 'text-ink',
              )}
            >
              {label}
            </span>
            {sub ? (
              <span className={cn('text-xs', on ? 'text-white/85' : 'text-muted-foreground')}>
                {sub}
              </span>
            ) : null}
            <span aria-hidden className="mt-2 flex gap-1">
              {options.map(([k], bar) => (
                <span
                  key={String(k)}
                  className={cn(
                    'h-1 w-4 rounded-full',
                    bar <= index
                      ? on
                        ? 'bg-white'
                        : 'bg-teal/70'
                      : on
                        ? 'bg-white/25'
                        : 'bg-ink/10',
                  )}
                />
              ))}
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
