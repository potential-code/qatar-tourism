import { CheckCircle2, Clock3, CornerUpLeft, PenLine } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { easeOut } from '@/components/motion/variants'
import { cn } from '@/lib/utils'
import type { LearnerAssignment } from '../types'

/** The one thing the learner needs to know about this assignment right now. */
export function StateBanner({ item }: { item: LearnerAssignment }) {
  const reduce = useReducedMotion()
  const latest = item.versions[0]
  const marker = latest?.markerName ?? 'your trainer'
  const content = {
    not_started: {
      icon: PenLine,
      tone: 'border-teal/20 bg-teal-mist/60 text-teal-deep',
      title: 'Not started yet',
      body: `Read the brief, then submit your work below. The pass mark is ${item.assignment.passPercent}, and revisions are permitted.`,
    },
    awaiting_review: {
      icon: Clock3,
      tone: 'border-teal/20 bg-teal-mist/60 text-teal-deep',
      title: `Version ${latest?.version} is with ${marker}`,
      body: 'You will get an in-app notification when it has been marked.',
    },
    returned: {
      icon: CornerUpLeft,
      tone: 'border-warning/30 bg-warning/10 text-ink',
      title: `Version ${latest?.version} was returned for revision`,
      body: 'Read the feedback, then submit a revised version below. Your earlier version stays in your history.',
    },
    approved: {
      icon: CheckCircle2,
      tone: 'border-success/30 bg-success/10 text-ink',
      title: `Approved with ${latest?.review?.score ?? ''}/100`,
      body: 'This requirement is complete. Your version history and feedback stay available here.',
    },
  }[item.state as 'not_started' | 'awaiting_review' | 'returned' | 'approved']
  const Icon = content.icon
  return (
    <motion.div
      role="status"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className={cn('flex items-start gap-3 rounded-xl border p-4', content.tone)}
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="grid gap-0.5">
        <p className="font-medium">{content.title}</p>
        <p className="text-sm text-muted-foreground">{content.body}</p>
      </div>
    </motion.div>
  )
}
