import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, ChevronDown, Clock, Quote, ShieldCheck, Sparkles } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'
import { easeOut } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { ItemIcon } from '@/features/learning/components/ItemIcon'
import { minutesLabel } from '@/features/learning/utils/format'
import { KIND_LABEL } from '@/features/learning/utils/itemLink'
import { ApiError } from '@/lib/api-error'
import { useAcceptPath } from '../queries/ai-path.queries'
import type { Recommendation } from '../types'

/** Suggested units, rationale and time estimate (brief §9), with the two actions. */
export function RecommendationResult({ data }: { data: Recommendation }) {
  const reduce = useReducedMotion()
  const [details, setDetails] = useState(false)
  const accept = useAcceptPath()
  const navigate = useNavigate()
  const programme = data.programme

  const start = () =>
    accept.mutate(programme, {
      onSuccess: () => {
        toast.success('Your path is set. The first step is ready.')
        void navigate({ to: '/learner/learning', search: { programme } })
      },
      onError: (e) =>
        toast.error(e instanceof ApiError ? e.message : 'Could not save your path. Try again.'),
    })

  return (
    <div className="flex flex-col gap-6">
      <motion.figure
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="relative overflow-hidden rounded-xl bg-teal-deep p-6 text-white shadow-md md:p-8"
      >
        <Quote aria-hidden className="absolute end-6 top-6 size-16 text-white/10" />
        <figcaption className="mb-3 flex items-center gap-2 text-sm font-medium text-teal-mist">
          <Sparkles aria-hidden className="size-4" /> Why we recommend this
        </figcaption>
        <blockquote className="max-w-3xl font-display text-xl leading-relaxed font-light md:text-2xl">
          {data.rationale}
        </blockquote>
      </motion.figure>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="suggested-title" className="flex flex-col gap-4">
          <h2 id="suggested-title" className="font-display text-2xl font-normal text-ink">
            Suggested units
          </h2>
          <Stagger className="flex flex-col gap-2">
            {data.required.map((item, i) => (
              <StaggerItem key={`${item.kind}-${item.courseCode ?? i}`}>
                <div className="flex items-center gap-4 rounded-xl border bg-white p-4">
                  <span className="w-6 text-center font-display text-lg text-teal tabular-nums">
                    {i + 1}
                  </span>
                  <ItemIcon
                    kind={item.kind}
                    courseCode={item.courseCode}
                    className="text-muted-foreground"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.courseCode ? `${item.courseCode} · ` : ''}
                      {KIND_LABEL[item.kind] ?? 'Step'} · {minutesLabel(item.estimatedMinutes)}
                    </p>
                  </div>
                  <span className="hidden rounded-full bg-sand-deep px-2.5 py-1 text-xs font-medium text-ink sm:inline">
                    Required
                  </span>
                </div>
              </StaggerItem>
            ))}
            {data.extras.map((extra) => (
              <StaggerItem key={extra.courseCode}>
                <div className="flex items-center gap-4 rounded-xl border border-maroon/25 bg-maroon-mist/40 p-4">
                  <span className="w-6 text-center text-maroon">+</span>
                  <ItemIcon kind="course" courseCode={extra.courseCode} className="text-maroon" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{extra.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {extra.courseCode} · {extra.reason} · {minutesLabel(extra.minutes)}
                    </p>
                  </div>
                  <span className="hidden rounded-full bg-maroon-mist px-2.5 py-1 text-xs font-medium text-maroon-deep sm:inline">
                    Recommended extra
                  </span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-medium text-ink">
              <Clock aria-hidden className="size-4 text-teal" /> Time estimate
            </h2>
            <p className="font-display text-4xl font-light text-ink">
              {minutesLabel(data.estimate.totalMinutes)}
            </p>
            <p className="text-sm text-muted-foreground">
              {minutesLabel(data.estimate.requiredMinutes)} required
              {data.estimate.extraMinutes > 0
                ? ` and ${minutesLabel(data.estimate.extraMinutes)} recommended`
                : ''}
              {data.estimate.weeks
                ? `. About ${data.estimate.weeks} ${data.estimate.weeks === 1 ? 'week' : 'weeks'} at ${data.estimate.weeklyMinutes} minutes a week.`
                : '.'}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button size="lg" onClick={start} disabled={accept.isPending}>
              {data.accepted ? 'Continue this path' : 'Start this path'}{' '}
              <ArrowRight aria-hidden className="rtl:-scale-x-100" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              aria-expanded={details}
              onClick={() => setDetails((d) => !d)}
            >
              View recommendation details
              <ChevronDown
                aria-hidden
                className={details ? 'rotate-180 transition-transform' : 'transition-transform'}
              />
            </Button>
          </div>
        </aside>
      </div>

      <AnimatePresence initial={false}>
        {details ? (
          <motion.section
            key="details"
            aria-labelledby="details-title"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="overflow-hidden"
          >
            <div className="grid gap-4 rounded-xl border bg-white p-6 md:grid-cols-2">
              <h2
                id="details-title"
                className="font-display text-2xl font-normal text-ink md:col-span-2"
              >
                Recommendation details
              </h2>
              <dl className="flex flex-col gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Path</dt>
                  <dd className="text-ink">
                    {data.path?.name ?? 'Default path'}
                    {data.path?.version ? `, version ${data.path.version}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Assignment rule</dt>
                  <dd className="text-ink">
                    {data.override
                      ? `Administrator override: ${data.override}`
                      : data.rule
                        ? `${data.rule.reason}. ${data.rule.summary}.`
                        : 'Programme default'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Recorded reason</dt>
                  <dd className="text-ink">{data.assignmentReason ?? 'Not yet accepted'}</dd>
                </div>
              </dl>
              <div className="flex flex-col gap-3 text-sm">
                <p className="flex items-start gap-2 text-ink">
                  <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
                  Demo mode: this recommendation is produced by scripted, deterministic logic, not a
                  live AI model. It only uses administrator-approved courses and paths.
                </p>
                <p className="text-muted-foreground">
                  Recommended extras never replace required units, never bypass a prerequisite and
                  never change certificate requirements. An administrator can override the path with
                  a recorded reason.
                </p>
                <p className="text-muted-foreground">
                  Strengths: {data.strengths.map((s) => s.label).join(', ') || 'none yet'}. Gaps:{' '}
                  {data.gaps.map((g) => g.label).join(', ') || 'none'}.
                </p>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
