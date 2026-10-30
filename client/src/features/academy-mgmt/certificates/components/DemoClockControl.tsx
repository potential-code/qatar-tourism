import { useQuery } from '@tanstack/react-query'
import { CalendarClock, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-error'
import { qatarDate } from '@/lib/format/qatar-time'
import { cn } from '@/lib/utils'
import { MAX_ADVANCE_DAYS } from '@/services/clock.service'
import { clockQuery, useAdvanceClock, useResetClock } from '../queries/certificates-admin.queries'

/**
 * Demo clock (presenter control, admin only, audited): moves time forward by whole days so
 * reminders, "expiring soon" and expiry can be shown without touching the device date. Advancing
 * runs the reminder sweep. Reusable wherever a presenter needs it.
 */
export function DemoClockControl({ className }: { className?: string }) {
  const clock = useQuery(clockQuery())
  const advance = useAdvanceClock()
  const reset = useResetClock()
  const [days, setDays] = useState('30')
  const parsed = Number(days)
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_ADVANCE_DAYS
  const busy = advance.isPending || reset.isPending

  const fail = (error: unknown) =>
    toast.error(error instanceof ApiError ? error.message : 'The demo clock could not be changed')

  return (
    <section
      aria-label="Demo clock"
      className={cn(
        'flex flex-wrap items-end gap-x-6 gap-y-3 rounded-xl border border-teal/20 bg-teal-mist px-4 py-3',
        className,
      )}
    >
      <div className="grid gap-0.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-teal-deep">
          <CalendarClock aria-hidden className="size-4" /> Demo clock
        </p>
        <p className="font-medium text-ink" aria-live="polite">
          {clock.data ? qatarDate(clock.data.now, { month: 'long' }) : '…'}
          <span className="ms-2 text-sm font-normal text-muted-foreground">
            {clock.data
              ? clock.data.offsetDays === 0
                ? 'not advanced'
                : `advanced ${clock.data.offsetDays} days`
              : ''}
          </span>
        </p>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!valid) return
          advance.mutate(parsed, {
            onSuccess: ({ clock: next, sweep }) =>
              toast.success(
                `Clock advanced ${parsed} day${parsed === 1 ? '' : 's'} to ${qatarDate(next.now, { month: 'long' })}. Reminders created: ${sweep.reminders}, expiry notices: ${sweep.expiries}.`,
              ),
            onError: fail,
          })
        }}
      >
        <div className="grid gap-1">
          <Label htmlFor="clock-days" className="text-xs">
            Advance by (days)
          </Label>
          <Input
            id="clock-days"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_ADVANCE_DAYS}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            aria-invalid={!valid}
            className="h-9 w-24 bg-white"
          />
        </div>
        <Button type="submit" size="sm" disabled={!valid || busy}>
          {advance.isPending ? 'Advancing' : 'Advance clock'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || clock.data?.offsetDays === 0}
          onClick={() =>
            reset.mutate(undefined, {
              onSuccess: () => toast.success('Demo clock reset to the real elapsed time.'),
              onError: fail,
            })
          }
        >
          <RotateCcw aria-hidden /> Reset clock
        </Button>
      </form>
      {!valid ? (
        <p role="alert" className="basis-full text-xs text-destructive">
          Enter a whole number of days from 1 to {MAX_ADVANCE_DAYS}.
        </p>
      ) : null}
    </section>
  )
}
