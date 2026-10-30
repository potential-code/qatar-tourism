import { CheckCircle2, Clock3, CornerUpLeft, PenLine } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { easeOut } from '@/components/motion/variants'
import { cn } from '@/lib/utils'
import type { LearnerAssignment } from '../types'

/** The one thing the learner needs to know about this assignment right now. */
export function StateBanner({ item }: { item: LearnerAssignment }) {
  const reduce = useReducedMotion()
  const { t } = useTranslation('learner')
  const latest = item.versions[0]
  const marker = latest?.markerName ?? t('assignments.banner.yourTrainer')
  const content = {
    not_started: {
      icon: PenLine,
      tone: 'border-teal/20 bg-teal-mist/60 text-teal-deep',
      title: t('assignments.banner.notStartedTitle'),
      body: t('assignments.banner.notStartedBody', { pass: item.assignment.passPercent }),
    },
    awaiting_review: {
      icon: Clock3,
      tone: 'border-teal/20 bg-teal-mist/60 text-teal-deep',
      title: t('assignments.banner.waitingTitle', { version: latest?.version, marker }),
      body: t('assignments.banner.waitingBody'),
    },
    returned: {
      icon: CornerUpLeft,
      tone: 'border-warning/30 bg-warning/10 text-ink',
      title: t('assignments.banner.returnedTitle', { version: latest?.version }),
      body: t('assignments.banner.returnedBody'),
    },
    approved: {
      icon: CheckCircle2,
      tone: 'border-success/30 bg-success/10 text-ink',
      title: t('assignments.banner.approvedTitle', { score: latest?.review?.score ?? '' }),
      body: t('assignments.banner.approvedBody'),
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
