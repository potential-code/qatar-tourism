import type { ReactNode } from 'react'

/** A titled group of form fields. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <fieldset className="grid gap-5 rounded-xl border bg-card p-5 shadow-xs lg:grid-cols-[14rem_1fr] md:p-6">
      <div className="grid content-start gap-1">
        <legend className="font-display text-xl font-normal text-ink">{title}</legend>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}
