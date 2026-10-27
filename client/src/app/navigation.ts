import type { Role } from '@shared/roles'
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
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
export interface NavItem {
  label: string
  to: string
  icon?: LucideIcon
  /** Nested children render indented under the parent (admin hierarchy, brief §12). */
  children?: NavItem[]
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

export const LEARNER_NAV: NavSection[] = [
  {
    items: [
      { label: 'Overview', to: '/learner', icon: LayoutDashboard },
      { label: 'My learning', to: '/learner/learning', icon: BookOpen },
      { label: 'Assessments', to: '/learner/assessments', icon: ClipboardCheck },
      { label: 'AI practice', to: '/learner/practice', icon: MessagesSquare },
      { label: 'My sessions', to: '/learner/sessions', icon: CalendarDays },
      { label: 'Assignments', to: '/learner/assignments', icon: FileText },
      { label: 'Progress', to: '/learner/progress', icon: TrendingUp },
      { label: 'Certificates', to: '/learner/certificates', icon: Award },
      { label: 'Profile', to: '/learner/profile', icon: UserRound },
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
          { label: 'Integration settings', to: '/admin/manage/integrations' },
          { label: 'Audit and demo reset', to: '/admin/manage/audit' },
        ],
      },
    ],
  },
]

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
