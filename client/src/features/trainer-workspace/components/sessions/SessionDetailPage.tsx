import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Ban, CalendarClock, CheckCheck, ClipboardList, Pencil, Send } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Button } from '@/components/ui/button'
import { BookingPolicyNote } from '@/features/sessions/components/BookingPolicyNote'
import { QueryErrorPanel } from '@/features/sessions/components/QueryErrorPanel'
import { SessionFacts } from '@/features/sessions/components/SessionFacts'
import { ApiError } from '@/lib/api'
import {
  sessionDetailQuery,
  useCompleteSession,
  usePublishSession,
} from '../../queries/trainer.queries'
import { SeatMeter } from '../shared/SeatMeter'
import { SessionStatusBadge } from '../shared/SessionStatusBadge'
import { WorkspaceSkeleton } from '../shared/WorkspaceSkeleton'
import { CancelSessionDialog } from './CancelSessionDialog'
import { type ChangeResult, ChangeResultModal } from './ChangeResultModal'
import { RescheduleHistory } from './RescheduleHistory'
import { RescheduleSessionDialog } from './RescheduleSessionDialog'

/** One session: details, state actions, reschedule and cancel, and its history (brief §10). */
export function SessionDetailPage({ sessionId }: { sessionId: string }) {
  const detail = useQuery(sessionDetailQuery(sessionId))
  const publish = usePublishSession()
  const complete = useCompleteSession()
  const [dialog, setDialog] = useState<'reschedule' | 'cancel' | null>(null)
  const [result, setResult] = useState<ChangeResult | null>(null)

  if (detail.isPending) return <WorkspaceSkeleton rows={3} />
  if (detail.isError) {
    const forbidden = detail.error instanceof ApiError && detail.error.status === 403
    return (
      <QueryErrorPanel
        error={detail.error}
        onRetry={() => detail.refetch()}
        title={
          forbidden ? 'This session belongs to another trainer' : 'The session could not be loaded'
        }
      />
    )
  }
  const { session, rescheduleHistory } = detail.data
  const open =
    session.status === 'published' || session.status === 'full' || session.status === 'draft'
  const started = new Date(session.startsAt) <= new Date(detail.data.now)

  async function run(action: () => Promise<unknown>, message: string) {
    try {
      await action()
      toast.success(message)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'The change could not be saved. Try again.',
      )
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'My sessions', to: '/trainer/sessions' }, { label: session.code }]}
        title={session.title}
        description={`${session.code}. Program ${session.programmeCode}${session.level ? `, ${session.level}: ${session.stage}` : ', optional session'}.`}
        actions={
          <>
            {open ? (
              <Button asChild variant="outline">
                <Link to="/trainer/sessions/$sessionId/edit" params={{ sessionId }}>
                  <Pencil aria-hidden /> Edit
                </Link>
              </Button>
            ) : null}
            {session.status === 'draft' ? (
              <Button
                onClick={() =>
                  run(() => publish.mutateAsync(sessionId), 'Published to the eligible catalogue.')
                }
                disabled={publish.isPending}
              >
                <Send aria-hidden /> Publish
              </Button>
            ) : null}
            {open && session.status !== 'draft' ? (
              <Button onClick={() => setDialog('reschedule')}>
                <CalendarClock aria-hidden /> Reschedule
              </Button>
            ) : null}
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <SessionStatusBadge status={session.status} />
        {session.cancelledReason ? (
          <span className="text-sm text-muted-foreground">Reason: {session.cancelledReason}</span>
        ) : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-xs md:p-6">
            <p className="text-ink-soft">{session.description}</p>
            <SessionFacts session={session} />
            {session.format === 'online' && session.joinInstructions ? (
              <div className="rounded-lg bg-sand p-3 text-sm text-ink-soft">
                <p className="mb-1 flex items-center gap-2 font-medium text-ink">
                  Join instructions <SimulatedTag label="Simulated online classroom" />
                </p>
                {session.joinInstructions}
              </div>
            ) : null}
            {session.materials.length > 0 ? (
              <div className="text-sm">
                <p className="font-medium text-ink">Materials</p>
                <ul className="mt-1 list-disc ps-5 text-ink-soft">
                  {session.materials.map((m) => (
                    <li key={m.title}>{m.title}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <BookingPolicyNote policy={session.cancellationPolicy} />
          </section>
          {open && session.status !== 'draft' ? (
            <section className="flex flex-col gap-3 rounded-xl border border-destructive/15 bg-card p-5">
              <h2 className="font-display text-xl font-normal text-ink">Cancel session</h2>
              <p className="text-sm text-muted-foreground">
                Releases every reservation, tells each learner and offers alternative sessions.
                History is kept.
              </p>
              <Button
                variant="outline"
                className="w-fit border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setDialog('cancel')}
              >
                <Ban aria-hidden /> Cancel session
              </Button>
            </section>
          ) : null}
        </div>
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs">
            <h2 className="font-display text-xl font-normal text-ink">Bookings</h2>
            <SeatMeter
              confirmed={session.confirmed}
              capacity={session.capacity}
              waitlisted={session.waitlisted}
            />
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/trainer/attendance/$sessionId" params={{ sessionId }}>
                  <ClipboardList aria-hidden /> Roster, attendance and scores
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to="/trainer/sessions/notification-log" search={{ sessionId }}>
                  Notifications
                </Link>
              </Button>
            </div>
            {open && session.status !== 'draft' && started ? (
              <Button
                size="sm"
                variant="secondary"
                className="w-fit"
                onClick={() =>
                  run(() => complete.mutateAsync(sessionId), 'Session marked completed.')
                }
                disabled={complete.isPending}
              >
                <CheckCheck aria-hidden /> Mark session completed
              </Button>
            ) : null}
          </section>
          <RescheduleHistory history={rescheduleHistory} />
        </div>
      </div>
      <RescheduleSessionDialog
        key={`r-${session.startsAt}`}
        session={session}
        open={dialog === 'reschedule'}
        onOpenChange={(o) => setDialog(o ? 'reschedule' : null)}
        onDone={setResult}
      />
      <CancelSessionDialog
        session={session}
        open={dialog === 'cancel'}
        onOpenChange={(o) => setDialog(o ? 'cancel' : null)}
        onDone={setResult}
      />
      <ChangeResultModal result={result} onClose={() => setResult(null)} />
    </>
  )
}
