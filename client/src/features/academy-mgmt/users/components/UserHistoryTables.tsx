import { CalendarX2, ClipboardX, FileX2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusPill } from '../../hub/components/StatusPill'
import { TableFrame } from '../../hub/components/TableFrame'
import { humanise, qDate, qDateTime } from '../../hub/utils/format'
import type { UserDetail } from '../queries/users.queries'

export function AssessmentHistory({ rows }: { rows: UserDetail['assessments'] }) {
  if (rows.length === 0)
    return (
      <EmptyState
        icon={ClipboardX}
        title="No assessment attempts"
        description="The baseline appears once the learner submits it."
      />
    )
  return (
    <TableFrame label="Assessment history">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Assessment</TableHead>
            <TableHead>Programme</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Attempt</TableHead>
            <TableHead className="text-end">Score</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => {
            const passed = a.passPercent !== null && a.score !== null && a.score >= a.passPercent
            return (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.title}</TableCell>
                <TableCell>Program {a.programme}</TableCell>
                <TableCell className="tabular-nums">{a.version}</TableCell>
                <TableCell className="tabular-nums">{a.attemptNo}</TableCell>
                <TableCell className="text-end font-display text-lg tabular-nums">
                  {a.score ?? 'Pending'}
                </TableCell>
                <TableCell>
                  {a.passPercent === null ? (
                    <StatusPill tone="info">Baseline</StatusPill>
                  ) : passed ? (
                    <StatusPill tone="good">Passed</StatusPill>
                  ) : (
                    <StatusPill tone="warn">Below {a.passPercent}</StatusPill>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {qDate(a.submittedAt)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableFrame>
  )
}

const RSVP_TONE = {
  confirmed: 'good',
  waitlisted: 'warn',
  cancelled: 'muted',
  moved: 'info',
  offered: 'info',
} as const
const ATTEND_TONE = {
  attended: 'good',
  late: 'warn',
  absent: 'bad',
  excused: 'muted',
  pending: 'info',
} as const

export function BookingHistory({ rows }: { rows: UserDetail['bookings'] }) {
  if (rows.length === 0)
    return (
      <EmptyState
        icon={CalendarX2}
        title="No session bookings"
        description="Bookings and attendance appear here once the learner books a session."
      />
    )
  return (
    <TableFrame label="Booking history">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Session</TableHead>
            <TableHead>Trainer</TableHead>
            <TableHead>Date and time (Qatar time)</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Booking</TableHead>
            <TableHead>Attendance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((b) => (
            <TableRow key={b.id}>
              <TableCell>
                <p className="font-medium">{b.sessionTitle}</p>
                <p className="text-xs text-muted-foreground">{b.sessionCode}</p>
              </TableCell>
              <TableCell className="text-sm">{b.trainer}</TableCell>
              <TableCell className="text-sm tabular-nums">{qDateTime(b.startsAt)}</TableCell>
              <TableCell className="text-sm">
                {b.format === 'online' ? 'Live online' : 'In person'}
              </TableCell>
              <TableCell>
                <StatusPill tone={RSVP_TONE[b.status]}>
                  {humanise(b.status)}
                  {b.waitlistPosition ? ` #${b.waitlistPosition}` : ''}
                </StatusPill>
              </TableCell>
              <TableCell>
                {b.attendance ? (
                  <StatusPill tone={ATTEND_TONE[b.attendance]}>{humanise(b.attendance)}</StatusPill>
                ) : (
                  <span className="text-xs text-muted-foreground">Not yet due</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableFrame>
  )
}

const SUB_TONE = {
  submitted: 'info',
  under_review: 'warn',
  returned: 'bad',
  approved: 'good',
} as const

export function SubmissionHistory({ rows }: { rows: UserDetail['submissions'] }) {
  if (rows.length === 0)
    return (
      <EmptyState
        icon={FileX2}
        title="No submissions"
        description="Assignment versions and trainer feedback appear here."
      />
    )
  return (
    <ul className="grid gap-3">
      {rows.map((s) => (
        <li key={s.id} className="rounded-xl border bg-sand/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-ink">
              {s.assignment} <span className="text-muted-foreground">version {s.version}</span>
            </p>
            <div className="flex items-center gap-3">
              {s.score !== null ? (
                <span className="font-display text-xl tabular-nums">{s.score}</span>
              ) : null}
              <StatusPill tone={SUB_TONE[s.status]}>{humanise(s.status)}</StatusPill>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Submitted {qDate(s.submittedAt)}</p>
          {s.feedback ? (
            <p className="mt-3 border-s-2 border-teal/40 ps-3 text-sm text-ink/80">{s.feedback}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
