import type { AdminAuditQuery } from '@shared/schemas/admin-governance'
import { useQuery } from '@tanstack/react-query'
import { Download, ScrollText, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiError } from '@/lib/api-error'
import { ManagePage } from '../../hub/components/ManagePage'
import { OptionSelect } from '../../hub/components/OptionSelect'
import { Pager } from '../../hub/components/Pager'
import { ErrorPanel, TableSkeleton } from '../../hub/components/QueryStates'
import { StatusPill } from '../../hub/components/StatusPill'
import { TableFrame } from '../../hub/components/TableFrame'
import { auditQuery, exportAuditLog } from '../../hub/queries/governance.queries'
import { qDateTime } from '../../hub/utils/format'
import { AuditDetailSheet, type AuditRow } from './AuditDetailSheet'
import { DemoResetPanel } from './DemoResetPanel'

type Filters = Partial<AdminAuditQuery>
const ROLE_OPTIONS = ['admin', 'trainer', 'learner', 'system'].map((v) => ({
  value: v,
  label: v.charAt(0).toUpperCase() + v.slice(1),
}))

/** Qatar calendar day to the UTC instant bounds the API filters on. */
const dayStart = (d: string) => (d ? new Date(`${d}T00:00:00+03:00`).toISOString() : undefined)
const dayEnd = (d: string) => (d ? new Date(`${d}T23:59:59+03:00`).toISOString() : undefined)

export function AuditPage() {
  const [filters, setFilters] = useState<Filters>({ page: 1, pageSize: 25 })
  const [text, setText] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState<AuditRow | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const id = setTimeout(
      () =>
        setFilters((f) =>
          (f.search ?? '') === text ? f : { ...f, search: text || undefined, page: 1 },
        ),
      300,
    )
    return () => clearTimeout(id)
  }, [text])

  const effective: Filters = { ...filters, from: dayStart(from), to: dayEnd(to) }
  const query = useQuery(auditQuery(effective))
  const set = (patch: Filters) => setFilters((f) => ({ ...f, ...patch, page: 1 }))
  const active = Boolean(
    filters.action ||
      filters.objectType ||
      filters.actorRole ||
      filters.outcome ||
      filters.search ||
      from ||
      to,
  )

  async function runExport() {
    setExporting(true)
    try {
      const name = await exportAuditLog(effective)
      toast.success('Audit log exported', {
        description: `${name} (CSV, UTF-8). Active filters applied; contact details are excluded. The export itself is audited.`,
      })
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'The export failed. Try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <ManagePage
      title="Audit and demo reset"
      description="Every permission, marking, session, export, certificate and notification event, with actor, role, time, object, change and reason."
      actions={
        <Button variant="outline" onClick={runExport} disabled={exporting}>
          <Download /> {exporting ? 'Exporting' : 'Export audit log (CSV)'}
        </Button>
      }
    >
      <DemoResetPanel />
      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="grid gap-3 border-b border-border/70 px-6 py-4">
          <div className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] gap-3">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Search action, actor, object or reason"
                aria-label="Search the audit log"
                className="h-10 rounded-lg ps-9"
              />
            </div>
            <OptionSelect
              ariaLabel="Action"
              className="h-10 w-full rounded-lg bg-white"
              value={filters.action}
              onChange={(v) => set({ action: v ?? undefined })}
              options={(query.data?.facets.actions ?? []).map((a) => ({
                value: a.value,
                label: `${a.value} (${a.n})`,
              }))}
              allowNone
              noneLabel="All actions"
            />
            <OptionSelect
              ariaLabel="Object type"
              className="h-10 w-full rounded-lg bg-white"
              value={filters.objectType}
              onChange={(v) => set({ objectType: v ?? undefined })}
              options={(query.data?.facets.objectTypes ?? []).map((a) => ({
                value: a.value,
                label: a.value,
              }))}
              allowNone
              noneLabel="All objects"
            />
            <OptionSelect
              ariaLabel="Actor role"
              className="h-10 w-full rounded-lg bg-white"
              value={filters.actorRole}
              onChange={(v) => set({ actorRole: (v ?? undefined) as Filters['actorRole'] })}
              options={ROLE_OPTIONS}
              allowNone
              noneLabel="All roles"
            />
            <OptionSelect
              ariaLabel="Outcome"
              className="h-10 w-full rounded-lg bg-white"
              value={filters.outcome}
              onChange={(v) => set({ outcome: (v ?? undefined) as Filters['outcome'] })}
              options={[
                { value: 'allowed', label: 'Allowed' },
                { value: 'denied', label: 'Denied' },
              ]}
              allowNone
              noneLabel="All outcomes"
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <Label htmlFor="audit-from" className="text-xs text-muted-foreground">
                From (event date, Qatar time)
              </Label>
              <Input
                id="audit-from"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value)
                  set({})
                }}
                className="h-9 w-44 rounded-lg"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="audit-to" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="audit-to"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value)
                  set({})
                }}
                className="h-9 w-44 rounded-lg"
              />
            </div>
            {active ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setText('')
                  setFrom('')
                  setTo('')
                  setFilters({ page: 1, pageSize: filters.pageSize })
                }}
              >
                Reset filters
              </Button>
            ) : null}
          </div>
        </div>
        {query.isPending ? (
          <TableSkeleton cols={6} />
        ) : query.isError ? (
          <div className="p-6">
            <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
          </div>
        ) : query.data.items.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit events match"
            description="Widen the date range or clear a filter to see more events."
          />
        ) : (
          <TableFrame label="Audit events">
            <Table>
              <TableHeader>
                <TableRow className="bg-sand/60 hover:bg-sand/60">
                  <TableHead className="ps-6">Time (Qatar time)</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Object</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="pe-6">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-teal-mist/40"
                    onClick={() => setOpen(row)}
                  >
                    <TableCell className="ps-6 text-sm tabular-nums whitespace-nowrap">
                      {qDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{row.actorLabel ?? 'System'}</p>
                      <p className="text-xs text-muted-foreground capitalize">{row.actorRole}</p>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="font-mono text-xs text-teal-deep hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpen(row)
                        }}
                      >
                        {row.action}
                      </button>
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-sm">
                      {row.objectType} <span className="text-muted-foreground">{row.objectId}</span>
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={row.outcome === 'denied' ? 'bad' : 'good'}>
                        {row.outcome === 'denied' ? 'Denied' : 'Allowed'}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="max-w-72 truncate pe-6 text-sm text-muted-foreground">
                      {row.reason ?? 'Not recorded'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableFrame>
        )}
        {query.data && query.data.total > 0 ? (
          <Pager
            page={filters.page ?? 1}
            pageSize={filters.pageSize ?? 25}
            total={query.data.total}
            noun="events"
            onPage={(page) => setFilters((f) => ({ ...f, page }))}
            onPageSize={(pageSize) => setFilters((f) => ({ ...f, pageSize, page: 1 }))}
          />
        ) : null}
      </section>
      <AuditDetailSheet row={open} onClose={() => setOpen(null)} />
    </ManagePage>
  )
}
