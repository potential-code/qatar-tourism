import { Link } from '@tanstack/react-router'
import { MapPin, MonitorPlay } from 'lucide-react'
import { PersonAvatar } from '@/components/data/PersonAvatar'
import { cn } from '@/lib/utils'
import type { PublicSession } from '../queries/programmes.queries'
import { dateChip, formatLabel, QATAR_TIME_LABEL, sessionTimeRange } from '../utils/format'
import { SeatsMeter } from './SeatsMeter'

const ACCENT = {
  teal: 'bg-teal-mist text-teal-deep',
  /* Homepage tones: solid brand colours, raised. */
  'solid-teal': 'w-[4.5rem] rounded-xl bg-grad-teal text-white shadow-glow',
  'solid-maroon':
    'w-[4.5rem] rounded-xl bg-grad-maroon text-white shadow-[var(--qt-shadow-maroon)]',
  'solid-sky': 'w-[4.5rem] rounded-xl bg-sky text-teal-night shadow-md',
  'solid-gold': 'w-[4.5rem] rounded-xl bg-gold text-teal-night shadow-md',
} as const

/** Homepage date blocks tip and grow when their ticket is hovered (ticket carries `group`). */
const SOLID_MOTION =
  'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-3 group-hover:scale-110'

export type SessionAccent = keyof typeof ACCENT

/** Each ticket carries its accent: the date block colour, a matching wash and hover glow. */
const TICKET_TONES: { accent: SessionAccent; wash: string }[] = [
  {
    accent: 'solid-teal',
    wash: 'bg-gradient-to-br from-teal-mist via-white to-white hover:shadow-[0_30px_60px_-26px_rgb(0_98_123/0.5)]',
  },
  {
    accent: 'solid-maroon',
    wash: 'bg-gradient-to-br from-rose-mist via-white to-white hover:shadow-[0_30px_60px_-26px_rgb(125_0_42/0.45)]',
  },
  {
    accent: 'solid-sky',
    wash: 'bg-gradient-to-br from-sky-mist via-white to-white hover:shadow-[0_30px_60px_-26px_rgb(116_174_209/0.7)]',
  },
  {
    accent: 'solid-gold',
    wash: 'bg-gradient-to-br from-gold-soft/70 via-white to-white hover:shadow-[0_30px_60px_-26px_rgb(205_185_126/0.8)]',
  },
]

/** Ticket tone for the nth ticket in a list (cycles teal, maroon, sky, gold). */
export function ticketTone(index: number) {
  return (
    TICKET_TONES[index % TICKET_TONES.length] ?? (TICKET_TONES[0] as (typeof TICKET_TONES)[number])
  )
}

/** Classes for a showcase ticket: raised, washed in its tone, lifting on hover. */
export const SHOWCASE_TICKET =
  'group h-full rounded-2xl shadow-card ring-1 ring-ink/5 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 motion-reduce:hover:transform-none'

/**
 * One upcoming session (brief §2): format, Qatar time, trainer, capacity and the booking action.
 * `action` is the sign-in-to-book link, chosen by the caller from the visitor's session.
 */
export function SessionTicket({
  session,
  action,
  accent = 'teal',
  className,
}: {
  session: PublicSession
  action: React.ReactNode
  /** Date block colour; the homepage cycles the solid brand tones. */
  accent?: SessionAccent
  className?: string
}) {
  const chip = dateChip(session.startsAt)
  const FormatIcon = session.format === 'in_person' ? MapPin : MonitorPlay
  const optional = !session.isCompletionGate
  return (
    <article
      className={cn(
        'grid gap-5 rounded-xl bg-white p-5 ring-1 ring-ink/5 transition-shadow duration-300 hover:shadow-md sm:grid-cols-[auto_1fr] md:p-6',
        className,
      )}
    >
      <div
        className={cn(
          'flex w-16 flex-col items-center justify-center rounded-lg py-3',
          ACCENT[accent],
          accent !== 'teal' && SOLID_MOTION,
        )}
      >
        <span className="text-xs uppercase">{chip.weekday}</span>
        <span className="font-display text-3xl leading-none">{chip.day}</span>
        <span className="text-xs">{chip.month}</span>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-medium text-teal">Program {session.programmeCode}</span>
            <span className="text-muted-foreground">
              {optional
                ? session.programmeCode === 'C'
                  ? 'Sample clinic'
                  : 'Optional clinic'
                : (session.level ?? 'Trainer-led session')}
            </span>
          </div>
          <h3 className="font-display text-xl text-ink leading-snug">{session.title}</h3>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink/80 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <FormatIcon aria-hidden className="size-4 text-teal" />
              {formatLabel(session.format)}
              {session.format === 'in_person' && session.venue
                ? `, ${session.venue}${session.room ? ` ${session.room}` : ''}`
                : ''}
            </span>
            <span>
              {sessionTimeRange(session.startsAt, session.endsAt)}{' '}
              <span className="text-muted-foreground">{QATAR_TIME_LABEL}</span>
            </span>
          </p>
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-3">
            <Link
              to="/trainers/$code"
              params={{ code: session.trainerCode }}
              className="inline-flex w-fit items-center gap-2.5 rounded-full text-sm hover:text-teal focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <PersonAvatar
                name={session.trainerName}
                src={session.trainerAvatar}
                tone="teal"
                className="size-8 text-xs"
              />
              <span>
                <span className="font-medium">{session.trainerName}</span>
                <span className="text-muted-foreground">, {session.trainerHeadline}</span>
              </span>
            </Link>
            <SeatsMeter
              capacity={session.capacity}
              booked={session.booked}
              waitlisted={session.waitlisted}
              className="max-w-xs"
            />
          </div>
          {action}
        </div>
      </div>
    </article>
  )
}
