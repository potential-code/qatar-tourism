import type { ProgrammeCode } from '@shared/constants'
import type { PreviewRule } from '@shared/schemas/admin-paths'
import { useQuery } from '@tanstack/react-query'
import { Check, CircleDashed, Crown, Search, UserRound, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { easeOut } from '@/components/motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { matchPreviewQuery } from '../queries/paths.queries'
import type { MatchPreview as MatchPreviewData, RuleEvaluation } from '../types'
import { fieldMeta, OPERATOR_LABELS, valueLabel } from '../utils/rules'

type Node = RuleEvaluation['result']['conditions'][number]

const isGroupNode = (node: Node): node is Node & { op: string; conditions: Node[] } => 'op' in node

/**
 * "Preview the match before publishing" (brief §14). Evaluates the saved rules, or an unsaved
 * rule set from the editor, against one learner's real profile. Defaults to Maha (L0001).
 */
export function MatchPreview({
  programme,
  rules,
  compact = false,
  onOverride,
}: {
  programme: ProgrammeCode
  /** Unsaved rules to preview instead of the saved ones. */
  rules?: PreviewRule[]
  compact?: boolean
  onOverride?: (preview: MatchPreviewData) => void
}) {
  const [draftCode, setDraftCode] = useState('L0001')
  const [learnerCode, setLearnerCode] = useState('L0001')
  const query = useQuery(matchPreviewQuery({ programme, learnerCode, ...(rules ? { rules } : {}) }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const code = draftCode.trim().toUpperCase()
    if (/^L\d{4}$/.test(code)) setLearnerCode(code)
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor={`learner-${programme}-${compact ? 'c' : 'p'}`}>Learner ID</Label>
          <Input
            id={`learner-${programme}-${compact ? 'c' : 'p'}`}
            value={draftCode}
            onChange={(e) => setDraftCode(e.target.value)}
            placeholder="L0001"
            aria-describedby={`learner-help-${programme}`}
          />
        </div>
        <Button type="submit" variant="outline">
          <Search aria-hidden /> Preview
        </Button>
      </form>
      <p id={`learner-help-${programme}`} className="-mt-2 text-xs text-muted-foreground">
        Maha Al Nouri is L0001. Try L0002 Omar or L0005 Sara.
      </p>

      {query.isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : query.isError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <p className="font-medium text-destructive">{query.error.message}</p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      ) : query.data ? (
        <PreviewResult data={query.data} compact={compact} onOverride={onOverride} />
      ) : null}
    </div>
  )
}

function PreviewResult({
  data,
  compact,
  onOverride,
}: {
  data: MatchPreviewData
  compact: boolean
  onOverride?: (preview: MatchPreviewData) => void
}) {
  const reduce = useReducedMotion()
  const profile = data.profile
  const chips = [
    profile.organisation,
    profile.organisationType && valueLabel('organisationType', profile.organisationType),
    profile.jobTitle,
    profile.seniority && valueLabel('seniority', profile.seniority),
    profile.experience && valueLabel('experience', profile.experience),
    ...(profile.goals ?? []).map((g) => valueLabel('goals', g)),
    profile.baselineWeakCompetency &&
      `Weakest: ${valueLabel('baselineWeakCompetency', profile.baselineWeakCompetency)}`,
  ].filter(Boolean)

  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3 rounded-lg bg-sand-deep/50 p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-mist text-teal-deep">
          <UserRound aria-hidden className="size-5" />
        </span>
        <div className="grid min-w-0 gap-1.5">
          <p className="text-sm font-medium text-ink">
            {data.learner.fullName}{' '}
            <span className="font-mono text-xs text-muted-foreground">
              {data.learner.learnerCode}
            </span>
            {!profile.complete ? (
              <Badge variant="outline" className="ms-2 border-maroon/30 text-maroon-deep">
                Profile incomplete
              </Badge>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={String(chip)}
                className="rounded-full border bg-card px-2 py-0.5 text-[11px] text-ink/80"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${data.resolution.pathId}-${data.resolution.priority}-${data.learner.learnerCode}`}
          initial={reduce ? false : { opacity: 0, scale: 0.98, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easeOut }}
          className="relative overflow-hidden rounded-xl bg-teal p-4 text-white shadow-[var(--qt-shadow-glow)]"
        >
          <p className="flex items-center gap-1.5 text-xs text-white/75">
            <Crown aria-hidden className="size-3.5" /> Resolved path
          </p>
          <p className="mt-1 font-display text-2xl leading-tight">{data.resolution.pathName}</p>
          <p className="mt-1 text-sm text-white/85">{data.resolution.reason}</p>
        </motion.div>
      </AnimatePresence>

      <ol className="grid gap-2" aria-label="Rules evaluated, highest priority first">
        {data.evaluations.map((evaluation) => (
          <li
            key={evaluation.key}
            className={cn(
              'rounded-lg border p-3 transition-colors',
              evaluation.winner ? 'border-teal/40 bg-teal-mist/60' : 'bg-card',
              !evaluation.considered && 'opacity-60',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
                {evaluation.isDefault && !evaluation.winner ? (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full border border-dashed border-teal/40 text-teal">
                    <CircleDashed aria-hidden className="size-3" />
                    <span className="sr-only">Fallback, not needed</span>
                  </span>
                ) : (
                  <MatchIcon pass={evaluation.result.pass} />
                )}
                <span className="truncate">{evaluation.name}</span>
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {evaluation.isDefault ? 'Default' : `Priority ${evaluation.priority}`}
                {evaluation.winner ? ' · Winner' : ''}
                {!evaluation.considered ? ` · ${evaluation.status}, not applied` : ''}
              </span>
            </div>
            {!compact && evaluation.result.conditions.length > 0 ? (
              <ul className="mt-2 grid gap-1 ps-6">
                {evaluation.result.conditions.map((node, i) => (
                  <ConditionLine
                    // biome-ignore lint/suspicious/noArrayIndexKey: conditions are positional and never reorder here
                    key={`${evaluation.key}-${i}`}
                    node={node}
                    op={evaluation.result.op}
                  />
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>

      {onOverride && data.learner.enrolments.length > 0 ? (
        <Button variant="outline" onClick={() => onOverride(data)}>
          Override path for {data.learner.fullName.split(' ')[0]}
        </Button>
      ) : null}
    </div>
  )
}

function MatchIcon({ pass }: { pass: boolean }) {
  return pass ? (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-teal text-white">
      <Check aria-hidden className="size-3" />
      <span className="sr-only">Matched</span>
    </span>
  ) : (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-ink/60">
      <X aria-hidden className="size-3" />
      <span className="sr-only">Not matched</span>
    </span>
  )
}

function ConditionLine({ node, op }: { node: Node; op: string }) {
  if (isGroupNode(node)) {
    return (
      <li className="text-xs text-muted-foreground">
        <span className="font-medium">{op}</span> group ({node.op}):{' '}
        {node.pass ? 'matched' : 'not matched'}
      </li>
    )
  }
  const meta = fieldMeta(node.field)
  const expected = node.expected.map((v) => valueLabel(node.field, v)).join(', ')
  const actual = node.actual.map((v) => valueLabel(node.field, v)).join(', ') || 'not set'
  return (
    <li className="flex items-start gap-1.5 text-xs">
      {node.pass ? (
        <Check aria-hidden className="mt-0.5 size-3 shrink-0 text-teal" />
      ) : (
        <CircleDashed aria-hidden className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
      )}
      <span className="text-ink/80">
        {meta.label} {OPERATOR_LABELS[node.operator]} {expected}
        <span className="text-muted-foreground"> (learner: {actual})</span>
        <span className="sr-only">{node.pass ? ', passed' : ', failed'}</span>
      </span>
    </li>
  )
}
