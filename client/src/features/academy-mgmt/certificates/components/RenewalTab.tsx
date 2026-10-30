import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LIFECYCLE_TONE } from '@/features/learner-record/utils/status'
import { Panel } from '../../hub/components/Panel'
import { ErrorPanel, TableSkeleton } from '../../hub/components/QueryStates'
import { StatusPill, type Tone } from '../../hub/components/StatusPill'
import { qDate } from '../../hub/utils/format'
import { renewalsQuery } from '../queries/certificates-admin.queries'
import { LIFECYCLE_LABEL } from './IssuedTab'

const STATE: Record<'not_started' | 'in_progress' | 'completed', { label: string; tone: Tone }> = {
  not_started: { label: 'Not started', tone: 'muted' },
  in_progress: { label: 'In progress', tone: 'info' },
  completed: { label: 'Renewed', tone: 'good' },
}

/** The renewal queue: credentials that are expiring soon or expired, plus completed renewals. */
export function RenewalTab() {
  const query = useQuery(renewalsQuery())
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => void query.refetch()} />
  const rows = query.data?.items ?? []
  return (
    <Panel
      title="Renewal"
      description="Renewal never extends a credential. Completing the checklist issues a new credential linked to the old one, which stays on record as Superseded."
      bodyClassName="p-0"
    >
      {query.isPending ? (
        <TableSkeleton cols={6} rows={5} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Credential</TableHead>
              <TableHead>Learner</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Renewal</TableHead>
              <TableHead>Checklist</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No credentials are due for renewal. Advance the demo clock to see reminders and
                  expiry.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium whitespace-nowrap">{c.code}</TableCell>
                  <TableCell>
                    {c.learnerName}
                    <span className="block text-xs text-muted-foreground">
                      {c.learnerDisplayId}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{qDate(c.expiresAt)}</TableCell>
                  <TableCell>
                    <StatusPill tone={LIFECYCLE_TONE[c.lifecycle]}>
                      {LIFECYCLE_LABEL[c.lifecycle]}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={STATE[c.renewalState].tone}>
                      {STATE[c.renewalState].label}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.renewalState === 'completed'
                      ? `Replaced by ${c.supersededByCode ?? 'a new credential'}`
                      : c.renewal?.retrainingRequired
                        ? 'Short retraining path assigned'
                        : c.renewalState === 'in_progress'
                          ? 'Refresher, check and CPD'
                          : c.lifecycle === 'expired'
                            ? 'Retraining path assigned when the learner starts'
                            : 'Learner can start renewal'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
