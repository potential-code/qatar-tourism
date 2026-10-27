import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The card surface for management content: rounded-xl, hairline border, soft ink shadow. */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-xl border bg-card shadow-xs', className)}>
      {title ? (
        <header className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-4">
          <div className="grid gap-0.5">
            <h2 className="font-display text-xl font-normal text-ink">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={cn('p-6', bodyClassName)}>{children}</div>
    </section>
  )
}
