import type { ProgrammeCode } from '@shared/constants'
import { PROGRAMME_LABELS, PROGRAMME_TITLES } from '@shared/schemas/admin-labels'
import { ArrowRight, Search } from 'lucide-react'
import type * as React from 'react'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { SortHeader } from '@/features/reports/components/SortHeader'
import type { Overview } from '../queries/analytics.queries'
import { count, percent, signed } from '../utils/format'
import { PanelCard } from './PanelCard'

type Row = Overview['performance'][number]
type Key = keyof Row

const COLUMNS: { key: Key; header: string; render: (row: Row) => React.ReactNode }[] = [
  { key: 'enrolments', header: 'Enrolments', render: (r) => count(r.enrolments) },
  { key: 'learners', header: 'Learners', render: (r) => count(r.learners) },
  { key: 'active', header: 'Active', render: (r) => count(r.active) },
  { key: 'completed', header: 'Completed', render: (r) => count(r.completed) },
  { key: 'completionRate', header: 'Completion', render: (r) => percent(r.completionRate) },
  { key: 'averageProgress', header: 'Progress', render: (r) => percent(r.averageProgress) },
  {
    key: 'gain',
    header: 'Pre to post',
    render: (r) =>
      r.pairs ? (
        <span className="grid">
          <span>
            {r.pre} to {r.post}
          </span>
          <span className="text-xs font-medium text-teal-deep">{signed(r.gain)} pp</span>
        </span>
      ) : (
        <span className="text-muted-foreground">No pairs yet</span>
      ),
  },
  {
    key: 'certificates',
    header: 'Certificates',
    render: (r) =>
      r.certificates === null ? (
        <span className="text-muted-foreground">Not certified</span>
      ) : (
        count(r.certificates)
      ),
  },
  { key: 'pendingMarking', header: 'Pending marking', render: (r) => count(r.pendingMarking) },
]

/** Brief §12 programme performance summary: searchable, sortable, drills into the programme report. */
export function PerformanceTable({
  data,
  onOpen,
}: {
  data: Overview
  onOpen: (programme: ProgrammeCode) => void
}) {
  const [term, setTerm] = useState('')
  const [sort, setSort] = useState<{ key: Key; direction: 'asc' | 'desc' }>({
    key: 'enrolments',
    direction: 'desc',
  })
  const rows = useMemo(() => {
    const t = term.trim().toLowerCase()
    return data.performance
      .filter(
        (r) =>
          !t ||
          `${PROGRAMME_LABELS[r.programme]} ${PROGRAMME_TITLES[r.programme]}`
            .toLowerCase()
            .includes(t),
      )
      .sort((a, b) => {
        const av = a[sort.key] ?? -1
        const bv = b[sort.key] ?? -1
        const diff =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv))
        return sort.direction === 'asc' ? diff : -diff
      })
  }, [data.performance, term, sort])

  const toggle = (key: Key) =>
    setSort((s) => ({ key, direction: s.key === key && s.direction === 'desc' ? 'asc' : 'desc' }))

  return (
    <PanelCard
      title="Programme performance summary"
      description="One row per programme in the filtered cohort. Active means activity in the last 30 days. Select a row to open its users report."
      info={{
        label: data.definitions.completionRate.label,
        definition: data.definitions.completionRate.definition,
      }}
      action={
        <div className="relative w-56">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Search programmes"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search programmes"
            className="h-9 ps-9"
          />
        </div>
      }
    >
      <section
        aria-label="Programme performance"
        className="w-0 min-w-full overflow-x-auto rounded-lg border"
      >
        <table className="w-full text-sm">
          <thead className="bg-sand-deep/70">
            <tr>
              <th scope="col" className="h-11 px-4 text-start">
                <SortHeader
                  label="Programme"
                  active={sort.key === 'programme'}
                  direction={sort.direction}
                  onSort={() => toggle('programme')}
                />
              </th>
              {COLUMNS.map((c) => (
                <th key={c.key} scope="col" className="h-11 px-3 text-end">
                  <SortHeader
                    label={c.header}
                    active={sort.key === c.key}
                    direction={sort.direction}
                    onSort={() => toggle(c.key)}
                    numeric
                  />
                </th>
              ))}
              <th className="w-10" aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="p-8 text-center text-muted-foreground">
                  No programme matches "{term}".
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.programme}
                  tabIndex={0}
                  onClick={() => onOpen(row.programme)}
                  onKeyDown={(e) => e.key === 'Enter' && onOpen(row.programme)}
                  className="group cursor-pointer border-t transition-colors hover:bg-teal-mist/40 focus-visible:bg-teal-mist/60 focus-visible:outline-none"
                >
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-ink">{PROGRAMME_LABELS[row.programme]}</p>
                    <p className="text-xs whitespace-nowrap text-muted-foreground">
                      {PROGRAMME_TITLES[row.programme]}
                    </p>
                  </td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="px-3 py-3.5 text-end whitespace-nowrap tabular-nums">
                      {c.render(row)}
                    </td>
                  ))}
                  <td className="pe-3 text-end">
                    <ArrowRight
                      className="ms-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-teal"
                      aria-hidden
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </PanelCard>
  )
}
