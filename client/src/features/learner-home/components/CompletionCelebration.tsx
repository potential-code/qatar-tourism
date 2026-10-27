import { Link } from '@tanstack/react-router'
import { Award, PartyPopper } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { Button } from '@/components/ui/button'
import type { Journey } from '@/features/learning/types'
import { qatarDate } from '@/features/learning/utils/format'
import { PAGE_IMAGE } from '@/features/learning/utils/imagery'

const BURST = Array.from({ length: 14 }, (_, i) => i)

/**
 * Brief, accessible completion moment (brief §5). The burst plays once per browser session and
 * never under reduced motion; the message is announced politely and stays on the page.
 * Program B shows no certificate button.
 */
export function CompletionCelebration({ journey }: { journey: Journey }) {
  const reduce = useReducedMotion()
  const programme = journey.enrolment.programme
  const key = `qta.celebrated.${programme}`
  const [burst, setBurst] = useState(false)

  useEffect(() => {
    if (reduce) return
    try {
      if (window.sessionStorage.getItem(key)) return
      window.sessionStorage.setItem(key, '1')
    } catch {
      // Without storage the burst simply plays.
    }
    setBurst(true)
    const timer = window.setTimeout(() => setBurst(false), 1600)
    return () => window.clearTimeout(timer)
  }, [key, reduce])

  const { baseline, post, gainPoints } = journey.assessments
  const unitsDone = journey.items.filter(
    (i) => i.kind === 'course' && i.state === 'completed',
  ).length

  return (
    <PhotoPanel
      src={PAGE_IMAGE.completion.src}
      alt={PAGE_IMAGE.completion.alt}
      fade="start"
      className="rounded-xl shadow-md"
    >
      <div className="relative flex flex-col gap-5 p-6 md:p-10" aria-live="polite">
        {burst ? (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {BURST.map((i) => (
              <motion.span
                key={i}
                className={`absolute top-1/2 left-24 size-2 rounded-full ${i % 3 === 0 ? 'bg-teal-soft' : i % 3 === 1 ? 'bg-white' : 'bg-maroon-mist'}`}
                initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
                animate={{
                  opacity: 0,
                  x: Math.cos((i / BURST.length) * Math.PI * 2) * (120 + (i % 4) * 30),
                  y: Math.sin((i / BURST.length) * Math.PI * 2) * (80 + (i % 3) * 25),
                  scale: 1.2,
                }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>
        ) : null}
        <span className="grid size-12 place-items-center rounded-full bg-white/15 text-white backdrop-blur">
          <PartyPopper aria-hidden className="size-6" />
        </span>
        <div className="flex max-w-2xl flex-col gap-2">
          <h2 className="font-display text-3xl font-light text-white md:text-4xl">
            You have completed Program {programme}.
          </h2>
          <p className="text-white/85">
            {journey.enrolment.completedAt
              ? `Completed ${qatarDate(journey.enrolment.completedAt, 'long')}. `
              : ''}
            {unitsDone} units, {journey.practice.attempts.length} practice{' '}
            {journey.practice.attempts.length === 1 ? 'conversation' : 'conversations'}
            {baseline && post
              ? `, baseline ${baseline.score} to ${programme === 'A' ? 'final' : 'post'} ${post.score} (${(gainPoints ?? 0) >= 0 ? '+' : ''}${gainPoints} percentage points).`
              : '.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {programme === 'A' && journey.certificate ? (
            <Button asChild size="lg">
              <Link to="/learner/certificates/$code" params={{ code: journey.certificate.code }}>
                <Award aria-hidden /> View demonstration certificate
              </Link>
            </Button>
          ) : null}
          {programme === 'B' ? (
            <Button asChild size="lg" variant="glass">
              <Link to={'/programmes/A' as never}>
                Suggested next: Program A, Tourism Service Professional
              </Link>
            </Button>
          ) : null}
          <Button asChild size="lg" variant="glass">
            <Link to="/learner/progress" search={{ programme }}>
              Learning summary
            </Link>
          </Button>
        </div>
      </div>
    </PhotoPanel>
  )
}
