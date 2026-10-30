import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useTranslation('learner')
  return (
    <nav aria-label={t('shell.breadcrumb')}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <Fragment key={item.to ?? item.label}>
              <li>
                {item.to && !last ? (
                  <Link to={item.to as never} className="transition-colors hover:text-teal">
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? 'page' : undefined}
                    className={last ? 'text-ink' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!last ? (
                <li aria-hidden>
                  <ChevronRight className="size-3.5 rtl:-scale-x-100" />
                </li>
              ) : null}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
