import { useQuery } from '@tanstack/react-query'
import { Globe2, KeyRound, ServerCog, ShieldCheck, Waypoints } from 'lucide-react'
import type { ReactNode } from 'react'
import { Panel } from '../../hub/components/Panel'
import { CardsSkeleton, ErrorPanel } from '../../hub/components/QueryStates'
import { summaryQuery } from '../queries/integrations.queries'
import { AccessAuditTable } from './AccessAuditTable'
import { AdapterCards } from './AdapterCards'
import { FlowStrip } from './FlowStrip'
import { PreviewPanel } from './PreviewPanel'
import { StateBadge } from './shared'

function Tile({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-2 rounded-xl border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <span aria-hidden className="text-teal">
          {icon}
        </span>
        {label}
      </p>
      <div className="text-sm text-ink/80">{children}</div>
    </div>
  )
}

/** Overview: current states, the access flow, previews, the audit trail and the adapters. */
export function OverviewTab({ onOpenTab }: { onOpenTab: (tab: string) => void }) {
  const summary = useQuery(summaryQuery())
  return (
    <div className="grid gap-6">
      {summary.isPending ? (
        <CardsSkeleton count={4} className="grid gap-4 md:grid-cols-4" />
      ) : summary.isError ? (
        <ErrorPanel error={summary.error} onRetry={() => summary.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tile icon={<KeyRound className="size-4" />} label="Single sign-on">
            <StateBadge state={summary.data.sso} />
          </Tile>
          <Tile icon={<ServerCog className="size-4" />} label="API access">
            <StateBadge state={summary.data.api} />
          </Tile>
          <Tile icon={<ShieldCheck className="size-4" />} label="Content hosting">
            {summary.data.hosting}
          </Tile>
          <Tile icon={<Globe2 className="size-4" />} label="Data residency">
            {summary.data.residencyToConfirm} of 6 rows still to be confirmed
          </Tile>
        </div>
      )}
      <Panel
        title="How access works"
        description="Every protected launch passes the same four checks."
      >
        <div className="grid gap-4">
          <FlowStrip />
          <p className="text-sm text-muted-foreground">
            One Academy account spans Program A and Program B. Federation with a customer identity
            provider is optional and needs configuration; without it, learners sign in with their
            Academy account.
          </p>
          <p className="flex items-center gap-2 text-sm text-ink/80">
            <Waypoints aria-hidden className="size-4 text-teal" />
            Two-way CRM integration: {summary.data?.crmMode ?? '…'}.{' '}
            <button
              type="button"
              className="font-medium text-teal-deep underline underline-offset-2"
              onClick={() => onOpenTab('crm')}
            >
              Open CRM Integration
            </button>
          </p>
        </div>
      </Panel>
      <PreviewPanel />
      <AccessAuditTable />
      <AdapterCards />
    </div>
  )
}
