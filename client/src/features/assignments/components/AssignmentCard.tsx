import { Link } from '@tanstack/react-router'
import { ArrowRight, Layers } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { cardHover } from '@/components/motion/variants'
import { Badge } from '@/components/ui/badge'
import { qatarDateTime } from '@/lib/format/qatar-time'
import type { LearnerAssignment } from '../types'
import { ASSIGNMENT_STATE, type AssignmentState } from '../utils/status'
import { StatusPill } from './StatusPill'

const ACTION: Record<AssignmentState, string> = {
  not_started: 'Start assignment',
  awaiting_review: 'View submission',
  returned: 'Read feedback and revise',
  approved: 'View feedback',
}

/** One assignment in the list, with its state and the next action. */
export function AssignmentCard({ item }: { item: LearnerAssignment }) {
  const reduce = useReducedMotion()
  const stateKey = item.state as AssignmentState
  const state = ASSIGNMENT_STATE[stateKey]
  const latest = item.versions[0]
  return (
    <motion.article
      initial="rest"
      whileHover={reduce ? undefined : 'hover'}
      whileTap={reduce ? undefined : 'press'}
      variants={cardHover}
      className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border bg-card p-6"
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 start-0 w-1 ${item.enrolment.programmeCode === 'A' ? 'bg-maroon' : 'bg-teal'}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="outline" className="border-teal/30 text-teal-deep">
          Program {item.enrolment.programmeCode}
        </Badge>
        <StatusPill label={state.label} tone={state.tone} />
      </div>
      <h2 className="font-display text-2xl leading-tight font-normal text-ink">
        <Link
          to="/learner/assignments/$code"
          params={{ code: item.assignment.code }}
          className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-xl after:focus-visible:ring-[3px] after:focus-visible:ring-ring/50"
        >
          {item.assignment.title}
        </Link>
      </h2>
      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {item.assignment.brief}
      </p>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t pt-4 text-sm">
        <div className="grid gap-0.5">
          {latest ? (
            <>
              <span className="flex items-center gap-1.5 text-ink">
                <Layers aria-hidden className="size-4 text-teal" />
                {item.versions.length} {item.versions.length === 1 ? 'version' : 'versions'}
                {latest.review ? `, latest mark ${latest.review.score}/100` : ''}
              </span>
              <span className="text-xs text-muted-foreground">
                Last submitted {qatarDateTime(latest.submittedAt)}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">
              {item.assignment.wordMin} to {item.assignment.wordMax} words
              {item.assignment.allowsUpload ? ', or upload a file' : ''}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 font-medium text-teal">
          {ACTION[stateKey]}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100"
          />
        </span>
      </div>
    </motion.article>
  )
}
