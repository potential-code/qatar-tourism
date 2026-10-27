import { CheckCircle2, CircleDashed } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { CountUp } from '@/components/motion/CountUp'
import { easeOut } from '@/components/motion/variants'
import { qatarDateShort, qatarTime } from '@/lib/format/qatar-time'
import type { CatalogueData } from '../types'

/** Photo header: where the learner stands, and the numbers that matter for booking. */
export function SessionsHero({
  catalogue,
  upcomingCount,
  nextStart,
}: {
  catalogue: CatalogueData
  upcomingCount: number
  nextStart: string | null
}) {
  const reduce = useReducedMotion()
  const hasA = catalogue.programmes.some((p) => p.code === 'A')
  const open = catalogue.items.filter((s) => s.eligibility.state === 'bookable').length

  return (
    <PhotoPanel
      src="/images/official/tour-operator.jpg"
      alt="A tour guide talking with visitors in Doha"
      fade="start"
      priority
      className="rounded-xl"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-ink/30 md:hidden" />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: easeOut }}
        className="relative flex min-h-72 flex-col justify-end gap-6 p-6 md:min-h-80 md:p-10"
      >
        <div className="flex max-w-xl flex-col gap-3">
          <h1 className="font-display text-4xl leading-[1.05] font-light text-white md:text-5xl">
            My sessions
          </h1>
          <p className="text-white/85">
            {hasA
              ? 'Book a trainer-led session in person or live online, then manage it here. All times are Qatar time.'
              : 'Join optional live clinics with Academy trainers. All times are Qatar time.'}
          </p>
          {hasA ? (
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-md">
              {catalogue.level1.complete ? (
                <CheckCircle2 aria-hidden className="size-4" />
              ) : (
                <CircleDashed aria-hidden className="size-4" />
              )}
              {catalogue.level1.complete
                ? 'Level 1 complete. You are eligible to book.'
                : 'Finish Level 1 to unlock booking.'}
            </p>
          ) : null}
        </div>
        <dl className="grid max-w-xl grid-cols-3 gap-3 text-white">
          <div>
            <dt className="text-xs text-white/70">Your upcoming</dt>
            <dd className="font-display text-3xl font-light tabular-nums">
              <CountUp value={upcomingCount} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-white/70">Open to book</dt>
            <dd className="font-display text-3xl font-light tabular-nums">
              <CountUp value={open} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-white/70">Next session</dt>
            <dd className="font-display text-xl font-light md:text-2xl">
              {nextStart ? `${qatarDateShort(nextStart)}, ${qatarTime(nextStart)}` : 'None booked'}
            </dd>
          </div>
        </dl>
      </motion.div>
    </PhotoPanel>
  )
}
