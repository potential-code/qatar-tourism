import { useId } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFieldContext } from '@/lib/form-context'

/** Select bound to a TanStack Form field, with the label above and errors below. */
export function SelectField({
  label,
  options,
  disabled,
  description,
}: {
  label: string
  options: { value: string; label: string }[]
  disabled?: boolean
  description?: string
}) {
  const field = useFieldContext<string>()
  const id = useId()
  const errors = field.state.meta.errors.filter(Boolean).map(String)
  const show =
    (field.state.meta.isTouched || field.form.state.submissionAttempts > 0) && errors.length > 0
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={field.state.value} onValueChange={field.handleChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full" aria-invalid={show || undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {show ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.join('. ')}
        </p>
      ) : null}
    </div>
  )
}
