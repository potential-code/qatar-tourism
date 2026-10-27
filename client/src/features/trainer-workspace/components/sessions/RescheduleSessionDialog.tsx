import { AlertTriangle, CalendarClock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SessionInfo } from '@/features/sessions/types'
import {
  qatarDateKey,
  qatarRange,
  qatarTime,
  qatarToIso,
} from '@/features/sessions/utils/qatar-time'
import { locationLabel, newActionKey } from '@/features/sessions/utils/session-labels'
import { ApiError } from '@/lib/api'
import { useRescheduleSession } from '../../queries/trainer.queries'
import { AffectedSummary } from './AffectedSummary'
import type { ChangeResult } from './ChangeResultModal'

/**
 * Reschedule (brief §10): new date and time plus a reason, with a venue or meeting-room change
 * highlighted. The idempotency key is fixed while the dialog is open, so pressing Confirm again
 * after a network error can never notify learners twice.
 */
export function RescheduleSessionDialog({
  session,
  open,
  onOpenChange,
  onDone,
}: {
  session: SessionInfo
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: (result: ChangeResult) => void
}) {
  const reschedule = useRescheduleSession()
  const inPerson = session.format === 'in_person'
  const [date, setDate] = useState(qatarDateKey(session.startsAt))
  const [start, setStart] = useState(qatarTime(session.startsAt))
  const [end, setEnd] = useState(qatarTime(session.endsAt))
  const [reason, setReason] = useState('')
  const original = inPerson ? locationLabel(session) : (session.meetingRef ?? '')
  const [place, setPlace] = useState(original)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(newActionKey)

  const proposed = useMemo(() => {
    try {
      const s = qatarToIso(date, start)
      const e = qatarToIso(date, end)
      return new Date(e) > new Date(s) ? { startsAt: s, endsAt: e } : null
    } catch {
      return null
    }
  }, [date, start, end])
  const unchanged = proposed?.startsAt === session.startsAt && proposed?.endsAt === session.endsAt
  const placeChanged = place.trim() !== original

  function close(next: boolean) {
    if (!next) {
      setReason('')
      setError(null)
      setKey(newActionKey())
    }
    onOpenChange(next)
  }

  async function confirm() {
    setError(null)
    if (!proposed) return setError('Choose an end time after the start time.')
    if (unchanged) return setError('Choose a new date or time.')
    if (reason.trim().length < 5)
      return setError(
        'Give a reason of at least 5 characters. Learners see it in their notification.',
      )
    try {
      const result = await reschedule.mutateAsync({
        id: session.id,
        ...proposed,
        reason: reason.trim(),
        ...(inPerson ? { venue: place.trim() || null } : { meetingRef: place.trim() || null }),
        idempotencyKey: key,
      })
      close(false)
      onDone({ kind: 'reschedule', sessionId: session.id, ...result })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'The connection failed. Press Confirm again: learners will not be notified twice.',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="text-start">
          <DialogTitle className="font-display text-2xl font-normal">
            Reschedule session
          </DialogTitle>
          <DialogDescription>
            Currently {qatarRange(session.startsAt, session.endsAt)}. The session keeps its ID and
            every booking.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2 sm:col-span-3">
            <Label htmlFor="rs-date">New date (Qatar)</Label>
            <Input
              id="rs-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rs-start">Start time</Label>
            <Input
              id="rs-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rs-end">End time</Label>
            <Input id="rs-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rs-tz">Timezone</Label>
            <Input id="rs-tz" value="Asia/Qatar" readOnly aria-readonly />
          </div>
          <div className="grid gap-2 sm:col-span-3">
            <Label htmlFor="rs-place">
              {inPerson ? 'Venue and room' : 'Demo meeting-room reference'}
            </Label>
            <Input id="rs-place" value={place} onChange={(e) => setPlace(e.target.value)} />
            {placeChanged ? (
              <p className="flex items-center gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
                <AlertTriangle aria-hidden className="size-4" />
                {inPerson ? 'Venue change' : 'Meeting room change'}: learners are told the new
                location.
              </p>
            ) : null}
          </div>
          <div className="grid gap-2 sm:col-span-3">
            <Label htmlFor="rs-reason">Reason</Label>
            <Textarea
              id="rs-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              placeholder="For example: the room is needed for an Academy briefing."
            />
          </div>
        </div>
        <AffectedSummary
          sessionId={session.id}
          startsAt={proposed?.startsAt}
          endsAt={proposed?.endsAt}
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => close(false)}>
            Keep current time
          </Button>
          <Button onClick={confirm} disabled={reschedule.isPending}>
            <CalendarClock aria-hidden />
            {reschedule.isPending ? 'Rescheduling' : 'Confirm reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
