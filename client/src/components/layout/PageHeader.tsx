import type { ReactNode } from 'react'
import { PhotoPanel } from '@/components/brand'
import { CornerPattern } from '@/components/brand/CornerPattern'
import { cn } from '@/lib/utils'
import { Breadcrumbs, type Crumb } from './Breadcrumbs'
import { PORTAL_IMAGES, type PortalImage } from './portal-images'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** One primary action on the right; secondary actions as outline/ghost (layout-rules.md). */
  actions?: ReactNode
  breadcrumbs?: Crumb[]
  /** Top-level screens set a banner photograph behind the title (decorative). */
  image?: PortalImage
  className?: string
}

/** Page title block: breadcrumbs (2+ levels deep), display title, one-line description, actions. */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  image,
  className,
}: PageHeaderProps) {
  const photo = Boolean(image)
  const content = (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-4',
        photo ? 'min-h-44 p-6 md:min-h-52 md:p-8' : 'p-5 md:p-7',
      )}
    >
      <div className="grid gap-1.5">
        <h1
          className={cn(
            'font-display text-3xl leading-tight font-light md:text-4xl',
            photo ? 'text-white md:text-5xl' : 'text-ink',
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className={cn('max-w-[70ch]', photo ? 'text-white/85' : 'text-muted-foreground')}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {breadcrumbs && breadcrumbs.length > 1 ? <Breadcrumbs items={breadcrumbs} /> : null}
      {image ? (
        <PhotoPanel src={PORTAL_IMAGES[image]} alt="" fade="start" className="rounded-xl bg-ink">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/55 to-transparent"
          />
          {content}
        </PhotoPanel>
      ) : (
        <div className="relative isolate overflow-hidden rounded-xl border border-teal/10 bg-gradient-to-br from-white via-white to-teal-mist shadow-[var(--qt-pop)]">
          <CornerPattern side="a" />
          <span aria-hidden className="absolute inset-y-4 start-0 w-1 rounded-e-full bg-gold" />
          {content}
        </div>
      )}
    </div>
  )
}
