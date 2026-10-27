import { type ReactNode, useEffect, useState } from 'react'
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
import { Field } from './Field'

/**
 * Every audited change that needs a reason goes through this dialog (brief §11: audit events
 * capture the reason where applicable). The reason is required, at least 5 characters.
 */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
  destructive,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: (reason: string) => void
  pending?: boolean
  destructive?: boolean
  children?: ReactNode
}) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (open) {
      setReason('')
      setTouched(false)
    }
  }, [open])
  const error = reason.trim().length < 5 ? 'Give a reason of at least 5 characters' : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            setTouched(true)
            if (!error) onConfirm(reason.trim())
          }}
        >
          {children}
          <Field
            id="audit-reason"
            label="Reason (recorded in the audit trail)"
            error={touched ? error : null}
          >
            <Textarea
              id="audit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="rounded-lg"
              aria-invalid={touched && Boolean(error)}
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={destructive ? 'destructive' : 'default'}
              disabled={pending}
            >
              {pending ? 'Saving' : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
