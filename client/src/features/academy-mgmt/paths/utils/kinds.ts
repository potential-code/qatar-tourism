import type { PathItemKind } from '@shared/constants'
import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Flag,
  type LucideIcon,
  MessagesSquare,
  Presentation,
} from 'lucide-react'

export const KIND_ICON: Record<PathItemKind, LucideIcon> = {
  course: BookOpen,
  assessment_pre: Flag,
  assessment_post: ClipboardCheck,
  assessment_formative: ClipboardList,
  ai_practice: MessagesSquare,
  session: Presentation,
  assignment: FileText,
}
