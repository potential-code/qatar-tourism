import type { ProgrammeCode } from '@shared/constants'
import type { Role } from '@shared/roles'
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  History,
  LayoutDashboard,
  type LucideIcon,
  MessagesSquare,
  Presentation,
  Settings2,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react'

/**
 * Single source of truth for portal navigation (brief §5 learner, §10 trainer, §12 admin).
 * Visibility only: every API enforces access itself.
 */

/** What the portal knows about the viewer when it decides which items to show. */
export interface NavContext {
  /** Programmes the learner is enrolled in; null while unknown (show everything). */
  programmes: readonly ProgrammeCode[] | null
}

/** Keys of `learner:nav.*`: the learner portal follows the visitor's language (29 Oct update). */
export type LearnerNavKey =
  | 'overview'
  | 'myLearning'
  | 'assessments'
  | 'aiPractice'
  | 'mySessions'
  | 'assignments'
  | 'progress'
  | 'certificates'
  | 'myLearningRecord'
  | 'profile'

export interface NavItem {
  label: string
  /** Translation key under `learner:nav`; `label` stays the English text and the fallback. */
  labelKey?: LearnerNavKey
  to: string
  icon?: LucideIcon
  /** Nested children render indented under the parent (admin hierarchy, brief §12). */
  children?: NavItem[]
  /** Hides the item when it returns false. Absent means always shown. */
  visible?: (ctx: NavContext) => boolean
}

/** Certificates belong to the Program A certification track only (brief §5: B has none). */
const hasCertificationTrack = (ctx: NavContext) =>
  ctx.programmes === null || ctx.programmes.includes('A')

export interface NavSection {
  label?: string
  items: NavItem[]
}

export const LEARNER_NAV: NavSection[] = [
  {
    items: [
      { label: 'Overview', labelKey: 'overview', to: '/learner', icon: LayoutDashboard },
      { label: 'My learning', labelKey: 'myLearning', to: '/learner/learning', icon: BookOpen },
      {
        label: 'Assessments',
        labelKey: 'assessments',
        to: '/learner/assessments',
        icon: ClipboardCheck,
      },
      {
        label: 'AI practice',
        labelKey: 'aiPractice',
        to: '/learner/practice',
        icon: MessagesSquare,
      },
      { label: 'My sessions', labelKey: 'mySessions', to: '/learner/sessions', icon: CalendarDays },
      { label: 'Assignments', labelKey: 'assignments', to: '/learner/assignments', icon: FileText },
      { label: 'Progress', labelKey: 'progress', to: '/learner/progress', icon: TrendingUp },
      {
        label: 'Certificates',
        labelKey: 'certificates',
        to: '/learner/certificates',
        icon: Award,
        visible: hasCertificationTrack,
      },
      {
        label: 'My Learning Record',
        labelKey: 'myLearningRecord',
        to: '/learner/record',
        icon: History,
      },
      { label: 'Profile', labelKey: 'profile', to: '/learner/profile', icon: UserRound },
    ],
  },
]

export const TRAINER_NAV: NavSection[] = [
  {
    items: [
      { label: 'Overview', to: '/trainer', icon: LayoutDashboard },
      { label: 'My sessions', to: '/trainer/sessions', icon: CalendarDays },
      { label: 'Assigned learners', to: '/trainer/learners', icon: Users },
      { label: 'Attendance and scores', to: '/trainer/attendance', icon: ClipboardList },
      { label: 'Assignments', to: '/trainer/assignments', icon: FileText },
      { label: 'Notification log', to: '/trainer/sessions/notification-log', icon: Bell },
      { label: 'Resources', to: '/trainer/resources', icon: FolderOpen },
      { label: 'Profile', to: '/trainer/profile', icon: UserRound },
    ],
  },
]

/** Exact hierarchy from brief §12. */
export const ADMIN_NAV: NavSection[] = [
  {
    items: [
      {
        label: 'Dashboard',
        to: '/admin',
        icon: LayoutDashboard,
        children: [
          { label: 'Overview dashboard', to: '/admin' },
          { label: 'AI Analytics', to: '/admin/ai-analytics', icon: Sparkles },
        ],
      },
      {
        label: 'Reports',
        to: '/admin/reports',
        icon: BarChart3,
        children: [
          { label: 'Program A users', to: '/admin/reports/program-a' },
          { label: 'Program B users', to: '/admin/reports/program-b' },
          { label: 'Program C users', to: '/admin/reports/program-c' },
          { label: 'All learners', to: '/admin/reports/learners' },
          { label: 'Trainers', to: '/admin/reports/trainers' },
          { label: 'Sessions and attendance', to: '/admin/reports/sessions' },
          { label: 'Assessments and improvement', to: '/admin/reports/assessments' },
          { label: 'Assignments', to: '/admin/reports/assignments' },
          { label: 'Certification', to: '/admin/reports/certification' },
          { label: 'Notifications and exports', to: '/admin/reports/notifications' },
        ],
      },
      {
        label: 'Academy Management',
        to: '/admin/manage',
        icon: Settings2,
        children: [
          { label: 'User management', to: '/admin/manage/users' },
          { label: 'Trainer management', to: '/admin/manage/trainers' },
          { label: 'Programme management', to: '/admin/manage/programmes' },
          { label: 'Learning path management', to: '/admin/manage/paths' },
          { label: 'Course and content management', to: '/admin/manage/courses' },
          { label: 'Session management', to: '/admin/manage/sessions' },
          { label: 'Assessment and rubric management', to: '/admin/manage/assessments' },
          { label: 'Roles and permissions', to: '/admin/manage/roles' },
          { label: 'Integrations and Security', to: '/admin/manage/integrations' },
          { label: 'Content Library', to: '/admin/manage/content' },
          { label: 'Enrolments and Approvals', to: '/admin/manage/approvals' },
          { label: 'Certificates and CPD', to: '/admin/manage/certificates' },
          { label: 'Audit and demo reset', to: '/admin/manage/audit' },
        ],
      },
    ],
  },
]

/** The sections with every item whose `visible` rule fails removed. */
export function visibleNav(sections: NavSection[], ctx: NavContext): NavSection[] {
  const keep = (item: NavItem): NavItem | null => {
    if (item.visible && !item.visible(ctx)) return null
    if (!item.children) return item
    return { ...item, children: item.children.flatMap((c) => keep(c) ?? []) }
  }
  return sections.map((section) => ({
    ...section,
    items: section.items.flatMap((item) => keep(item) ?? []),
  }))
}

export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  learner: LEARNER_NAV,
  trainer: TRAINER_NAV,
  admin: ADMIN_NAV,
}

export const PORTAL_LABEL: Record<Role, string> = {
  learner: 'Learner',
  trainer: 'Trainer workspace',
  admin: 'Academy admin',
}

export const PORTAL_ICON: Record<Role, LucideIcon> = {
  learner: GraduationCap,
  trainer: Presentation,
  admin: Settings2,
}
