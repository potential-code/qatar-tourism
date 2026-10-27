import { Link } from '@tanstack/react-router'
import { ArrowRight, MapPin, MonitorPlay } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { easeOut } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { TrainerAvatar } from '@/features/sessions/components/TrainerAvatar'
import { FORMAT_LABEL, locationLabel } from '@/features/sessions/utils/session-labels'
import { qatarDateShort, qatarTime, relativeTo } from '@/lib/format/qatar-time'
import type { OverviewData } from '../../types'
import { SeatMeter } from '../shared/SeatMeter'

function greeting(nowIso: string) {
  const hour = Number(qatarTime(nowIso).slice(0, 2))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

/** Greeting over photography, with the next session lifted out as a glass card. */
export function OverviewHero({ data }: { data: OverviewData }) {
  const reduce = useReducedMotion()
  const next = data.upcoming[0]
  const first = data.profile.fullName.split(' ')[0]
  const Format = next?.format === 'online' ? MonitorPlay : MapPin

  return (
    <PhotoPanel
      src="/images/official/katara-towers.jpg"
      alt="Katara Towers at dusk on the Lusail waterfront"
      fade="start"
      priority
      className="rounded-xl"
    >
      {/* The side fade alone leaves bright sky behind text on narrow screens. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-ink/35 lg:hidden" />
      <div className="relative grid min-h-80 gap-8 p-6 md:p-10 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeOut }}
          className="flex flex-col gap-4 self-end"
        >
          <div className="flex items-center gap-3">
            <TrainerAvatar
              name={data.profile.fullName}
              avatarPath={data.profile.avatarPath}
              className="size-12 ring-2 ring-white/40"
            />
            <p className="text-sm text-white/80">
              {data.profile.headline}
              <span className="block text-xs text-white/60">Trainer {data.profile.code}</span>
            </p>
          </div>
          <h1 className="font-display text-4xl leading-[1.05] font-light text-white md:text-5xl">
            {greeting(data.now)}, {first}
          </h1>
          <p className="max-w-lg text-white/85">
            {data.stats.upcomingSessions} upcoming sessions with {data.stats.seatsBooked} learners
            booked.{' '}
            {data.stats.attendanceOutstanding > 0
              ? `${data.stats.attendanceOutstanding} attendance records are waiting for you.`
              : 'Attendance is up to date.'}
          </p>
        </motion.div>
        {next ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: easeOut }}
            className="rounded-xl border border-white/25 bg-ink/35 p-5 text-white shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-white/75">
              <span>Next session</span>
              <span className="rounded-full bg-white/15 px-2 py-0.5">
                {relativeTo(next.startsAt, data.now)}
              </span>
            </div>
            <p className="mt-2 font-display text-2xl leading-snug">{next.title}</p>
            <p className="mt-1 text-sm text-white/85">
              {qatarDateShort(next.startsAt)}, {qatarTime(next.startsAt)} Qatar time
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/80">
              <Format aria-hidden className="size-4" />
              {FORMAT_LABEL[next.format]}, {locationLabel(next)}
            </p>
            <SeatMeter
              confirmed={next.confirmed}
              capacity={next.capacity}
              waitlisted={next.waitlisted}
              tone="white"
              className="mt-4"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="glass">
                <Link to="/trainer/sessions/$sessionId" params={{ sessionId: next.id }}>
                  Manage session <ArrowRight aria-hidden className="rtl:-scale-x-100" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="glass">
                <Link to="/trainer/attendance/$sessionId" params={{ sessionId: next.id }}>
                  Roster
                </Link>
              </Button>
            </div>
          </motion.div>
        ) : null}
      </div>
    </PhotoPanel>
  )
}
