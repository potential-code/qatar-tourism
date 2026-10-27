import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CalendarClock, History, MapPin, Users, Video } from 'lucide-react'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '../../hub/components/QueryStates'
import { StatusPill } from '../../hub/components/StatusPill'
import { humanise, qDateTime, qTime } from '../../hub/utils/format'
import { adminSessionDetailQuery, type SessionItem } from '../queries/sessions.queries'
import { CapacityBar } from './CapacityBar'

const ATTEND = {
  attended: 'good',
  late: 'warn',
  absent: 'bad',
  excused: 'muted',
  pending: 'info',
} as const

export function SessionSheet({
  session,
  onClose,
}: {
  session: SessionItem | null
  onClose: () => void
}) {
  const query = useQuery({
    ...adminSessionDetailQuery(session?.id ?? ''),
    enabled: Boolean(session),
  })
  return (
    <Sheet open={Boolean(session)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {session ? (
          <>
            <SheetHeader className="border-b bg-sand/60 p-6">
              <p className="text-xs font-medium text-teal tabular-nums">
                {session.code} | Program {session.programme}
                {session.level ? ` | ${session.level}` : ''}
              </p>
              <SheetTitle className="font-display text-2xl font-normal">{session.title}</SheetTitle>
              <SheetDescription>
                With {session.trainerName} ({session.trainerCode})
              </SheetDescription>
              <div className="flex flex-wrap gap-2 pt-1">
                <StatusPill
                  tone={
                    session.status === 'cancelled'
                      ? 'bad'
                      : session.status === 'completed'
                        ? 'neutral'
                        : session.status === 'full'
                          ? 'warn'
                          : 'info'
                  }
                >
                  {humanise(session.status)}
                </StatusPill>
                {session.isCompletionGate ? (
                  <StatusPill tone="info">Completion gate</StatusPill>
                ) : (
                  <StatusPill tone="muted">Optional, never a gate</StatusPill>
                )}
              </div>
            </SheetHeader>
            <div className="grid gap-6 p-6">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-start gap-3">
                  <CalendarClock className="mt-0.5 size-4 text-teal" aria-hidden />
                  <div>
                    <dt className="sr-only">When</dt>
                    <dd>
                      {qDateTime(session.startsAt)} to {qTime(session.endsAt)} Qatar time
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  {session.format === 'online' ? (
                    <Video className="mt-0.5 size-4 text-teal" aria-hidden />
                  ) : (
                    <MapPin className="mt-0.5 size-4 text-teal" aria-hidden />
                  )}
                  <div className="grid gap-1">
                    <dt className="sr-only">Where</dt>
                    <dd>
                      {session.format === 'online' ? (
                        <span className="flex flex-wrap items-center gap-2">
                          Live online, {session.meetingRef ?? 'demo meeting room'}{' '}
                          <SimulatedTag label="Demo classroom adapter" />
                        </span>
                      ) : (
                        `In person, ${[session.venue, session.room].filter(Boolean).join(', ')}`
                      )}
                    </dd>
                  </div>
                </div>
              </dl>
              <CapacityBar
                used={session.confirmed}
                capacity={session.capacity}
                waitlist={session.waitlisted}
              />

              {query.isPending ? (
                <Skeleton className="h-64" />
              ) : query.isError ? (
                <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-ink/80">{query.data.description}</p>
                  {query.data.cancelledReason ? (
                    <p className="rounded-lg bg-maroon-mist px-3 py-2 text-sm text-maroon-deep">
                      Cancelled: {query.data.cancelledReason}
                    </p>
                  ) : null}
                  <section className="grid gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
                      <History className="size-4 text-teal" aria-hidden /> Reschedule history
                    </h3>
                    {query.data.reschedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Never rescheduled.</p>
                    ) : (
                      <ol className="grid gap-2">
                        {query.data.reschedules.map((r) => (
                          <li key={r.id} className="rounded-xl border p-3 text-sm">
                            <p className="font-medium">
                              {qDateTime(r.previousStartsAt)} moved to {qDateTime(r.newStartsAt)}{' '}
                              Qatar time
                            </p>
                            <p className="text-muted-foreground">
                              {r.reason}. {r.affectedRsvps} learners notified by{' '}
                              {r.changedBy ?? 'a trainer'}.
                            </p>
                            <p className="text-xs text-muted-foreground">Event {r.eventId}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                  <section className="grid gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
                      <Users className="size-4 text-teal" aria-hidden /> Roster (
                      {query.data.roster.length})
                    </h3>
                    {query.data.roster.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No bookings yet.</p>
                    ) : (
                      <ul className="divide-y rounded-xl border">
                        {query.data.roster.map((r) => (
                          <li
                            key={r.rsvpId}
                            className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                          >
                            <span>
                              <span className="font-medium">{r.name}</span>{' '}
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {r.learnerCode}
                              </span>
                            </span>
                            <span className="flex gap-1.5">
                              <StatusPill
                                tone={
                                  r.status === 'confirmed'
                                    ? 'good'
                                    : r.status === 'waitlisted'
                                      ? 'warn'
                                      : 'muted'
                                }
                              >
                                {humanise(r.status)}
                                {r.waitlistPosition ? ` #${r.waitlistPosition}` : ''}
                              </StatusPill>
                              {r.attendance ? (
                                <StatusPill tone={ATTEND[r.attendance]}>
                                  {humanise(r.attendance)}
                                </StatusPill>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              )}
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Editing uses the trainer scheduling flow: create, reschedule and cancel run there
                with conflict checks, notifications and the audit trail. Learner bookings are
                reflected here and in{' '}
                <Link
                  to={'/admin/reports/sessions' as never}
                  className="font-medium text-teal hover:underline"
                >
                  Sessions and attendance
                </Link>
                .
              </p>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
