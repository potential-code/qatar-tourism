import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { describedBy } from './Field'

/** A labelled Select over a value→label map; keyboard operable via Radix. */
export function OptionSelect<T extends string>({
  id,
  value,
  options,
  placeholder,
  onChange,
  error,
  hint,
  disabled,
}: {
  id: string
  value: T | ''
  options: readonly (readonly [T, string])[]
  placeholder: string
  onChange: (value: T) => void
  error?: string
  hint?: unknown
  disabled?: boolean
}) {
  return (
    <Select value={value || undefined} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
      <SelectTrigger
        id={id}
        className="h-11 w-full bg-white"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
