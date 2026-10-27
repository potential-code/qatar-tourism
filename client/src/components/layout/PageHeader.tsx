import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Breadcrumbs, type Crumb } from './Breadcrumbs'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** One primary action on the right; secondary actions as outline/ghost (layout-rules.md). */
  actions?: ReactNode
  breadcrumbs?: Crumb[]
  className?: string
}

/** Page title block: breadcrumbs (2+ levels deep), display title, one-line description, actions. */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {breadcrumbs && breadcrumbs.length > 1 ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1.5">
          <h1 className="font-display text-3xl leading-tight font-light text-ink md:text-4xl">
            {title}
          </h1>
          {description ? <p className="max-w-[70ch] text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
