import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ClipboardList } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Reveal } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/ui/empty-state'
import { DateTile } from '@/features/sessions/components/DateTile'
import { QueryErrorPanel } from '@/features/sessions/components/QueryErrorPanel'
import { qatarTime } from '@/features/sessions/utils/qatar-time'
import { trainerSessionsQuery } from '../../queries/trainer.queries'
import type { TrainerSession } from '../../types'
import { SessionStatusBadge } from '../shared/SessionStatusBadge'
import { WorkspaceSkeleton } from '../shared/WorkspaceSkeleton'

function RosterLink({ s }: { s: TrainerSession }) {
  return (
    <Link
      to="/trainer/attendance/$sessionId"
      params={{ sessionId: s.id }}
      className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <DateTile iso={s.startsAt} muted={s.status === 'cancelled'} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <SessionStatusBadge status={s.status} />
          <span className="text-xs text-muted-foreground">{s.code}</span>
        </div>
        <p className="mt-1 font-display text-lg text-ink group-hover:text-teal-deep">{s.title}</p>
        <p className="text-sm text-ink-soft">
          {qatarTime(s.startsAt)} Qatar time. {s.confirmed} confirmed
          {s.attendanceOutstanding > 0 ? `, ${s.attendanceOutstanding} attendance outstanding` : ''}
        </p>
      </div>
      <ArrowRight
        aria-hidden
        className="size-5 text-teal transition-transform group-hover:translate-x-1 rtl:-scale-x-100"
      />
    </Link>
  )
}

/** Pick a session to record attendance and scores; sessions that need it come first. */
export function AttendanceIndexPage() {
  const sessions = useQuery(trainerSessionsQuery())
  const header = (
    <PageHeader
      title="Attendance and scores"
      description="Record attendance, score with the session rubric and export marks."
    />
  )
  if (sessions.isPending)
    return (
      <>
        {header}
        <WorkspaceSkeleton rows={5} />
      </>
    )
  if (sessions.isError)
    return (
      <>
        {header}
        <QueryErrorPanel error={sessions.error} onRetry={() => sessions.refetch()} />
      </>
    )
  const items = sessions.data.items.filter((s) => s.status !== 'draft')
  const needs = items.filter((s) => s.attendanceOutstanding > 0)
  const rest = items
    .filter((s) => s.attendanceOutstanding === 0)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  return (
    <>
      {header}
      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No published sessions"
          description="Publish a session to record attendance for it."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {needs.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-light text-ink">Needs attendance</h2>
              {needs.map((s) => (
                <Reveal key={s.id}>
                  <RosterLink s={s} />
                </Reveal>
              ))}
            </section>
          ) : null}
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-light text-ink">All sessions</h2>
            {rest.map((s) => (
              <Reveal key={s.id}>
                <RosterLink s={s} />
              </Reveal>
            ))}
          </section>
        </div>
      )}
    </>
  )
}
