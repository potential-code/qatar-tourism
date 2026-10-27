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

/** Asks for the reason a finalised record changes (brief §10: reason plus audit entry). */
export function CorrectionDialog({
  open,
  description,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean
  description: string
  pending: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const valid = reason.trim().length >= 5
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-start">
          <DialogTitle className="font-display text-2xl font-normal">
            Correct a final record
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="correction-reason">Reason (recorded in the audit log)</Label>
          <Textarea
            id="correction-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Keep as is
          </Button>
          <Button onClick={() => onConfirm(reason.trim())} disabled={!valid || pending}>
            Save correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
