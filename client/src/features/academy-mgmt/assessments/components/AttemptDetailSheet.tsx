import { useQuery } from '@tanstack/react-query'
import { CircleCheck, CircleX, Gift, History, Timer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api-error'
import { ErrorPanel } from '../../hub/components/QueryStates'
import { ReasonDialog } from '../../hub/components/ReasonDialog'
import { StatusPill } from '../../hub/components/StatusPill'
import { attemptDetailQuery, useGrantAttempt } from '../queries/assessments.queries'
import {
  COMPETENCY_LABELS,
  DIFFICULTY_LABELS,
  instant,
  LANGUAGE_LABELS,
  POLICY_LABELS,
} from '../utils/labels'

const ACTIONS: Record<string, string> = {
  'assessment.grant_attempt': 'Extra attempt granted',
  'assessment.auto_submit': 'Submitted automatically when time ended',
}

/** One attempt: the frozen snapshot, the learner's standing, extra-attempt grants and the audit trail. */
export function AttemptDetailSheet({
  attemptId,
  onClose,
}: {
  attemptId: string | null
  onClose: () => void
}) {
  const query = useQuery(attemptDetailQuery(attemptId))
  const grant = useGrantAttempt()
  const [granting, setGranting] = useState(false)
  const d = query.data

  const confirmGrant = (reason: string) => {
    if (!attemptId) return
    grant.mutate(
      { attemptId, reason },
      {
        onSuccess: () => {
          toast.success('One extra attempt granted', {
            description: 'The learner is notified. The reason is recorded in the audit trail.',
          })
          setGranting(false)
        },
        onError: (e) =>
          toast.error(e instanceof ApiError ? e.message : 'Could not grant the attempt'),
      },
    )
  }

  return (
    <Sheet open={attemptId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl font-normal">
            {d ? `${d.learner.name}, attempt ${d.attempt.attemptNo}` : 'Attempt'}
          </SheetTitle>
          <SheetDescription>
            {d
              ? `${d.learner.displayId} · Program ${d.programme} · ${d.assessmentTitle}`
              : 'Loading the attempt'}
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 px-4 pb-6">
          {query.isPending ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : query.isError ? (
            <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
          ) : d ? (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Stat
                  label="Score"
                  value={d.attempt.score === null ? 'None' : `${d.attempt.score}%`}
                />
                <Stat
                  label="Pass mark"
                  value={d.attempt.passMark === null ? 'None' : `${d.attempt.passMark}%`}
                />
                <Stat
                  label="Rule version"
                  value={d.attempt.ruleVersion ? `v${d.attempt.ruleVersion}` : 'Seeded'}
                />
                <Stat label="Started" value={instant(d.attempt.startedAt)} />
                <Stat label="Submitted" value={instant(d.attempt.submittedAt)} />
                <Stat label="Deadline" value={instant(d.attempt.deadlineAt)} />
              </dl>
              {d.attempt.autoSubmitted ? (
                <p className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm">
                  <Timer aria-hidden className="size-4" /> The time limit ended, so the answers
                  saved at that moment were submitted automatically.
                </p>
              ) : null}

              <section
                className="grid gap-2 rounded-lg border p-4 text-sm"
                aria-label="Attempt standing"
              >
                <h3 className="font-medium text-ink">Standing</h3>
                <p>
                  {d.standing.passed ? 'Passed' : 'Not passed'}. Counted score{' '}
                  {d.standing.counted === null ? 'none' : `${d.standing.counted}%`} (
                  {POLICY_LABELS[d.standing.scorePolicy]}).
                  {d.standing.attemptLimit !== null
                    ? ` Attempts used ${d.standing.used} of ${d.standing.attemptLimit + d.standing.extraGranted}${d.standing.extraGranted ? ` (including ${d.standing.extraGranted} granted)` : ''}.`
                    : ''}
                </p>
                {d.standing.canGrant ? (
                  <Button className="w-fit" variant="outline" onClick={() => setGranting(true)}>
                    <Gift /> Grant extra attempt
                  </Button>
                ) : d.standing.attemptLimit !== null && !d.standing.passed ? (
                  <p className="text-muted-foreground">
                    {d.standing.remaining
                      ? 'The learner still has an attempt available.'
                      : 'An extra attempt is already waiting for the learner.'}
                  </p>
                ) : null}
              </section>

              <section aria-label="Question snapshot" className="grid gap-3">
                <h3 className="font-medium text-ink">
                  Question snapshot{d.hasSnapshot ? '' : ' (not stored for seeded history)'}
                </h3>
                {d.hasSnapshot ? (
                  <p className="text-xs text-muted-foreground">
                    Frozen when the attempt started. Later bank edits do not change it.
                  </p>
                ) : null}
                <ol className="grid gap-3">
                  {d.questions.map((q, i) => (
                    <li key={q.questionId} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-ink tabular-nums">{i + 1}.</span>
                        {q.questionId} · v{q.version} · {LANGUAGE_LABELS[q.language]} ·{' '}
                        {COMPETENCY_LABELS[q.competency]} · {DIFFICULTY_LABELS[q.difficulty]}
                        <StatusPill tone={q.isCorrect ? 'good' : 'bad'}>
                          {q.selected.length === 0
                            ? 'Not answered'
                            : q.isCorrect
                              ? 'Correct'
                              : 'Not correct'}
                        </StatusPill>
                      </div>
                      <p
                        lang={q.language}
                        dir={q.language === 'ar' ? 'rtl' : 'ltr'}
                        className="mt-1.5 font-medium"
                      >
                        {q.prompt}
                      </p>
                      <ul
                        lang={q.language}
                        dir={q.language === 'ar' ? 'rtl' : 'ltr'}
                        className="mt-1.5 grid gap-1"
                      >
                        {q.options.map((o) => {
                          const correct = q.correct.includes(o.key)
                          const chosen = q.selected.includes(o.key)
                          return (
                            <li key={o.key} className="flex items-start gap-2">
                              {correct ? (
                                <CircleCheck
                                  aria-hidden
                                  className="mt-0.5 size-4 shrink-0 text-success"
                                />
                              ) : chosen ? (
                                <CircleX
                                  aria-hidden
                                  className="mt-0.5 size-4 shrink-0 text-destructive"
                                />
                              ) : (
                                <span className="size-4 shrink-0" />
                              )}
                              <span
                                className={
                                  chosen ? 'font-medium text-ink' : 'text-muted-foreground'
                                }
                              >
                                {o.text}
                                {correct ? (
                                  <span className="sr-only"> (correct answer)</span>
                                ) : null}
                                {chosen ? <span className="sr-only"> (selected)</span> : null}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  ))}
                </ol>
              </section>

              <section aria-label="Extra attempts and audit trail" className="grid gap-2">
                <h3 className="flex items-center gap-2 font-medium text-ink">
                  <History aria-hidden className="size-4" /> Extra attempts and audit trail
                </h3>
                {d.grants.length === 0 && d.trail.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing recorded for this attempt yet.
                  </p>
                ) : (
                  <ul className="grid gap-2 text-sm">
                    {d.trail.map((t) => (
                      <li key={t.id} className="rounded-lg border p-3">
                        <p className="font-medium text-ink">{ACTIONS[t.action] ?? t.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.actor} · {instant(t.at)}
                        </p>
                        {t.reason ? <p className="mt-1">Reason: {t.reason}</p> : null}
                      </li>
                    ))}
                    {d.grants.map((g) => (
                      <li
                        key={g.id}
                        className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground"
                      >
                        Grant by {g.grantedBy}, {instant(g.grantedAt)}:{' '}
                        {g.used ? 'used' : 'not used yet'}.
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}
        </div>
        <ReasonDialog
          open={granting}
          onOpenChange={setGranting}
          title="Grant one extra attempt"
          description="The learner has used every attempt. This adds exactly one more and records who granted it and why. It is audited and the learner is notified."
          confirmLabel="Grant extra attempt"
          pending={grant.isPending}
          onConfirm={confirmGrant}
        />
      </SheetContent>
    </Sheet>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
