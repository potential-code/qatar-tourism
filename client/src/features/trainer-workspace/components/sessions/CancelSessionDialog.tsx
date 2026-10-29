import { Ban } from 'lucide-react'
import { useState } from 'react'
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
import type { SessionInfo } from '@/features/sessions/types'
import { newActionKey } from '@/features/sessions/utils/session-labels'
import { ApiError } from '@/lib/api-error'
import { qatarRange } from '@/lib/format/qatar-time'
import { useCancelSession } from '../../queries/trainer.queries'
import { AffectedSummary } from './AffectedSummary'
import type { ChangeResult } from './ChangeResultModal'

/** Cancel (brief §10): keeps history, releases seats, offers alternatives, never completes anyone. */
export function CancelSessionDialog({
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
  const cancel = useCancelSession()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(newActionKey)

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
    if (reason.trim().length < 5)
      return setError(
        'Give a reason of at least 5 characters. Learners see it in their notification.',
      )
    try {
      const result = await cancel.mutateAsync({
        id: session.id,
        reason: reason.trim(),
        idempotencyKey: key,
      })
      close(false)
      onDone({ kind: 'cancel', sessionId: session.id, conflicts: [], ...result })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'The connection failed. Press Cancel session again: learners will not be notified twice.',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle className="font-display text-2xl font-normal">
            Cancel this session?
          </DialogTitle>
          <DialogDescription>
            {session.title}, {qatarRange(session.startsAt, session.endsAt)}. The session and its
            history are kept. Every reservation is released and no learner is marked complete.
          </DialogDescription>
        </DialogHeader>
        <AffectedSummary sessionId={session.id} />
        <div className="grid gap-2">
          <Label htmlFor="cancel-reason">Reason</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => close(false)}>
            Keep session
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={cancel.isPending}>
            <Ban aria-hidden /> {cancel.isPending ? 'Cancelling' : 'Cancel session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
