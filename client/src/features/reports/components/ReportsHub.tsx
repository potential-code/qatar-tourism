import type { ReportKey } from '@shared/schemas/admin-reports'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Award,
  BadgeCheck,
  BellRing,
  BookOpenCheck,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Globe,
  GraduationCap,
  Hourglass,
  LockKeyhole,
  type LucideIcon,
  Network,
  Presentation,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { DemoBadge, PageHeader } from '@/components/layout'
import { cardHover, Stagger, StaggerItem } from '@/components/motion'
import { overviewQuery } from '@/features/admin-dashboard/queries/analytics.queries'
import { count } from '@/features/admin-dashboard/utils/format'
import { REPORT_META, REPORT_ORDER } from '../utils/meta'

const ICONS: Record<string, LucideIcon> = {
  'program-a': GraduationCap,
  'program-b': Sparkles,
  'program-c': BookOpenCheck,
  learners: Users,
  trainers: Presentation,
  sessions: CalendarRange,
  assessments: ClipboardList,
  'assessment-results': ClipboardList,
  assignments: FileText,
  certification: Award,
  notifications: BellRing,
  cpd: Target,
  approvals: ClipboardCheck,
  'external-review': BadgeCheck,
  waitlist: Hourglass,
  'account-status': LockKeyhole,
  content: Globe,
  'crm-sync': Network,
}

/** Reports landing page: the ten reports of brief §12, each with a live headline count. */
export function ReportsHub() {
  const reduce = useReducedMotion()
  const { data } = useQuery(overviewQuery({}))
  const headline: Partial<Record<ReportKey, string>> = data
    ? {
        'program-a': `${count(data.distribution[0]?.enrolments ?? 0)} enrolments`,
        'program-b': `${count(data.distribution[1]?.enrolments ?? 0)} enrolments`,
        'program-c': `${count(data.distribution[2]?.enrolments ?? 0)} enrolments`,
        learners: `${count(data.kpis.uniqueLearners)} learners, ${count(data.kpis.enrolments)} enrolments`,
        trainers: '10 fictional trainers',
        sessions: `${count(data.kpis.upcomingSessions)} upcoming sessions`,
        assessments: `${count(data.improvement.overall.n)} paired pre/post`,
        assignments: `${count(data.kpis.pendingAssessments)} awaiting a mark`,
        certification: `${count(data.kpis.certificates)} A certificates`,
        notifications: 'Simulated, queued, sent and failed',
        cpd: 'Earned, pending and remaining',
        approvals: 'Enrolment and external requests',
        'external-review': 'Claimed and recognised CPD',
        waitlist: 'Waiting for a seat',
        'account-status': 'Locked and disabled',
        content: 'English and Arabic packages',
        'crm-sync': 'Simulated events and errors',
      }
    : {}

  return (
    <>
      <PageHeader
        title="Reports"
        description="Searchable, sortable reports with row details and permitted CSV export. Every count reconciles with the Dashboard."
        breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Reports' }]}
        actions={<DemoBadge compact />}
      />
      <Stagger className="grid grid-cols-3 gap-5 2xl:grid-cols-4">
        {REPORT_ORDER.map((key) => {
          const Icon = ICONS[key] ?? FileText
          return (
            <StaggerItem key={key}>
              <motion.div
                initial="rest"
                whileHover={reduce ? undefined : 'hover'}
                whileTap={reduce ? undefined : 'press'}
                variants={cardHover}
                className="h-full rounded-xl bg-card"
              >
                <Link
                  to="/admin/reports/$report"
                  params={{ report: key }}
                  className="group flex h-full flex-col gap-4 rounded-xl border p-6 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-teal-mist text-teal transition-colors group-hover:bg-teal group-hover:text-white">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="grid gap-1">
                    <h2 className="font-display text-xl text-ink">{REPORT_META[key].title}</h2>
                    <p className="text-sm text-muted-foreground">{REPORT_META[key].description}</p>
                  </div>
                  <p className="mt-auto text-sm font-medium text-teal-deep tabular-nums">
                    {headline[key] ?? ' '}
                  </p>
                </Link>
              </motion.div>
            </StaggerItem>
          )
        })}
      </Stagger>
    </>
  )
}
