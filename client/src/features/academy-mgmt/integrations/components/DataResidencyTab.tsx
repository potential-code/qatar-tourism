import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RESIDENCY_STATUSES, type ResidencyRow } from '@/services/integrations/settings'
import { saveDataResidency } from '@/services/integrations.service'
import { OptionSelect } from '../../hub/components/OptionSelect'
import { Panel } from '../../hub/components/Panel'
import { CardsSkeleton, ErrorPanel } from '../../hub/components/QueryStates'
import { StatusPill } from '../../hub/components/StatusPill'
import { TableFrame } from '../../hub/components/TableFrame'
import { snapshotQuery, useIntegrationMutation } from '../queries/integrations.queries'
import { issueMap } from './shared'

/** Data Residency: one row per data class. Every row starts as "To be confirmed". */
export function DataResidencyTab() {
  const query = useQuery(snapshotQuery())
  const [rows, setRows] = useState<ResidencyRow[] | null>(null)
  useEffect(() => {
    if (query.data && !rows) setRows(query.data.residency.rows)
  }, [query.data, rows])
  const save = useIntegrationMutation(
    saveDataResidency,
    'Demo configuration saved. Statuses are proposals, not confirmed placement.',
  )

  if (query.isPending || !rows) return <CardsSkeleton count={1} className="grid gap-5" />
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
  const errors = issueMap(save.error)
  const update = (index: number, patch: Partial<ResidencyRow>) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  return (
    <Panel
      title="Data residency"
      description="Proposed region, provider and confirmation status for each kind of data. Nothing is confirmed until Qatar Tourism and the hosting provider agree it."
      bodyClassName="p-0"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate(rows)
        }}
      >
        <TableFrame label="Data residency">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Proposed region</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Confirmation status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={row.item}>
                  <TableCell className="font-medium text-ink">{row.item}</TableCell>
                  <TableCell>
                    <Input
                      aria-label={`${row.item}: proposed region`}
                      value={row.proposedRegion}
                      onChange={(e) => update(i, { proposedRegion: e.target.value })}
                      className="min-w-44"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={`${row.item}: provider`}
                      value={row.provider}
                      onChange={(e) => update(i, { provider: e.target.value })}
                      className="min-w-44"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="grid gap-1.5">
                      <OptionSelect
                        ariaLabel={`${row.item}: status`}
                        value={row.status}
                        onChange={(v) => v && update(i, { status: v })}
                        options={RESIDENCY_STATUSES.map((s) => ({ value: s, label: s }))}
                        className="h-10 min-w-48 rounded-lg bg-white"
                      />
                      {row.status === 'To be confirmed' ? (
                        <StatusPill tone="muted">To be confirmed</StatusPill>
                      ) : null}
                      {(errors[`rows.${i}.status`] ?? errors[`rows.${i}`]) ? (
                        <p role="alert" className="text-xs font-medium text-destructive">
                          {errors[`rows.${i}.status`] ?? errors[`rows.${i}`]}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
        <div className="flex flex-wrap items-center gap-3 border-t p-6">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving' : 'Save demo configuration'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Hosting region and provider are handover items for Qatar Tourism.
          </p>
        </div>
      </form>
    </Panel>
  )
}
