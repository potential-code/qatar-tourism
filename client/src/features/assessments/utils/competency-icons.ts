import type { Competency } from '@shared/constants'
import {
  BadgeCheck,
  Compass,
  LifeBuoy,
  type LucideIcon,
  MessagesSquare,
  ShieldCheck,
} from 'lucide-react'

/** One icon per competency, shown next to its name (the name is always written out too). */
export const COMPETENCY_ICON: Record<Competency, LucideIcon> = {
  discover_needs: Compass,
  verify_information: BadgeCheck,
  communicate_clearly: MessagesSquare,
  recover_service: LifeBuoy,
  protect_information: ShieldCheck,
}

export const competencyIcon = (key: string): LucideIcon =>
  COMPETENCY_ICON[key as Competency] ?? Compass
