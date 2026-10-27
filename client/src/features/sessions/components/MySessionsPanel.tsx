import { CalendarPlus, History } from 'lucide-react'
import { useState } from 'react'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { EmptyState } from '@/components/ui/empty-state'
import type { CatalogueSession, MyBooking, MySessionsData } from '../types'
import { BookingChangeDialog } from './BookingChangeDialog'
import { MyBookingCard } from './MyBookingCard'
import { RescheduleBookingDialog } from './RescheduleBookingDialog'

/** My sessions: upcoming bookings first, history folded underneath. */
export function MySessionsPanel({
  data,
  catalogue,
  onBrowse,
}: {
  data: MySessionsData
  catalogue: CatalogueSession[]
  onBrowse: () => void
}) {
  const [moving, setMoving] = useState<MyBooking | null>(null)
  const [changing, setChanging] = useState<MyBooking | null>(null)
  const now = new Date(data.now)
  const isUpcoming = (b: MyBooking) =>
    new Date(b.session.endsAt) > now &&
    b.session.status !== 'cancelled' &&
    (b.status === 'confirmed' || b.status === 'waitlisted')
  const upcoming = data.items
    .filter(isUpcoming)
    .sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt))
  const history = data.items.filter((b) => !isUpcoming(b))

  return (
    <section className="flex flex-col gap-4" aria-labelledby="my-sessions-heading">
      <h2
        id="my-sessions-heading"
        className="font-display text-2xl font-light text-ink md:text-3xl"
      >
        Your bookings
      </h2>
      {upcoming.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/60">
          <EmptyState
            icon={CalendarPlus}
            title="No upcoming sessions yet"
            description="Book a session below. Your confirmed seat appears here straight away."
            action={<Button onClick={onBrowse}>Browse sessions</Button>}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {upcoming.map((b) => (
            <Reveal key={b.rsvpId}>
              <MyBookingCard
                booking={b}
                upcoming
                onReschedule={() => setMoving(b)}
                onChange={() => setChanging(b)}
              />
            </Reveal>
          ))}
        </div>
      )}
      {history.length > 0 ? (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-fit">
              <History aria-hidden /> Booking history ({history.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 flex flex-col gap-3">
            {history.map((b) => (
              <MyBookingCard
                key={b.rsvpId}
                booking={b}
                upcoming={false}
                onReschedule={() => undefined}
                onChange={() => undefined}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : null}
      <RescheduleBookingDialog
        booking={moving}
        catalogue={catalogue}
        onOpenChange={(o) => !o && setMoving(null)}
      />
      <BookingChangeDialog booking={changing} onOpenChange={(o) => !o && setChanging(null)} />
    </section>
  )
}
