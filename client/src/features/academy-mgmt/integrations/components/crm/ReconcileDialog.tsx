import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { CrmEventView } from '@/services/crm/views'
import { type ReconcileChoice, reconcileCrmEvent } from '@/services/crm-mapping.service'
import { Field } from '../../../hub/components/Field'
import { OptionSelect } from '../../../hub/components/OptionSelect'
import { useIntegrationMutation } from '../../queries/integrations.queries'

const CHOICES = [
  { value: 'keep_lms', label: 'Keep the LMS value (the newer status)' },
  { value: 'apply_crm', label: 'Apply the CRM value (override the LMS)' },
]

/** Reconcile a conflict: keep the newer LMS value or deliberately apply the CRM value. */
export function ReconcileDialog({
  event,
  onClose,
}: {
  event: CrmEventView | null
  onClose: () => void
}) {
  const [choice, setChoice] = useState<ReconcileChoice>('keep_lms')
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (event) {
      setChoice('keep_lms')
      setReason('')
      setTouched(false)
    }
  }, [event])
  const mutation = useIntegrationMutation(
    () => reconcileCrmEvent(event?.eventId ?? '', choice, reason),
    'Conflict reconciled and recorded in the audit trail.',
  )
  const error = reason.trim().length < 5 ? 'Give a reason of at least 5 characters' : null

  return (
    <Dialog open={event !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">
            Reconcile {event?.eventId}
          </DialogTitle>
          <DialogDescription>{event?.error}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (!error) mutation.mutate(undefined, { onSuccess: onClose })
          }}
        >
          <Field id="reconcile-choice" label="Resolution">
            <OptionSelect
              id="reconcile-choice"
              value={choice}
              onChange={(v) => v && setChoice(v as ReconcileChoice)}
              options={CHOICES}
            />
          </Field>
          <Field
            id="reconcile-reason"
            label="Reason (recorded in the audit trail)"
            error={touched ? error : null}
          >
            <Textarea
              id="reconcile-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={touched && Boolean(error)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving' : 'Reconcile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
