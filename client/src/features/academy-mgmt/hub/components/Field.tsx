import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/** Label above the control, optional hint, error below (CONVENTIONS accessibility). */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string | null
  children: ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
