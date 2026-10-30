import type { AttendanceValue } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Ban, Info, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { StatCard } from '@/components/data/StatCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { QueryErrorPanel } from '@/features/sessions/components/QueryErrorPanel'
import { ApiError } from '@/lib/api-error'
import { qatarRange } from '@/lib/format/qatar-time'
import { rosterQuery, useMarkAttendance } from '../../queries/trainer.queries'
import type { RosterRow } from '../../types'
import { SessionStatusBadge } from '../shared/SessionStatusBadge'
import { WorkspaceSkeleton } from '../shared/WorkspaceSkeleton'
import { CorrectionDialog } from './CorrectionDialog'
import { ExportActions } from './ExportActions'
import { RosterTable } from './RosterTable'
import { ScoreDialog } from './ScoreDialog'
import { WaitlistRoster } from './WaitlistRoster'

/** Attendance and scores for one session (brief §10–11). */
export function RosterPage({ sessionId }: { sessionId: string }) {
  const roster = useQuery(rosterQuery(sessionId))
  const mark = useMarkAttendance()
  const [scoring, setScoring] = useState<RosterRow | null>(null)
  const [correction, setCorrection] = useState<{ row: RosterRow; value: AttendanceValue } | null>(
    null,
  )

  if (roster.isPending) return <WorkspaceSkeleton rows={6} />
  if (roster.isError) {
    const forbidden = roster.error instanceof ApiError && roster.error.status === 403
    return (
      <QueryErrorPanel
        error={roster.error}
        onRetry={() => roster.refetch()}
        title={
          forbidden ? 'This roster belongs to another trainer' : 'The roster could not be loaded'
        }
      />
    )
  }
  const { session, items, recordingOpen, beforeSessionTime, passMark } = roster.data
  const confirmed = items.filter((r) => r.rsvpStatus === 'confirmed')
  // Offered and waitlisted learners are listed apart: they are not booked, so never marked attending.
  const queue = items.filter((r) => r.rsvpStatus === 'offered' || r.rsvpStatus === 'waitlisted')
  const marked = confirmed.filter((r) => r.attendance !== 'pending').length
  const finals = confirmed.filter((r) => r.score?.status === 'final')
  const passed = finals.filter((r) => r.score?.passed).length

  async function apply(row: RosterRow, value: AttendanceValue, correctionReason?: string) {
    try {
      const result = await mark.mutateAsync({ rsvpId: row.rsvpId, status: value, correctionReason })
      toast.success(
        result.scoreRemoved
          ? `${row.learnerCode} marked ${value}. Their score was removed: absence never counts as a pass.`
          : `${row.learnerCode} marked ${value}.`,
      )
      setCorrection(null)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Attendance could not be saved. Try again.',
      )
    }
  }

  function onAttendance(row: RosterRow, value: AttendanceValue) {
    if (row.score?.status === 'final') setCorrection({ row, value })
    else void apply(row, value)
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Attendance and scores', to: '/trainer/attendance' },
          { label: session.code },
        ]}
        title={session.title}
        description={`${qatarRange(session.startsAt, session.endsAt)}. Rubric out of 100, pass at ${passMark}.`}
        actions={
          <Button asChild variant="outline">
            <Link to="/trainer/sessions/$sessionId" params={{ sessionId }}>
              Session details
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <SessionStatusBadge status={session.status} />
        <span className="text-sm text-muted-foreground">
          {session.code}, Program {session.programmeCode}
        </span>
      </div>
      {session.status === 'cancelled' ? (
        <p className="flex gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <Ban aria-hidden className="mt-0.5 size-4 shrink-0" />
          This session was cancelled. It records no attendance or scores and unlocks nothing for
          learners.
        </p>
      ) : beforeSessionTime && recordingOpen ? (
        <p className="flex gap-2 rounded-xl border border-teal/15 bg-teal-mist/60 px-4 py-3 text-sm text-teal-deep">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          This session has not started yet. In this demonstration you can still record attendance
          and scores so the walkthrough can continue.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="Confirmed learners" value={confirmed.length} icon={Users} />
        <StatCard
          label="Attendance recorded"
          value={marked}
          suffix={` of ${confirmed.length}`}
          tone="maroon"
        />
        <StatCard label="Final scores" value={finals.length} tone="neutral" />
        <StatCard label="Passed" value={passed} description={`At or above ${passMark}`} />
      </div>
      <ExportActions sessionId={sessionId} />
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/60">
          <EmptyState
            icon={Users}
            title="No learners booked yet"
            description="Learners appear here as soon as they book this session."
          />
        </div>
      ) : (
        <>
          <h2 className="font-display text-xl font-normal text-ink">
            Confirmed roster ({confirmed.length})
          </h2>
          <RosterTable
            rows={confirmed}
            canRecord={recordingOpen}
            onAttendance={onAttendance}
            onScore={setScoring}
          />
          <WaitlistRoster rows={queue} />
        </>
      )}
      <ScoreDialog row={scoring} onOpenChange={(o) => !o && setScoring(null)} />
      <CorrectionDialog
        key={correction?.row.rsvpId ?? 'none'}
        open={Boolean(correction)}
        pending={mark.isPending}
        description={
          correction
            ? `${correction.row.learnerCode} has a final score. Changing attendance to ${correction.value} is a correction${correction.value === 'absent' || correction.value === 'excused' ? ' and removes the score, because absence never passes' : ''}.`
            : ''
        }
        onCancel={() => setCorrection(null)}
        onConfirm={(reason) => correction && apply(correction.row, correction.value, reason)}
      />
    </>
  )
}
