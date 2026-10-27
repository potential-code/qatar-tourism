import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api'
import { useCancelBooking, useRequestChange } from '../queries/sessions.queries'
import type { MyBooking } from '../types'
import { qatarRange } from '../utils/qatar-time'

/**
 * Cancel a booking. Outside 24 hours the learner cancels directly; inside 24 hours the same
 * dialog sends a request for admin review instead (brief §6 demo policy).
 */
export function BookingChangeDialog({
  booking,
  onOpenChange,
}: {
  booking: MyBooking | null
  onOpenChange: (open: boolean) => void
}) {
  const cancel = useCancelBooking()
  const request = useRequestChange()
  const [reason, setReason] = useState('')
  const [kind, setKind] = useState<'cancel' | 'reschedule'>('cancel')
  const [error, setError] = useState<string | null>(null)
  const selfService = booking?.selfServiceOpen ?? true
  const pending = cancel.isPending || request.isPending

  function close(open: boolean) {
    if (!open) {
      setReason('')
      setError(null)
    }
    onOpenChange(open)
  }

  async function submit() {
    if (!booking) return
    setError(null)
    if (!selfService && reason.trim().length < 5) {
      setError('Tell the Academy why you need the change (at least 5 characters).')
      return
    }
    try {
      if (selfService) {
        await cancel.mutateAsync({ rsvpId: booking.rsvpId, reason: reason.trim() || undefined })
        toast.success('Booking cancelled. The seat has been released.')
      } else {
        const result = await request.mutateAsync({
          rsvpId: booking.rsvpId,
          kind,
          reason: reason.trim(),
        })
        toast.success(
          result.alreadyRequested
            ? 'You have already asked for a change to this booking. The Academy will follow up.'
            : 'Request sent for admin review. Your booking stays in place until the Academy replies.',
        )
      }
      close(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The change could not be sent. Try again.')
    }
  }

  return (
    <Dialog open={Boolean(booking)} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle className="font-display text-2xl font-normal">
            {selfService ? 'Cancel this booking?' : 'Request a change'}
          </DialogTitle>
          <DialogDescription>
            {booking
              ? `${booking.session.title}, ${qatarRange(booking.session.startsAt, booking.session.endsAt)}.`
              : null}{' '}
            {selfService
              ? 'Your seat is released for another learner. You can book another session at any time.'
              : 'This session starts within 24 hours, so changes need admin review.'}
          </DialogDescription>
        </DialogHeader>
        {!selfService ? (
          <RadioGroup
            value={kind}
            onValueChange={(v) => setKind(v as 'cancel' | 'reschedule')}
            className="grid grid-cols-2 gap-2"
            aria-label="What do you need?"
          >
            {(['cancel', 'reschedule'] as const).map((value) => (
              <label
                key={value}
                htmlFor={`kind-${value}`}
                className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm has-[:checked]:border-teal"
              >
                <RadioGroupItem id={`kind-${value}`} value={value} />
                {value === 'cancel' ? 'Cancel my place' : 'Move to another time'}
              </label>
            ))}
          </RadioGroup>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="change-reason">
            {selfService ? 'Reason (optional)' : 'Reason for the request'}
          </Label>
          <Textarea
            id="change-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? 'change-error' : undefined}
          />
          {error ? (
            <p id="change-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => close(false)}>
            Keep booking
          </Button>
          <Button
            variant={selfService ? 'destructive' : 'default'}
            onClick={submit}
            disabled={pending}
          >
            {pending ? 'Sending' : selfService ? 'Cancel booking' : 'Send for admin review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
