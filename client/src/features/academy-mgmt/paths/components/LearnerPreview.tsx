import { useQuery } from '@tanstack/react-query'
import { Check, Eye, Lock } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { ProgressRing } from '@/components/data/ProgressRing'
import { easeOut } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { experienceQuery } from '../queries/paths.queries'
import type { DraftItem, ExperienceItem } from '../types'
import { groupStages } from '../utils/draft'
import { KIND_ICON } from '../utils/kinds'
import { ITEM_KIND_LABELS } from '../utils/rules'

type State = ExperienceItem['state']

const identity = (item: { kind: string; courseId: string | null; scenarioKey?: string | null }) =>
  `${item.kind}|${item.courseId ?? ''}`

/**
 * The path as the learner would see it (brief §14 "Add a path preview using Maha's profile").
 * Works on the builder's unsaved items: progress comes from the learner's real records, matched
 * by course or step type, so reordering or making a unit optional shows immediately.
 */
export function LearnerPreview({
  pathId,
  versionId,
  items,
  label,
}: {
  pathId: string
  versionId?: string
  items: DraftItem[]
  label: string
}) {
  const reduce = useReducedMotion()
  const [draftCode, setDraftCode] = useState('L0001')
  const [learnerCode, setLearnerCode] = useState('L0001')
  const query = useQuery(experienceQuery(pathId, learnerCode, versionId))

  const states = new Map<string, { state: State; detail: string | null }>()
  for (const item of query.data?.items ?? []) states.set(identity(item), item)
  const withState = items.map((item) => ({
    ...item,
    state: states.get(identity(item))?.state ?? ('not_started' as State),
    detail: states.get(identity(item))?.detail ?? null,
  }))
  const required = withState.filter((i) => i.required)
  const done = required.filter((i) => i.state === 'completed').length
  const percent = required.length ? Math.round((done / required.length) * 100) : 0
  const nextIndex = withState.findIndex((i) => i.required && i.state !== 'completed')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const code = draftCode.trim().toUpperCase()
    if (/^L\d{4}$/.test(code)) setLearnerCode(code)
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="preview-learner">Preview as learner</Label>
          <Input
            id="preview-learner"
            value={draftCode}
            onChange={(e) => setDraftCode(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          <Eye aria-hidden /> Preview
        </Button>
      </form>

      {query.isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
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
        <div className="overflow-hidden rounded-xl border bg-sand">
          <div className="flex items-center gap-4 bg-ink px-5 py-4 text-white">
            <ProgressRing
              value={percent}
              size={64}
              strokeWidth={6}
              ariaLabel="Required steps complete"
            >
              <span className="text-sm font-medium text-white tabular-nums">{percent}%</span>
            </ProgressRing>
            <div className="grid min-w-0 gap-0.5">
              <p className="text-xs text-white/70">{label}</p>
              <p className="truncate font-display text-xl">
                {query.data.learner.fullName.split(' ')[0]}'s learning path
              </p>
              <p className="text-xs text-white/70">
                {done} of {required.length} required steps complete
                {query.data.learner.enrolled ? '' : ', not enrolled in this programme yet'}
              </p>
            </div>
          </div>

          <ol className="grid gap-5 px-5 py-5">
            {groupStages(withState).map((group) => (
              <li key={group.items[0]?.key ?? group.stage} className="grid gap-2">
                <p className="text-[11px] font-semibold tracking-wide text-teal-deep">
                  Level {group.level}: {group.stage}
                </p>
                <ol className="relative grid gap-2 border-s border-teal/20 ps-5">
                  {group.items.map((item) => {
                    const Icon = KIND_ICON[item.kind]
                    const isNext = withState.indexOf(item) === nextIndex
                    return (
                      <motion.li
                        key={item.key}
                        layout={!reduce}
                        transition={{ duration: 0.3, ease: easeOut }}
                        className={cn(
                          'relative flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5',
                          isNext && 'border-teal shadow-sm',
                          !item.required && 'border-dashed',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'absolute -start-[27px] grid size-3.5 place-items-center rounded-full border-2',
                            item.state === 'completed'
                              ? 'border-teal bg-teal'
                              : item.state === 'in_progress'
                                ? 'border-teal bg-card'
                                : 'border-teal/30 bg-sand',
                          )}
                        />
                        <Icon aria-hidden className="size-4 shrink-0 text-teal-deep" />
                        <div className="grid min-w-0 flex-1">
                          <span className="truncate text-sm text-ink">{item.title}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {ITEM_KIND_LABELS[item.kind]}
                            {item.required ? '' : ', optional'}
                            {item.detail ? `, ${item.detail}` : ''}
                          </span>
                        </div>
                        <StateTag state={item.state} isNext={isNext} />
                      </motion.li>
                    )
                  })}
                </ol>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  )
}

function StateTag({ state, isNext }: { state: State; isNext: boolean }) {
  if (state === 'completed')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-medium text-teal-deep">
        <Check aria-hidden className="size-3" /> Done
      </span>
    )
  if (state === 'in_progress')
    return (
      <span className="rounded-full bg-teal-mist px-2 py-0.5 text-[11px] font-medium text-teal-deep">
        In progress
      </span>
    )
  if (isNext)
    return (
      <span className="rounded-full bg-teal px-2 py-0.5 text-[11px] font-medium text-white">
        Next
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <Lock aria-hidden className="size-3" /> Not started
    </span>
  )
}
