import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { summaryQuery } from '@/features/academy-mgmt/integrations/queries/integrations.queries'
import { PanelCard } from '../PanelCard'

/** A short "Secure access and integrations" summary linking to Integrations and Security. */
export function SecureAccessSummary() {
  const query = useQuery(summaryQuery())
  const s = query.data
  return (
    <PanelCard
      title="Secure access and integrations"
      description="Illustrative configuration, subject to technical review."
      className="col-span-6"
    >
      {query.isPending ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : query.isError || !s ? (
        <p role="alert" className="text-sm text-destructive">
          The summary could not be loaded.
        </p>
      ) : (
        <div className="grid gap-4">
          <ul className="grid gap-1.5 text-sm">
            <li className="flex justify-between gap-3">
              <span className="text-muted-foreground">Single sign-on</span>
              <span className="font-medium text-ink">{s.sso}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted-foreground">API access</span>
              <span className="font-medium text-ink">{s.api}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted-foreground">Content hosting</span>
              <span className="font-medium text-ink">{s.hosting}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-muted-foreground">Data residency</span>
              <span className="font-medium text-ink">
                {s.residencyToConfirm} of 6 to be confirmed
              </span>
            </li>
          </ul>
          <Link
            to="/admin/manage/integrations"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-deep underline underline-offset-2"
          >
            Open Integrations and Security <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      )}
    </PanelCard>
  )
}
