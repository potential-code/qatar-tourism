import { learnerDisplayId } from '@shared/utils/identity'
import { ArrowDown, ArrowUp, Hourglass, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-error'
import { ReasonDialog } from '../../hub/components/ReasonDialog'
import { StatusPill } from '../../hub/components/StatusPill'
import { humanise, qDateTime } from '../../hub/utils/format'
import { type SessionDetail, useMoveWaitlistEntry } from '../queries/sessions.queries'

const ATTEND = {
  attended: 'good',
  late: 'warn',
  absent: 'bad',
  excused: 'muted',
  pending: 'info',
} as const

type RosterEntry = SessionDetail['roster'][number]

/**
 * The session roster as three lists (SPEC §5): Confirmed, Offered (seat reserved, waiting for the
 * learner's answer) and Waitlist. Only administrators reach this screen, so only here can the
 * waitlist priority be changed, one place at a time, with a mandatory reason that is audited.
 */
export function AdminRoster({ roster }: { roster: RosterEntry[] }) {
  const move = useMoveWaitlistEntry()
  const [pending, setPending] = useState<{ entry: RosterEntry; direction: 'up' | 'down' } | null>(
    null,
  )
  const confirmed = roster.filter((r) => r.status === 'confirmed')
  const offered = roster.filter((r) => r.status === 'offered')
  const waiting = roster
    .filter((r) => r.status === 'waitlisted')
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0))
  const inactive = roster.filter((r) => ['cancelled', 'moved'].includes(r.status))

  return (
    <div className="grid gap-6">
      <section className="grid gap-2" aria-labelledby="roster-confirmed">
        <h3 id="roster-confirmed" className="flex items-center gap-2 text-sm font-medium text-ink">
          <Users className="size-4 text-teal" aria-hidden /> Confirmed roster ({confirmed.length})
        </h3>
        {confirmed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No confirmed bookings yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {confirmed.map((r) => (
              <li
                key={r.rsvpId}
                className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <Who entry={r} />
                {r.attendance ? (
                  <StatusPill tone={ATTEND[r.attendance]}>{humanise(r.attendance)}</StatusPill>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {offered.length > 0 ? (
        <section className="grid gap-2" aria-labelledby="roster-offered">
          <h3 id="roster-offered" className="text-sm font-medium text-ink">
            Offered, seat reserved ({offered.length})
          </h3>
          <ul className="divide-y rounded-xl border border-warning/40">
            {offered.map((r) => (
              <li
                key={r.rsvpId}
                className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <Who entry={r} />
                <StatusPill tone="warn">
                  Offer until {r.offerExpiresAt ? qDateTime(r.offerExpiresAt) : 'the deadline'}
                </StatusPill>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-2" aria-labelledby="roster-waitlist">
        <h3 id="roster-waitlist" className="flex items-center gap-2 text-sm font-medium text-ink">
          <Hourglass className="size-4 text-teal" aria-hidden /> Waitlist ({waiting.length})
        </h3>
        <p className="text-xs text-muted-foreground">
          Waitlisted learners are not booked and are never marked attending. Moving someone is an
          administrator override: a reason is required and it is audited.
        </p>
        {waiting.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody is waiting.</p>
        ) : (
          <ol className="divide-y rounded-xl border">
            {waiting.map((r, index) => (
              <li
                key={r.rsvpId}
                className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <span className="flex items-center gap-3">
                  <span className="w-6 text-center font-display text-lg tabular-nums">
                    {r.waitlistPosition}
                  </span>
                  <Who entry={r} />
                </span>
                <span className="flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Move ${r.name} up the waitlist`}
                    disabled={index === 0}
                    onClick={() => setPending({ entry: r, direction: 'up' })}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Move ${r.name} down the waitlist`}
                    disabled={index === waiting.length - 1}
                    onClick={() => setPending({ entry: r, direction: 'down' })}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {inactive.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {inactive.length} cancelled or moved booking(s) are kept in the audit history.
        </p>
      ) : null}

      <ReasonDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title="Override waitlist priority"
        description={
          pending
            ? `Move ${pending.entry.name} (${learnerDisplayId(pending.entry.learnerCode)}) one place ${pending.direction} the waitlist. Seat offers follow this order.`
            : ''
        }
        confirmLabel="Move learner"
        pending={move.isPending}
        onConfirm={async (reason) => {
          if (!pending) return
          try {
            await move.mutateAsync({
              rsvpId: pending.entry.rsvpId,
              direction: pending.direction,
              reason,
            })
            toast.success('Waitlist order changed', { description: 'Recorded in the audit trail.' })
            setPending(null)
          } catch (error) {
            toast.error(
              error instanceof ApiError ? error.message : 'The order could not be changed.',
            )
          }
        }}
      />
    </div>
  )
}

function Who({ entry }: { entry: RosterEntry }) {
  return (
    <span>
      <span className="font-medium">{entry.name}</span>{' '}
      <span className="text-xs text-muted-foreground tabular-nums">
        {learnerDisplayId(entry.learnerCode)}
      </span>
    </span>
  )
}
