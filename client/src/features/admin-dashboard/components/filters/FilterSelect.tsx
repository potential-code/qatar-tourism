import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = '__all__'

/** A labelled filter select with an explicit "All" option (Radix forbids empty values). */
export function FilterSelect({
  id,
  label,
  value,
  options,
  allLabel,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: string | undefined
  options: readonly { value: string; label: string }[]
  allLabel: string
  onChange: (value: string | undefined) => void
  disabled?: boolean
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value ?? ALL}
        onValueChange={(next) => onChange(next === ALL ? undefined : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="h-9 w-full min-w-0 rounded-lg bg-white text-sm">
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
