import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('learner')
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        {label}
        {optional ? <OptionalMark>{t('profile.common.optional')}</OptionalMark> : null}
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

/** The "Optional" marker: a quiet pill, so optional fields read at a glance (brief §4). */
export function OptionalMark({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-sand-deep px-2 py-0.5 font-normal text-[0.7rem] text-ink/70 uppercase tracking-[0.08em] rtl:tracking-normal">
      {children}
    </span>
  )
}
