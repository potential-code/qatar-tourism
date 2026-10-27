import type { ComponentProps, ReactNode } from 'react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useFieldContext, useFormContext } from '@/lib/form-context'
import { cn } from '@/lib/utils'

/**
 * Field components for TanStack Form, bound through `useAppForm` (hooks/useAppForm.ts):
 *
 *   <form.AppField name="email">{(field) => <field.TextField label={t('fields.email')} />}</form.AppField>
 *
 * Validation messages are translation keys where the schema is ours (e.g.
 * 'validation.required'); anything else is shown as written.
 */

function errorMessage(error: unknown): string | null {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message: unknown }
    return typeof message === 'string' ? message : null
  }
  return null
}

function useFieldErrors() {
  const field = useFieldContext<unknown>()
  const { t, i18n } = useTranslation()
  const { errors, isTouched } = field.state.meta
  // Show errors once the user has left the field or tried to submit, not while typing.
  const visible = isTouched || field.form.state.submissionAttempts > 0
  const messages = visible
    ? [...new Set(errors.map(errorMessage).filter((m): m is string => Boolean(m)))]
    : []
  return messages.map((message) => (i18n.exists(message) ? t(message as never) : message))
}

function FieldErrors({ id, messages }: { id: string; messages: string[] }) {
  if (messages.length === 0) return null
  return (
    <p id={id} role="alert" className="text-destructive text-sm">
      {messages.join('. ')}
    </p>
  )
}

type TextFieldProps = {
  label: string
  description?: string
} & Pick<ComponentProps<'input'>, 'type' | 'autoComplete' | 'placeholder' | 'autoFocus'>

export function TextField({ label, description, ...inputProps }: TextFieldProps) {
  const field = useFieldContext<string>()
  const id = useId()
  const messages = useFieldErrors()
  const invalid = messages.length > 0

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={field.name}
        value={field.state.value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : description ? `${id}-description` : undefined}
        {...inputProps}
      />
      {description && !invalid ? (
        <p id={`${id}-description`} className="text-muted-foreground text-sm">
          {description}
        </p>
      ) : null}
      <FieldErrors id={`${id}-error`} messages={messages} />
    </div>
  )
}

type TextareaFieldProps = {
  label: string
} & Pick<ComponentProps<'textarea'>, 'placeholder' | 'rows'>

export function TextareaField({ label, ...textareaProps }: TextareaFieldProps) {
  const field = useFieldContext<string>()
  const id = useId()
  const messages = useFieldErrors()
  const invalid = messages.length > 0

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        name={field.name}
        value={field.state.value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        {...textareaProps}
      />
      <FieldErrors id={`${id}-error`} messages={messages} />
    </div>
  )
}

export function SubmitButton({ children, className }: { children: ReactNode; className?: string }) {
  const form = useFormContext()
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" disabled={isSubmitting} className={cn(className)}>
          {children}
        </Button>
      )}
    </form.Subscribe>
  )
}
