import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { impactQuery } from '../../queries/trainer.queries'

/** Shown before confirming (brief §10): how many active RSVPs will be told, and any clashes. */
export function AffectedSummary({
  sessionId,
  startsAt,
  endsAt,
}: {
  sessionId: string
  startsAt?: string
  endsAt?: string
}) {
  const impact = useQuery(impactQuery(sessionId, startsAt, endsAt))
  if (impact.isPending) return <Skeleton className="h-16 rounded-xl" />
  if (impact.isError)
    return (
      <p className="text-sm text-destructive">
        The affected learners could not be counted. Try again.
      </p>
    )
  const { confirmed, waitlisted, conflicts } = impact.data
  return (
    <div
      className="flex gap-3 rounded-xl border border-maroon/15 bg-maroon-mist/60 p-4 text-sm text-maroon-deep"
      aria-live="polite"
    >
      <Users aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="grid gap-1">
        <p>
          <span className="font-display text-2xl tabular-nums">{confirmed}</span> registered
          learners will receive an in-app notification and a simulated demo email.
          {waitlisted > 0
            ? ` ${waitlisted} waitlisted learners get a separate waitlist update.`
            : ''}
        </p>
        {conflicts.length > 0 ? (
          <p>
            {conflicts.length} learners have another booking at the new time ({conflicts.join(', ')}
            ). They keep their place and can choose another session.
          </p>
        ) : null}
      </div>
    </div>
  )
}
