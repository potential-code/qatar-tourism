import { cancellationModalCopy, rescheduleModalCopy } from '@shared/content/notifications'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, Mail } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { spring } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { qatarRange } from '@/features/sessions/utils/qatar-time'

export type ChangeResult = {
  kind: 'reschedule' | 'cancel'
  sessionId: string
  eventId: string
  affected: number
  waitlistNotified: number
  replayed: boolean
  conflicts?: string[]
  alternatives?: {
    id: string
    title: string
    startsAt: string
    endsAt: string
    seatsRemaining: number
  }[]
}

/** The brief §11 demo modal, verbatim, with View affected learners and View notification log. */
export function ChangeResultModal({
  result,
  onClose,
}: {
  result: ChangeResult | null
  onClose: () => void
}) {
  const reduce = useReducedMotion()
  if (!result) return null
  const copy =
    result.kind === 'reschedule'
      ? rescheduleModalCopy(result.affected)
      : cancellationModalCopy(result.affected)
  const [headline, ...rest] = copy.split('. ')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="items-center gap-3 text-center">
          <motion.span
            initial={reduce ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring}
            className="flex size-14 items-center justify-center rounded-full bg-teal-mist text-teal"
          >
            <CheckCircle2 aria-hidden className="size-7" />
          </motion.span>
          <DialogTitle className="font-display text-2xl font-normal">{headline}.</DialogTitle>
          <DialogDescription className="text-ink-soft">{rest.join('. ')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 rounded-xl bg-sand p-4 text-sm text-ink-soft">
          <p className="flex items-center gap-2">
            <Mail aria-hidden className="size-4 text-teal" /> Event {result.eventId}
            <SimulatedTag label="Demo email, not sent" />
          </p>
          {result.waitlistNotified > 0 ? (
            <p>
              {result.waitlistNotified} waitlisted learners received a separate waitlist update.
            </p>
          ) : null}
          {result.replayed ? (
            <p>
              This change was already confirmed. Nothing new was sent, so no learner received a
              duplicate.
            </p>
          ) : null}
          {result.conflicts && result.conflicts.length > 0 ? (
            <p>
              Booking conflicts at the new time: {result.conflicts.join(', ')}. They can confirm or
              choose another eligible session in My sessions.
            </p>
          ) : null}
          {result.alternatives ? (
            result.alternatives.length > 0 ? (
              <div>
                <p className="font-medium text-ink">Alternatives offered to learners</p>
                <ul className="mt-1 list-disc ps-5">
                  {result.alternatives.map((a) => (
                    <li key={a.id}>
                      {a.title}, {qatarRange(a.startsAt, a.endsAt)}, {a.seatsRemaining} seats left
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>
                No other open sessions in this programme right now. Learners will see new sessions
                as they are published.
              </p>
            )
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:justify-center">
          <Button asChild variant="outline">
            <Link
              to="/trainer/attendance/$sessionId"
              params={{ sessionId: result.sessionId }}
              onClick={onClose}
            >
              View affected learners
            </Link>
          </Button>
          <Button asChild>
            <Link
              to="/trainer/sessions/notification-log"
              search={{ eventId: result.eventId }}
              onClick={onClose}
            >
              View notification log
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
