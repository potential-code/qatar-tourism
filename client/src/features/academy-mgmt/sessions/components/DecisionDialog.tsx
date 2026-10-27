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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ChangeRequest } from '../queries/sessions.queries'

/** Confirms an approve or decline, with an optional note that the learner also sees. */
export function DecisionDialog({
  request,
  decision,
  pending,
  onOpenChange,
  onConfirm,
}: {
  request: ChangeRequest | null
  decision: 'approved' | 'declined'
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (note: string | undefined) => void
}) {
  const [note, setNote] = useState('')
  useEffect(() => {
    if (request) setNote('')
  }, [request])
  const approve = decision === 'approved'
  return (
    <Dialog open={Boolean(request)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{approve ? 'Approve this request?' : 'Decline this request?'}</DialogTitle>
          <DialogDescription>
            {approve
              ? `${request?.learner.name}'s place on ${request?.session.title} is released and offered to the waitlist. They can then book another eligible session.`
              : `${request?.learner.name} keeps their place on ${request?.session.title}.`}{' '}
            They get an in-app notification and a simulated demo email.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="decision-note">Note to the learner (optional)</Label>
          <Textarea
            id="decision-note"
            value={note}
            maxLength={300}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={() => onConfirm(note.trim() || undefined)}>
            {approve ? 'Approve request' : 'Decline request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
