import { useQuery } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Panel } from '../../hub/components/Panel'
import { ErrorPanel, TableSkeleton } from '../../hub/components/QueryStates'
import { StatusPill } from '../../hub/components/StatusPill'
import { TableFrame } from '../../hub/components/TableFrame'
import { qDateTime } from '../../hub/utils/format'
import { accessAuditQuery } from '../queries/integrations.queries'

/** Readable audit trail: timestamp, demo user, action, result and reason (SPEC §2). */
export function AccessAuditTable() {
  const query = useQuery(accessAuditQuery())
  return (
    <Panel
      title="Audit trail"
      description="Sign-in tests, content launches, denied access and configuration saves from this page."
      bodyClassName="p-0"
    >
      {query.isPending ? (
        <TableSkeleton rows={4} cols={5} />
      ) : query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState
          size="sm"
          icon={ScrollText}
          title="No access events yet"
          description="Run a test sign in or a preview. Each attempt is recorded here with its result and reason."
        />
      ) : (
        <TableFrame label="Access audit trail">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Demo user</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">{qDateTime(row.at)}</TableCell>
                  <TableCell>{row.demoUser}</TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>
                    <StatusPill tone={row.result === 'Allowed' ? 'good' : 'bad'}>
                      {row.result}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal text-muted-foreground">
                    {row.reason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
      )}
    </Panel>
  )
}
