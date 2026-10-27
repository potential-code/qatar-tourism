import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  type LucideIcon,
  MessagesSquare,
  MonitorPlay,
  MousePointerClick,
  NotebookPen,
  Package,
  Sparkle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const COURSE_ICON: Record<string, LucideIcon> = {
  C01: MonitorPlay,
  C02: MousePointerClick,
  C03: MonitorPlay,
  C04: Package,
  C05: NotebookPen,
  C06: CalendarDays,
  C07: Sparkle,
}

const KIND_ICON: Record<string, LucideIcon> = {
  assessment_pre: ClipboardCheck,
  assessment_post: ClipboardCheck,
  assessment_formative: ClipboardCheck,
  ai_practice: MessagesSquare,
  session: CalendarDays,
  assignment: FileText,
}

export function ItemIcon({
  kind,
  courseCode,
  className,
}: {
  kind: string
  courseCode: string | null
  className?: string
}) {
  const Icon = (courseCode ? COURSE_ICON[courseCode] : undefined) ?? KIND_ICON[kind] ?? FileText
  return <Icon aria-hidden className={cn('size-4', className)} />
}
