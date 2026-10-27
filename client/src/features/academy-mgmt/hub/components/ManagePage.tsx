import type { ReactNode } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'

/**
 * Page anatomy for every Academy Management screen: breadcrumbs, display title, actions. The
 * portal header already carries the "Demo data" indicator on every admin page.
 */
export function ManagePage({
  title,
  description,
  actions,
  children,
  crumbs,
  hub = false,
}: {
  /** The hub itself: no "Academy Management" parent crumb. */
  hub?: boolean
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  /** Extra crumbs after "Academy Management" (the last one is the current page). */
  crumbs?: { label: string; to?: string }[]
}) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          ...(hub ? [] : [{ label: 'Academy Management', to: '/admin/manage' }]),
          ...(crumbs ?? [{ label: typeof title === 'string' ? title : 'Page' }]),
        ]}
        actions={actions}
      />
      {children}
    </div>
  )
}
