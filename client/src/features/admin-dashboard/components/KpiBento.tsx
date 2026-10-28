import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import {
  Award,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  type LucideIcon,
  UserCheck,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { StatCard } from '@/components/data'
import { CountUp, Stagger, StaggerItem, spring } from '@/components/motion'
import { Skeleton } from '@/components/ui/skeleton'
import type { Overview } from '../queries/analytics.queries'
import { count, percent } from '../utils/format'
import { HeroTrend } from './charts/HeroTrend'

type Kpi = {
  key: keyof Overview['kpis']
  icon: LucideIcon
  tone: 'teal' | 'maroon' | 'neutral'
  report: string
  extra?: Record<string, string>
  description: (o: Overview) => string
  suffix?: string
}

/** The six cards beside the hero. Each opens its filtered report (brief §12). */
const KPIS: Kpi[] = [
  {
    key: 'activeLearners',
    icon: UserCheck,
    tone: 'teal',
    report: 'learners',
    extra: { view: 'active' },
    description: () => 'Learning activity in the last 30 days',
  },
  {
    key: 'enrolments',
    icon: BookOpen,
    tone: 'teal',
    report: 'learners',
    description: (o) => `${count(o.kpis.uniqueLearners)} unique learners`,
  },
  {
    key: 'completions',
    icon: GraduationCap,
    tone: 'maroon',
    report: 'learners',
    extra: { rowStatus: 'Completed' },
    description: (o) => `${percent(o.kpis.completionRate)} completion rate`,
  },
  {
    key: 'pendingAssessments',
    icon: ClipboardCheck,
    tone: 'maroon',
    report: 'assignments',
    extra: { view: 'pending' },
    description: () => 'Submissions awaiting a trainer mark',
  },
  {
    key: 'upcomingSessions',
    icon: CalendarClock,
    tone: 'neutral',
    report: 'sessions',
    extra: { view: 'upcoming' },
    description: () => 'Published or full, still ahead',
  },
  {
    key: 'certificates',
    icon: Award,
    tone: 'neutral',
    report: 'certification',
    description: () => 'Program A only. B and C do not certify',
  },
]

export function KpiBento({
  data,
  isLoading,
  openReport,
}: {
  data: Overview | undefined
  isLoading: boolean
  openReport: (report: string, extra?: Record<string, string>) => void
}) {
  return (
    <Stagger className="grid grid-cols-5 grid-rows-2 gap-4">
      <StaggerItem className="col-span-2 row-span-2">
        <HeroCard data={data} isLoading={isLoading} onOpen={() => openReport('learners')} />
      </StaggerItem>
      {KPIS.map((kpi) => (
        <StaggerItem key={kpi.key}>
          <StatCard
            label={data?.definitions[kpi.key].label ?? ''}
            value={data?.kpis[kpi.key] ?? 0}
            icon={kpi.icon}
            tone={kpi.tone}
            isLoading={isLoading || !data}
            description={data ? kpi.description(data) : undefined}
            onClick={() => openReport(kpi.report, kpi.extra)}
            className="h-full"
          />
        </StaggerItem>
      ))}
    </Stagger>
  )
}

function HeroCard({
  data,
  isLoading,
  onOpen,
}: {
  data: Overview | undefined
  isLoading: boolean
  onOpen: () => void
}) {
  const reduce = useReducedMotion()
  const total = data?.kpis.enrolments ?? 0
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileHover={reduce ? undefined : { y: -4 }}
      whileTap={reduce ? undefined : { scale: 0.99 }}
      transition={spring}
      // Card button: a concise name that starts with the visible title (WCAG 2.5.3).
      data-a11y-card
      aria-label="Unique learners: open the All learners report"
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-teal-deep p-7 text-start text-white shadow-[var(--qt-shadow-lg)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,var(--qt-teal)_0%,transparent_60%),radial-gradient(90%_70%_at_0%_100%,rgb(0_0_0/0.25)_0%,transparent_70%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-px rounded-[11px] shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]"
      />
      <div className="relative flex items-start justify-between">
        <p className="text-sm font-medium text-white/80">
          {data?.definitions.uniqueLearners.label ?? 'Unique learners'}
        </p>
        <span className="rounded-full border border-white/25 px-2.5 py-0.5 text-[11px] text-white/80">
          Distinct learner IDs
        </span>
      </div>
      <div className="relative mt-3 font-display text-6xl leading-none font-light tabular-nums">
        {isLoading || !data ? (
          <Skeleton className="h-14 w-40 bg-white/20" />
        ) : (
          <CountUp value={data.kpis.uniqueLearners} />
        )}
      </div>
      <p className="relative mt-2 text-sm text-white/75">
        {data ? `across ${count(total)} programme enrolments` : ' '}
      </p>

      <div className="relative mt-auto pt-6">
        <p className="mb-1 text-[11px] text-white/60">New registrations per week, last 13 weeks</p>
        {data ? <HeroTrend data={data.trend} /> : <div className="h-24" />}
        <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          {data?.distribution.map((d, index) => (
            <motion.span
              key={d.programme}
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.3 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: `${total ? (d.enrolments / total) * 100 : 0}%`, originX: 0 }}
              className={['bg-white', 'bg-teal-soft', 'bg-white/40'][index] ?? 'bg-white/40'}
            />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/80">
          {data?.distribution.map((d, index) => (
            <li key={d.programme} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={`size-2 rounded-full ${['bg-white', 'bg-teal-soft', 'bg-white/40'][index]}`}
              />
              {PROGRAMME_LABELS[d.programme]}
              <span className="font-medium tabular-nums text-white">{count(d.enrolments)}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.button>
  )
}
