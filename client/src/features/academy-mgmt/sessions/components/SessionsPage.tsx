import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { useQuery } from '@tanstack/react-query'
import { CalendarX2, Search } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ManagePage } from '../../hub/components/ManagePage'
import { OptionSelect, optionsOf } from '../../hub/components/OptionSelect'
import { ErrorPanel, TableSkeleton } from '../../hub/components/QueryStates'
import { SortHeader, type SortState, sortRows } from '../../hub/components/SortHeader'
import { StatusPill } from '../../hub/components/StatusPill'
import { TableFrame } from '../../hub/components/TableFrame'
import { humanise, qDateTime } from '../../hub/utils/format'
import { adminSessionsQuery, type SessionItem } from '../queries/sessions.queries'
import { CapacityBar } from './CapacityBar'
import { ChangeRequestsPanel } from './ChangeRequestsPanel'
import { SessionSheet } from './SessionSheet'
import { WaitlistView } from './WaitlistView'

const STATUS = {
  draft: 'Draft',
  published: 'Published',
  full: 'Full',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
const FORMAT = { in_person: 'In person', online: 'Live online' }
type Key = 'code' | 'programme' | 'trainerName' | 'startsAt' | 'format' | 'confirmed' | 'status'

export function SessionsPage({ view }: { view?: 'waitlist' }) {
  const query = useQuery(adminSessionsQuery())
  const reduce = useReducedMotion()
  const [search, setSearch] = useState('')
  const [programme, setProgramme] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [format, setFormat] = useState<string | null>(null)
  const [sort, setSort] = useState<SortState<Key>>({ key: 'startsAt', direction: 'asc' })
  const [open, setOpen] = useState<SessionItem | null>(null)

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = (query.data?.items ?? []).filter(
      (s) =>
        (!programme || s.programme === programme) &&
        (!status || s.status === status) &&
        (!format || s.format === format) &&
        (!term || `${s.code} ${s.title} ${s.trainerName}`.toLowerCase().includes(term)),
    )
    return sortRows(filtered, sort)
  }, [query.data, search, programme, status, format, sort])

  const items = query.data?.items ?? []
  const filtered = Boolean(search || programme || status || format)
  const header = (label: string, column: Key) => (
    <SortHeader label={label} column={column} sort={sort} onSort={setSort} />
  )

  return (
    <ManagePage
      title="Session management"
      description="An administrator's view over every scheduled session: capacity, bookings, waitlists, attendance and reschedule history."
    >
      {view === 'waitlist' ? <WaitlistView /> : null}
      {items.length ? (
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Summary label="Sessions" value={items.length} />
          <Summary
            label="Upcoming"
            value={items.filter((s) => s.status === 'published' || s.status === 'full').length}
          />
          <Summary label="Confirmed bookings" value={items.reduce((n, s) => n + s.confirmed, 0)} />
          <Summary label="On waitlists" value={items.reduce((n, s) => n + s.waitlisted, 0)} />
        </dl>
      ) : null}
      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 px-6 py-4">
          <div className="relative min-w-64 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by session, title or trainer"
              aria-label="Search sessions"
              className="h-10 rounded-lg ps-9"
            />
          </div>
          <OptionSelect
            ariaLabel="Programme"
            className="h-10 w-40 rounded-lg bg-white"
            value={programme}
            onChange={setProgramme}
            options={optionsOf(PROGRAMME_LABELS)}
            allowNone
            noneLabel="All programmes"
          />
          <OptionSelect
            ariaLabel="Status"
            className="h-10 w-40 rounded-lg bg-white"
            value={status}
            onChange={setStatus}
            options={optionsOf(STATUS)}
            allowNone
            noneLabel="All statuses"
          />
          <OptionSelect
            ariaLabel="Format"
            className="h-10 w-40 rounded-lg bg-white"
            value={format}
            onChange={setFormat}
            options={optionsOf(FORMAT)}
            allowNone
            noneLabel="All formats"
          />
          {filtered ? (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('')
                setProgramme(null)
                setStatus(null)
                setFormat(null)
              }}
            >
              Reset filters
            </Button>
          ) : null}
        </div>
        {query.isPending ? (
          <TableSkeleton cols={7} />
        ) : query.isError ? (
          <div className="p-6">
            <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="No sessions match these filters"
            description="Change the filters or search to see more sessions."
          />
        ) : (
          <TableFrame label="Sessions">
            <Table>
              <TableHeader>
                <TableRow className="bg-sand/60 hover:bg-sand/60">
                  <SortHeader
                    label="Session"
                    column="code"
                    sort={sort}
                    onSort={setSort}
                    className="ps-6"
                  />
                  {header('Trainer', 'trainerName')}
                  {header('Qatar time', 'startsAt')}
                  {header('Format', 'format')}
                  {header('Capacity', 'confirmed')}
                  <TableHead>Attendance</TableHead>
                  {header('Status', 'status')}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i, 15) * 0.015 }}
                    className="cursor-pointer border-b transition-colors hover:bg-teal-mist/40"
                    onClick={() => setOpen(s)}
                  >
                    <TableCell className="ps-6">
                      <button
                        type="button"
                        className="grid text-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpen(s)
                        }}
                      >
                        <span className="font-medium text-ink">{s.title}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {s.code} | Program {s.programme}
                          {s.reschedules ? ' | Rescheduled' : ''}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{s.trainerName}</TableCell>
                    <TableCell className="text-sm tabular-nums">{qDateTime(s.startsAt)}</TableCell>
                    <TableCell className="text-sm">{FORMAT[s.format]}</TableCell>
                    <TableCell>
                      <CapacityBar
                        used={s.confirmed + s.offered}
                        capacity={s.capacity}
                        waitlist={s.waitlisted}
                      />
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {s.marked ? (
                        `${s.present} of ${s.marked}`
                      ) : (
                        <span className="text-muted-foreground">Not yet due</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        tone={
                          s.status === 'cancelled'
                            ? 'bad'
                            : s.status === 'completed'
                              ? 'neutral'
                              : s.status === 'full'
                                ? 'warn'
                                : 'info'
                        }
                      >
                        {humanise(s.status)}
                      </StatusPill>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </TableFrame>
        )}
      </section>
      <ChangeRequestsPanel />
      <SessionSheet session={open} onClose={() => setOpen(null)} />
    </ManagePage>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4 shadow-xs">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-display text-3xl font-light text-ink tabular-nums">
        {value.toLocaleString('en-GB')}
      </dd>
    </div>
  )
}
