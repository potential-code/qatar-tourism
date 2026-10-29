import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFieldContext } from '@/lib/form-context'

function messageOf(error: unknown): string | null {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message: unknown }
    return typeof message === 'string' ? message : null
  }
  return null
}

/** Password input with a show/hide toggle (brief §3), bound to a TanStack Form field. */
export function PasswordField({
  label = 'Password',
  autoComplete,
  hint,
}: {
  label?: string
  autoComplete: 'current-password' | 'new-password'
  hint?: string
}) {
  const field = useFieldContext<string>()
  const id = useId()
  const [visible, setVisible] = useState(false)
  const { errors, isTouched } = field.state.meta
  const shown = isTouched || field.form.state.submissionAttempts > 0
  const messages = shown ? [...new Set(errors.map(messageOf).filter(Boolean))] : []
  const invalid = messages.length > 0
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="group/input relative">
        <LockKeyhole
          aria-hidden
          className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/input:text-teal"
        />
        <Input
          id={id}
          name={field.name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={field.state.value}
          onChange={(event) => field.handleChange(event.target.value)}
          onBlur={field.handleBlur}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className="h-11 ps-10 pe-12"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute end-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-teal-mist hover:text-teal focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {visible ? (
            <EyeOff aria-hidden className="size-4" />
          ) : (
            <Eye aria-hidden className="size-4" />
          )}
        </button>
      </div>
      {invalid ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
          {messages.join('. ')}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
