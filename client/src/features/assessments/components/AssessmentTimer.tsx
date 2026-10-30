import { Clock, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { clock } from '../utils/format'

const FIVE_MINUTES = 300
const ONE_MINUTE = 60

/**
 * The time limit, always visible. The remaining time is text (mm:ss), and the warnings at five
 * minutes, one minute and zero are written out and announced politely once, so nothing depends on
 * colour or motion. The clock counts down from the server's seconds-left at load, so a reload
 * keeps the same deadline. `onExpire` fires once when it reaches zero.
 */
export function AssessmentTimer({
  secondsLeft,
  limitMinutes,
  onExpire,
}: {
  secondsLeft: number
  limitMinutes: number | null
  onExpire: () => void
}) {
  const { t } = useTranslation('assessments')
  const endsAt = useRef(Date.now() + secondsLeft * 1000)
  const [remaining, setRemaining] = useState(secondsLeft)
  const fired = useRef(false)

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 500)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (remaining === 0 && !fired.current) {
      fired.current = true
      onExpire()
    }
  }, [remaining, onExpire])

  const warning =
    remaining === 0
      ? t('timer.expired')
      : remaining <= ONE_MINUTE
        ? t('timer.oneMinute')
        : remaining <= FIVE_MINUTES
          ? t('timer.fiveMinutes')
          : null
  const urgent = remaining <= ONE_MINUTE

  return (
    <div className="flex flex-col gap-1">
      <div
        role="timer"
        aria-label={t('timer.label')}
        className={cn(
          'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-4 py-2.5',
          urgent ? 'border-destructive bg-destructive/5 text-destructive' : 'bg-card text-ink',
        )}
      >
        {urgent ? (
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
        ) : (
          <Clock aria-hidden className="size-4 shrink-0 text-teal" />
        )}
        <span className="text-sm">{t('timer.label')}</span>
        <span dir="ltr" className="font-display text-2xl tabular-nums">
          {clock(remaining)}
        </span>
        {limitMinutes !== null ? (
          <span className="text-xs text-muted-foreground">
            {t('timer.limit', { n: limitMinutes })}
          </span>
        ) : null}
        {warning ? <span className="text-sm font-medium">{warning}</span> : null}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {warning}
      </p>
    </div>
  )
}
