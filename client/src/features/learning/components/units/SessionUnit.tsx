import type { ProgrammeCode } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** C06 is trainer-led: booking lives on My sessions (another portal page). */
export function SessionUnit({ programme }: { programme: ProgrammeCode }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border bg-white p-6 shadow-sm">
      <CalendarDays aria-hidden className="size-8 text-teal" />
      <h2 className="font-display text-2xl font-normal text-ink">Book a trainer-led session</h2>
      <p className="max-w-[60ch] text-muted-foreground">
        Role-play in pairs with a trainer, receive feedback and a scored demonstration. You need
        attendance and a session score of at least 70 to complete this step. Choose an eligible
        in-person or live-online session in Qatar time.
      </p>
      <Button asChild>
        <Link to={'/learner/sessions' as never} search={{ programme } as never}>
          Go to My sessions
        </Link>
      </Button>
    </div>
  )
}
