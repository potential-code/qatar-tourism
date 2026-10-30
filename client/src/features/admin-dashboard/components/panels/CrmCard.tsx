import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { crmCardQuery } from '@/features/academy-mgmt/integrations/queries/integrations.queries'
import { qatarDateTime } from '@/lib/format/qatar-time'
import { PanelCard } from '../PanelCard'

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'bad' }) {
  return (
    <div className="rounded-lg border bg-white/70 px-3 py-2">
      <p className="font-display text-2xl tabular-nums text-ink">{value}</p>
      <p
        className={
          tone === 'bad' && value > 0
            ? 'text-xs font-medium text-destructive'
            : 'text-xs text-muted-foreground'
        }
      >
        {label}
      </p>
    </div>
  )
}

/** Compact CRM card: connection mode, last demo sync, pending events and failed events. */
export function CrmCard() {
  const query = useQuery(crmCardQuery())
  const card = query.data
  return (
    <PanelCard
      title="CRM integration"
      description="Simulated two-way link. No live CRM is connected."
      className="col-span-6"
      action={
        <Link
          to="/admin/manage/integrations"
          className="text-sm font-medium text-teal-deep underline underline-offset-2"
        >
          Open CRM Integration
        </Link>
      }
    >
      {query.isPending ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : query.isError || !card ? (
        <p role="alert" className="text-sm text-destructive">
          The CRM summary could not be loaded.
        </p>
      ) : (
        <div className="grid gap-4">
          <dl className="grid gap-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Connection mode</dt>
              <dd className="font-medium text-ink">{card.mode}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Last demo sync</dt>
              <dd className="font-medium text-ink">
                {card.lastSyncAt ? `${qatarDateTime(card.lastSyncAt)}` : 'Not run yet'}
              </dd>
            </div>
          </dl>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Pending events" value={card.pending} />
            <Stat label="Failed events" value={card.failed} tone="bad" />
          </div>
        </div>
      )}
    </PanelCard>
  )
}
