import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Award,
  BookOpenText,
  CalendarRange,
  ClipboardCheck,
  FolderLock,
  GraduationCap,
  Inbox,
  type LucideIcon,
  Plug,
  Route,
  ScrollText,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { CountUp } from '@/components/motion/CountUp'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'
import { cardHover } from '@/components/motion/variants'
import { cn } from '@/lib/utils'
import { hubOverviewQuery } from '../queries/governance.queries'
import { ManagePage } from './ManagePage'
import { CardsSkeleton, ErrorPanel } from './QueryStates'

type Counts = {
  users: number
  learners: number
  trainers: number
  programmes: number
  paths: number
  courses: number
  sessions: number
  assessments: number
  auditEvents: number
  pendingApprovals: number
  contentPackages: number
  credentials: number
}

type Area = {
  to: string
  title: string
  description: string
  icon: LucideIcon
  metric: (c: Counts, extra: { roles: number; integrations: number; demo: number }) => number
  unit: string
  featured?: boolean
}

const AREAS: Area[] = [
  {
    to: '/admin/manage/users',
    title: 'User management',
    description:
      'Add fictional learners, invite through the demo log, enrol, suspend and review timelines.',
    icon: UsersRound,
    metric: (c) => c.learners,
    unit: 'learners',
    featured: true,
  },
  {
    to: '/admin/manage/trainers',
    title: 'Trainer management',
    description: 'Profiles, expertise, languages and the programmes each trainer is approved for.',
    icon: GraduationCap,
    metric: (c) => c.trainers,
    unit: 'trainers',
  },
  {
    to: '/admin/manage/programmes',
    title: 'Programme management',
    description: 'Draft, publish and archive, with certification enforced off for Program B.',
    icon: BookOpenText,
    metric: (c) => c.programmes,
    unit: 'programmes',
  },
  {
    to: '/admin/manage/paths',
    title: 'Learning path management',
    description: 'Multiple paths per programme, assignment rules by profile, preview and versions.',
    icon: Route,
    metric: (c) => c.paths,
    unit: 'paths',
    featured: true,
  },
  {
    to: '/admin/manage/courses',
    title: 'Course and content management',
    description: 'Video and transcript, resources, package type and version, completion mapping.',
    icon: BookOpenText,
    metric: (c) => c.courses,
    unit: 'courses',
  },
  {
    to: '/admin/manage/sessions',
    title: 'Session management',
    description: 'Every session with capacity, bookings, attendance and reschedule history.',
    icon: CalendarRange,
    metric: (c) => c.sessions,
    unit: 'sessions',
  },
  {
    to: '/admin/manage/assessments',
    title: 'Assessment and rubric management',
    description: 'Versions, pass marks, the question bank and the scoring rubrics.',
    icon: ClipboardCheck,
    metric: (c) => c.assessments,
    unit: 'assessments',
  },
  {
    to: '/admin/manage/roles',
    title: 'Roles and permissions',
    description: 'The permission matrix for learners, trainers and administrators.',
    icon: ShieldCheck,
    metric: (_c, e) => e.roles,
    unit: 'roles',
  },
  {
    to: '/admin/manage/integrations',
    title: 'Integrations and Security',
    description: 'SSO, API access, content hosting, data residency and CRM, all illustrative.',
    icon: Plug,
    metric: (_c, e) => e.integrations,
    unit: 'adapters',
  },
  {
    to: '/admin/manage/content',
    title: 'Content Library',
    description: 'English and Arabic SCORM and xAPI packages with previews and tracking tests.',
    icon: FolderLock,
    metric: (c) => c.contentPackages,
    unit: 'packages',
  },
  {
    to: '/admin/manage/approvals',
    title: 'Enrolments and Approvals',
    description: 'Review requests, manage waitlists and seat offers, lock or unlock accounts.',
    icon: Inbox,
    metric: (c) => c.pendingApprovals,
    unit: 'pending approvals',
  },
  {
    to: '/admin/manage/certificates',
    title: 'Certificates and CPD',
    description: 'Credential rules, renewals, issued credentials and external CPD reviews.',
    icon: Award,
    metric: (c) => c.credentials,
    unit: 'credentials',
  },
  {
    to: '/admin/manage/audit',
    title: 'Audit and demo reset',
    description:
      'Every permission, marking, session, export and certificate event. Reset the demo.',
    icon: ScrollText,
    metric: (c) => c.auditEvents,
    unit: 'audit events',
  },
]

export function HubOverview() {
  const query = useQuery(hubOverviewQuery())
  const reduce = useReducedMotion()

  return (
    <ManagePage
      title="Academy Management"
      hub
      crumbs={[{ label: 'Academy Management' }]}
      description="Run the Academy: people, programmes, paths, content, sessions and governance, all in one place."
    >
      {query.isPending ? (
        <CardsSkeleton count={13} className="grid gap-5 xl:grid-cols-4 lg:grid-cols-3" />
      ) : query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <Stagger className="grid auto-rows-fr gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {AREAS.map((area) => {
            const value = area.metric(query.data.counts, {
              roles: query.data.roles,
              integrations: query.data.integrations.total,
              demo: query.data.integrations.demo,
            })
            return (
              <StaggerItem key={area.to} className={cn(area.featured && 'xl:col-span-2')}>
                <Link
                  to={area.to as never}
                  className="block h-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <motion.article
                    initial="rest"
                    whileHover={reduce ? undefined : 'hover'}
                    whileTap={reduce ? undefined : 'press'}
                    variants={cardHover}
                    className={cn(
                      'group relative flex h-full flex-col gap-5 overflow-hidden rounded-xl border p-6',
                      area.featured ? 'bg-teal-deep text-white' : 'bg-card',
                    )}
                  >
                    {area.featured ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -end-16 -top-24 size-64 rounded-full bg-teal-soft/20 blur-2xl"
                      />
                    ) : null}
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className={cn(
                          'grid size-11 place-items-center rounded-full',
                          area.featured ? 'bg-white/12 text-white' : 'bg-teal-mist text-teal-deep',
                        )}
                      >
                        <area.icon className="size-5" aria-hidden />
                      </span>
                      <ArrowUpRight
                        aria-hidden
                        className={cn(
                          'size-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5',
                          area.featured ? 'text-white/70' : 'text-teal/50 group-hover:text-teal',
                        )}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <h2
                        className={cn(
                          'font-display text-xl font-normal',
                          area.featured ? 'text-white' : 'text-ink',
                        )}
                      >
                        {area.title}
                      </h2>
                      <p
                        className={cn(
                          'text-sm leading-relaxed',
                          area.featured ? 'text-white/75' : 'text-muted-foreground',
                        )}
                      >
                        {area.description}
                      </p>
                    </div>
                    <p className="mt-auto flex items-baseline gap-2">
                      <span className="font-display text-4xl leading-none font-light tabular-nums">
                        <CountUp value={value} />
                      </span>
                      <span
                        className={cn(
                          'text-sm',
                          area.featured ? 'text-white/70' : 'text-muted-foreground',
                        )}
                      >
                        {area.unit}
                      </span>
                    </p>
                  </motion.article>
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      )}
    </ManagePage>
  )
}
