import type { LearningGoal } from '@shared/constants'
import {
  BookOpen,
  Compass,
  HandHeart,
  LifeBuoy,
  type LucideIcon,
  MessagesSquare,
  Users,
} from 'lucide-react'

/** One icon per learning goal (brief §4), shared by the wizard chips and the welcome page. */
export const GOAL_ICON: Record<LearningGoal, LucideIcon> = {
  visitor_welcome: HandHeart,
  communication: MessagesSquare,
  complaint_handling: LifeBuoy,
  guiding: Compass,
  storytelling: BookOpen,
  leadership: Users,
}
