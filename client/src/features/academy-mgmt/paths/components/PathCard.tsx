import { Link } from '@tanstack/react-router'
import { ArrowRight, GitBranch, Star } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { cardHover } from '@/components/motion'
import { Badge } from '@/components/ui/badge'
import type { PathSummary } from '../types'

/** One learning path: version state, reach and how many rules point at it. */
export function PathCard({ path }: { path: PathSummary }) {
  const reduce = useReducedMotion()
  const completion = path.enrolments ? Math.round((path.completed / path.enrolments) * 100) : 0
  return (
    <motion.div
      initial="rest"
      whileHover={reduce ? undefined : 'hover'}
      whileTap={reduce ? undefined : 'press'}
      variants={cardHover}
      className="h-full rounded-xl"
    >
      <Link
        to="/admin/manage/paths/$pathId"
        params={{ pathId: path.id }}
        className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border bg-card p-5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span
          aria-hidden
          className={`absolute inset-x-0 top-0 h-1 ${path.isDefault ? 'bg-teal' : 'bg-teal-soft/60'}`}
        />
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="font-mono text-[11px] tracking-wide text-muted-foreground">{path.code}</p>
            <h3 className="font-display text-xl leading-snug text-ink">{path.name}</h3>
          </div>
          {path.isDefault ? (
            <Badge className="gap-1 border-teal/20 bg-teal-mist text-teal-deep">
              <Star aria-hidden className="size-3" /> Default
            </Badge>
          ) : null}
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{path.description}</p>
        <div className="flex flex-wrap gap-2">
          {path.current ? (
            <Badge variant="outline" className="border-teal/30 text-teal-deep">
              Published v{path.current.version}
            </Badge>
          ) : (
            <Badge variant="outline">Not yet published</Badge>
          )}
          {path.draft ? (
            <Badge variant="outline" className="border-maroon/30 bg-maroon-mist text-maroon-deep">
              Draft v{path.draft.version}
            </Badge>
          ) : null}
          <Badge variant="outline" className="gap-1">
            <GitBranch aria-hidden className="size-3" />
            {path.rules} {path.rules === 1 ? 'rule' : 'rules'}
          </Badge>
        </div>
        <dl className="mt-auto grid grid-cols-3 gap-3 border-t pt-4 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Items</dt>
            <dd className="font-display text-2xl tabular-nums">
              {path.draft?.items ?? path.current?.items ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Enrolments</dt>
            <dd className="font-display text-2xl tabular-nums">
              {path.enrolments.toLocaleString('en-GB')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Completed</dt>
            <dd className="font-display text-2xl tabular-nums">
              {completion}
              <span className="text-sm text-muted-foreground">%</span>
            </dd>
          </div>
        </dl>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-teal">
          Open builder
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100"
          />
        </span>
      </Link>
    </motion.div>
  )
}
