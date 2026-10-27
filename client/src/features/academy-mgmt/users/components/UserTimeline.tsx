import {
  Award,
  Bell,
  BookOpenCheck,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  MessageSquareText,
  MessagesSquare,
  ScrollText,
  UserCheck,
  UserRoundPlus,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { EmptyState } from '@/components/ui/empty-state'
import { qDateTime } from '../../hub/utils/format'
import type { UserDetail } from '../queries/users.queries'

const ICONS = {
  account: UserRoundPlus,
  enrolment: BookOpenCheck,
  assessment: ClipboardCheck,
  practice: MessagesSquare,
  booking: CalendarCheck,
  attendance: UserCheck,
  submission: FileText,
  review: MessageSquareText,
  certificate: Award,
  notification: Bell,
  audit: ScrollText,
} as const

/** The learner's history across every record type, newest first (brief §14 "view timeline"). */
export function UserTimeline({ entries }: { entries: UserDetail['timeline'] }) {
  const reduce = useReducedMotion()
  if (entries.length === 0)
    return (
      <EmptyState
        icon={ScrollText}
        title="No activity yet"
        description="Events appear here as the learner progresses."
      />
    )
  return (
    <ol className="relative grid gap-1 ps-2">
      <span aria-hidden className="absolute inset-y-3 start-[1.45rem] w-px bg-border" />
      {entries.map((entry, index) => {
        const Icon = ICONS[entry.kind]
        return (
          <motion.li
            key={entry.id}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index, 15) * 0.03, duration: 0.35 }}
            className="relative flex gap-4 rounded-lg px-2 py-2.5 hover:bg-sand/70"
          >
            <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border bg-card text-teal">
              <Icon aria-hidden className="size-4" />
            </span>
            <div className="grid min-w-0 gap-0.5">
              <p className="text-sm font-medium text-ink">{entry.title}</p>
              {entry.detail ? (
                <p className="text-xs text-muted-foreground">{entry.detail}</p>
              ) : null}
              <p className="text-xs text-muted-foreground tabular-nums">
                {qDateTime(entry.at)} Qatar time
              </p>
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}
