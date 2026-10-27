import { Link } from '@tanstack/react-router'
import { ArrowRight, History } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { ProgressRing } from '@/components/data/ProgressRing'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { easeOut } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { ItemIcon } from '@/features/learning/components/ItemIcon'
import type { Journey } from '@/features/learning/types'
import { minutesLabel } from '@/features/learning/utils/format'
import { itemLink, KIND_LABEL } from '@/features/learning/utils/itemLink'

/** The one thing to do next (brief §5), lifted over the hero, with progress at a glance. */
export function NextActionCard({ journey }: { journey: Journey }) {
  const reduce = useReducedMotion()
  const programme = journey.enrolment.programme
  const next = journey.nextAction
  const item = next ? journey.items.find((i) => i.id === next.itemId) : undefined
  const required = journey.items.filter((i) => i.required)
  const done = required.filter((i) => i.state === 'completed').length
  const link = item ? itemLink(item, programme) : null
  const resumeItem = journey.resume
    ? journey.items.find((i) => i.courseCode === journey.resume?.courseCode)
    : undefined
  const showResume = resumeItem && resumeItem.id !== item?.id

  return (
    <motion.section
      aria-labelledby="next-action-title"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: easeOut, delay: 0.15 }}
      className="relative z-10 mx-3 -mt-16 grid md:-mt-20 gap-6 rounded-xl border bg-white/95 p-5 shadow-lg backdrop-blur md:mx-8 lg:grid-cols-[1fr_auto] lg:items-center md:p-7"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-sm font-medium text-maroon">Next action</p>
        {item && next && link ? (
          <>
            <h2
              id="next-action-title"
              className="font-display text-2xl leading-snug font-normal text-ink md:text-3xl"
            >
              {next.label}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {item.kind === 'ai_practice' ? null : (
                <span className="inline-flex items-center gap-1.5">
                  <ItemIcon kind={item.kind} courseCode={item.courseCode} className="text-teal" />
                  {KIND_LABEL[item.kind] ?? 'Step'}
                </span>
              )}
              <span>About {minutesLabel(item.estimatedMinutes)}</span>
              <span>{item.stage}</span>
              {item.kind === 'ai_practice' ? <SimulatedTag label="Simulated AI practice" /> : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={link.to as never} search={link.search as never}>
                  {item.state === 'in_progress' ? 'Continue' : 'Start'}
                  <ArrowRight aria-hidden className="rtl:-scale-x-100" />
                </Link>
              </Button>
              {showResume && resumeItem ? (
                <Button asChild variant="outline" size="lg">
                  <Link
                    to={itemLink(resumeItem, programme).to as never}
                    search={itemLink(resumeItem, programme).search as never}
                  >
                    <History aria-hidden /> Resume {resumeItem.title}
                  </Link>
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <h2
              id="next-action-title"
              className="font-display text-2xl font-normal text-ink md:text-3xl"
            >
              {journey.complete ? 'Every required step is complete' : 'Waiting on your trainer'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {journey.complete
                ? 'Your learning summary and results are below.'
                : 'Your submission is with a trainer. You will see their feedback here as soon as it is marked.'}
            </p>
          </>
        )}
      </div>
      <div className="flex items-center gap-4 border-t pt-5 lg:flex-col lg:border-t-0 lg:border-s lg:ps-8 lg:pt-0">
        <ProgressRing
          value={journey.enrolment.progressPercent}
          size={92}
          strokeWidth={8}
          ariaLabel={`Programme progress ${journey.enrolment.progressPercent} percent`}
        >
          <span className="font-display text-2xl text-ink tabular-nums">
            {journey.enrolment.progressPercent}%
          </span>
        </ProgressRing>
        <p className="text-sm text-muted-foreground lg:text-center">
          {done} of {required.length} required steps
        </p>
      </div>
    </motion.section>
  )
}
