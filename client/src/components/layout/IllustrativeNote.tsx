import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The agreed wording for hosting, SSO, API and integration screens (SPEC §2). Do not edit it. */
export const ILLUSTRATIVE_COPY =
  'Illustrative configuration. Hosting region, access policies, SSO provider and API settings are configurable and subject to technical review. No live Qatar Tourism systems are connected.'

/** A callout stating that integration and infrastructure settings are illustrative. */
export function IllustrativeNote({
  children,
  className,
}: {
  /** Extra explanation shown under the standard copy. */
  children?: ReactNode
  className?: string
}) {
  return (
    <aside
      aria-label="Illustrative configuration"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-teal/20 bg-teal-mist px-4 py-3 text-sm text-teal-deep',
        className,
      )}
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="grid gap-1.5">
        <p>{ILLUSTRATIVE_COPY}</p>
        {children}
      </div>
    </aside>
  )
}
