import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NONE = '__none__'

/** A labelled select over {value,label} options; `allowNone` adds an explicit empty choice. */
export function OptionSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select',
  allowNone,
  noneLabel = 'Any',
  className,
  ariaLabel,
}: {
  id?: string
  value: string | null | undefined
  onChange: (value: string | null) => void
  options: readonly { value: string; label: string }[]
  placeholder?: string
  allowNone?: boolean
  noneLabel?: string
  className?: string
  ariaLabel?: string
}) {
  return (
    <Select
      value={value ?? (allowNone ? NONE : undefined)}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger
        id={id}
        className={className ?? 'h-10 rounded-lg bg-white'}
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone ? <SelectItem value={NONE}>{noneLabel}</SelectItem> : null}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Turns a label map into select options. */
export const optionsOf = (map: Record<string, string>) =>
  Object.entries(map).map(([value, label]) => ({ value, label }))
