import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/**
 * Form field frame: label above, "Optional" marker, helper or "why we ask" text, inline error
 * below (docs/CONVENTIONS.md accessibility rules).
 */
export function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  hint?: ReactNode
  error?: string
  children: ReactNode
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id} className="flex items-baseline gap-2">
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground text-xs">Optional</span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function describedBy(id: string, error?: string, hint?: unknown) {
  if (error) return `${id}-error`
  return hint ? `${id}-hint` : undefined
}
