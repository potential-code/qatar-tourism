import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { ApiError } from '@/lib/api-error'
import { useSessionFormat } from '../hooks/useSessionFormat'
import { useCancelBooking, useRequestChange } from '../queries/sessions.queries'
import type { MyBooking } from '../types'

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
  const { t } = useTranslation('sessions')
  const format = useSessionFormat()
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
      setError(t('cancelDialog.reasonShort'))
      return
    }
    try {
      if (selfService) {
        const result = await cancel.mutateAsync({
          rsvpId: booking.rsvpId,
          reason: reason.trim() || undefined,
        })
        toast.success(
          t(result.offersCreated > 0 ? 'cancelDialog.cancelledOffer' : 'cancelDialog.cancelled'),
        )
      } else {
        const result = await request.mutateAsync({
          rsvpId: booking.rsvpId,
          kind,
          reason: reason.trim(),
        })
        toast.success(
          t(result.alreadyRequested ? 'cancelDialog.already' : 'cancelDialog.requested'),
        )
      }
      close(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('cancelDialog.failed'))
    }
  }

  return (
    <Dialog open={Boolean(booking)} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle className="font-display text-2xl font-normal">
            {selfService ? t('cancelDialog.cancelTitle') : t('cancelDialog.requestTitle')}
          </DialogTitle>
          <DialogDescription>
            {booking
              ? `${booking.session.title}, ${format.range(booking.session.startsAt, booking.session.endsAt)}.`
              : null}{' '}
            {selfService ? t('cancelDialog.cancelBody') : t('cancelDialog.requestBody')}
          </DialogDescription>
        </DialogHeader>
        {!selfService ? (
          <RadioGroup
            value={kind}
            onValueChange={(v) => setKind(v as 'cancel' | 'reschedule')}
            className="grid grid-cols-2 gap-2"
            aria-label={t('cancelDialog.whatNeed')}
          >
            {(['cancel', 'reschedule'] as const).map((value) => (
              <label
                key={value}
                htmlFor={`kind-${value}`}
                className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm has-[:checked]:border-teal"
              >
                <RadioGroupItem id={`kind-${value}`} value={value} />
                {value === 'cancel' ? t('cancelDialog.cancelPlace') : t('cancelDialog.moveTime')}
              </label>
            ))}
          </RadioGroup>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="change-reason">
            {selfService ? t('cancelDialog.reasonOptional') : t('cancelDialog.reasonRequest')}
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
            {t('cancelDialog.keep')}
          </Button>
          <Button
            variant={selfService ? 'destructive' : 'default'}
            onClick={submit}
            disabled={pending}
          >
            {pending
              ? t('cancelDialog.sending')
              : selfService
                ? t('myBooking.cancel')
                : t('cancelDialog.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
