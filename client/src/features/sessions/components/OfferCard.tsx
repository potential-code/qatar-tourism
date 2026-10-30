import { BellRing, Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-error'
import { useSessionFormat } from '../hooks/useSessionFormat'
import { useRespondToOffer } from '../queries/sessions.queries'

/**
 * Milliseconds left until `expiresAt` on the demo clock: the service's `now` plus the real time
 * elapsed since that reading, refreshed every 30 seconds.
 */
function useRemaining(expiresAt: string, serviceNow: string): number {
  const [tick, setTick] = useState(0)
  const [anchor, setAnchor] = useState(() => ({ at: Date.now(), now: Date.parse(serviceNow) }))
  useEffect(() => {
    setAnchor({ at: Date.now(), now: Date.parse(serviceNow) })
  }, [serviceNow])
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  void tick
  return Date.parse(expiresAt) - (anchor.now + (Date.now() - anchor.at))
}

/**
 * A reserved seat the learner has been offered (SPEC §5). Accept confirms the booking; decline
 * passes the seat to the next learner. The countdown is a hint: the service decides, against the
 * demo clock, whether the offer is still open.
 */
export function OfferCard({
  rsvpId,
  expiresAt,
  sessionTitle,
  now,
}: {
  rsvpId: string
  expiresAt: string
  sessionTitle: string
  /** The demo clock reading that came with the booking data. */
  now: string
}) {
  const { t } = useTranslation('sessions')
  const format = useSessionFormat()
  const respond = useRespondToOffer()
  const left = useRemaining(expiresAt, now)
  const expired = left <= 0
  const hours = Math.floor(left / 3_600_000)
  const minutes = Math.max(1, Math.floor((left % 3_600_000) / 60_000))

  async function answer(decision: 'accept' | 'decline') {
    try {
      await respond.mutateAsync({ rsvpId, decision })
      toast.success(t(decision === 'accept' ? 'offer.accepted' : 'offer.declined'))
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('offer.failed'))
    }
  }

  return (
    <section
      aria-label={`${t('offer.title')}: ${sessionTitle}`}
      className="grid gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4"
    >
      <div className="flex items-start gap-3">
        <BellRing aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="grid gap-1">
          <h4 className="font-medium text-ink">{t('offer.title')}</h4>
          <p className="text-sm text-ink-soft">{t('offer.body')}</p>
          <p className="text-sm font-medium text-ink" aria-live="polite">
            {expired
              ? t('offer.expired')
              : hours > 0
                ? t('offer.hoursLeft', { hours, minutes })
                : t('offer.minutesLeft', { minutes })}
            <span className="font-normal text-muted-foreground">
              {' '}
              ({t('offer.expires', { when: format.dateTime(expiresAt) })})
            </span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => answer('accept')} disabled={respond.isPending || expired}>
          <Check aria-hidden /> {respond.isPending ? t('offer.working') : t('offer.accept')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => answer('decline')}
          disabled={respond.isPending || expired}
        >
          <X aria-hidden /> {t('offer.decline')}
        </Button>
      </div>
    </section>
  )
}
