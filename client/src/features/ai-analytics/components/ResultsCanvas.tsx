import type { AnalyticsAnswer } from '@shared/schemas/admin-ai'
import { useNavigate } from '@tanstack/react-router'
import { ArrowUpRight, BookOpen, CalendarClock, Clock, Filter, Users } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { count, qatarDateTime } from '@/features/admin-dashboard/utils/format'
import { AnswerChart } from './AnswerChart'
import { AnswerTable } from './AnswerTable'
import { PromptGrid } from './PromptGrid'

/** Results canvas: the selected answer's chart, table and every brief §13 disclosure. */
export function ResultsCanvas({
  answer,
  prompts,
  onAsk,
  pending,
}: {
  answer: AnalyticsAnswer | null
  prompts: string[]
  onAsk: (prompt: string) => void
  pending: boolean
}) {
  const reduce = useReducedMotion()
  const navigate = useNavigate()

  return (
    <section
      aria-label="Results canvas"
      className="flex min-h-0 flex-col rounded-xl border bg-card shadow-[var(--qt-shadow-sm)]"
    >
      <AnimatePresence mode="wait">
        {answer ? (
          <motion.div
            key={answer.id}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-6 p-7"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">"{answer.question}"</p>
                <h2 className="mt-1 font-display text-2xl font-normal text-ink">{answer.title}</h2>
              </div>
              {answer.records ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate({
                      to: '/admin/reports/$report',
                      params: { report: answer.records?.report ?? 'learners' },
                      search: answer.records?.search ?? {},
                    } as never)
                  }
                >
                  View underlying records <ArrowUpRight aria-hidden />
                </Button>
              ) : null}
            </header>

            <p className="max-w-[68ch] leading-relaxed text-ink">{answer.prose}</p>

            {answer.chart ? (
              <motion.div
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="rounded-xl border bg-white p-4"
              >
                <AnswerChart chart={answer.chart} />
              </motion.div>
            ) : null}

            {answer.table ? (
              <AnswerTable table={answer.table} caption={`${answer.title} data`} />
            ) : null}

            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border text-sm">
              <Meta icon={Filter} term="Applied filters">
                {answer.filters.length
                  ? answer.filters.map((f) => `${f.label}: ${f.value}`).join(' · ')
                  : 'None. The whole Academy.'}
              </Meta>
              <Meta icon={Users} term="Sample size">
                {answer.sampleSize
                  ? `${count(answer.sampleSize.value)} ${answer.sampleSize.label.toLowerCase()}`
                  : 'Not applicable'}
              </Meta>
              <Meta icon={BookOpen} term="Metric definition">
                {answer.definition ?? 'Not applicable'}
              </Meta>
              <Meta icon={CalendarClock} term="Period">
                {answer.period ?? 'Not applicable'}
              </Meta>
              <Meta icon={Clock} term="Generated" wide>
                {qatarDateTime(answer.generatedAt)} Qatar time. Computed read-only from the demo
                records; the same governed metrics as the Dashboard and Reports.
              </Meta>
            </dl>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-6 p-7"
          >
            <div>
              <h2 className="font-display text-2xl font-normal text-ink">Results canvas</h2>
              <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
                Answers appear here with a chart, the data table, the filters applied, the metric
                definition, the period, the sample size and a link to the underlying records. Start
                with one of the supported questions.
              </p>
            </div>
            <PromptGrid prompts={prompts} onAsk={onAsk} disabled={pending} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function Meta({
  icon: Icon,
  term,
  children,
  wide,
}: {
  icon: typeof Filter
  term: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className={wide ? 'col-span-2 bg-white p-4' : 'bg-white p-4'}>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 text-teal" aria-hidden />
        {term}
      </dt>
      <dd className="mt-1.5 leading-relaxed text-ink">{children}</dd>
    </div>
  )
}
