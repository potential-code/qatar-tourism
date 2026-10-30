import type { LicenceStatus } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronRight, Circle, RotateCcw, ShieldQuestion } from 'lucide-react'
import { useState } from 'react'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Button } from '@/components/ui/button'
import type { AdvanceResult } from '@/services/crm/scenario'
import {
  advanceCrmScenario,
  resetCrmScenario,
  type ScenarioView,
} from '@/services/crm-scenario.service'
import { Field } from '../../../hub/components/Field'
import { OptionSelect } from '../../../hub/components/OptionSelect'
import { Panel } from '../../../hub/components/Panel'
import { CardsSkeleton, ErrorPanel } from '../../../hub/components/QueryStates'
import { StatusPill } from '../../../hub/components/StatusPill'
import { qDateTime } from '../../../hub/utils/format'
import { scenarioQuery, useIntegrationMutation } from '../../queries/integrations.queries'
import { ResolveMappingDialog } from './ResolveMappingDialog'

const DECISIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired', label: 'Expired' },
]

function LearnerCard({ s }: { s: ScenarioView }) {
  return (
    <div className="grid gap-1.5 rounded-xl border bg-sand/50 p-4 text-sm">
      <p className="font-medium text-ink">Learner profile: {s.learner.name}</p>
      <p className="text-xs text-muted-foreground">
        {s.learner.display} · linked to {s.learner.crmId}
      </p>
      <p className="flex flex-wrap items-center gap-2">
        Licence status
        {s.licence ? (
          <StatusPill
            tone={
              s.licence.status === 'active'
                ? 'good'
                : s.licence.status === 'pending'
                  ? 'warn'
                  : 'bad'
            }
          >
            {s.licence.status}
          </StatusPill>
        ) : (
          <StatusPill tone="muted">Not tracked</StatusPill>
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        Source: CRM decision. Training results do not grant a licence.
      </p>
      {s.licence?.pending ? (
        <p className="text-xs text-muted-foreground">{s.licence.pending}</p>
      ) : null}
    </div>
  )
}

/** Run scenario: the presenter advances steps 1 to 7; gates are never skipped silently. */
export function ScenarioPanel() {
  const query = useQuery(scenarioQuery())
  const [last, setLast] = useState<AdvanceResult | null>(null)
  const [decision, setDecision] = useState<string | null>(null)
  const [fixEvent, setFixEvent] = useState<string | null>(null)
  const advance = useIntegrationMutation(advanceCrmScenario)
  const reset = useIntegrationMutation(resetCrmScenario, 'Scenario restarted.')

  if (query.isPending) return <CardsSkeleton count={1} className="grid" />
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
  const s = query.data
  const current = s.steps.find((x) => x.status === 'current')
  const blocked = last?.blocked === true
  const unmapped = blocked && last?.message.startsWith('Sync paused')
  const go = (input: Parameters<typeof advanceCrmScenario>[0] = {}) =>
    advance.mutate(input, { onSuccess: (r) => setLast(r.result) })

  return (
    <Panel
      title="Run scenario"
      description="Step through one learner's journey. You advance each step; the LMS applies its real rules at each one."
      action={<SimulatedTag label="Simulated CRM" />}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-4">
          <ol className="grid gap-2">
            {s.steps.map((step) => (
              <li
                key={step.n}
                aria-current={step.status === 'current' ? 'step' : undefined}
                className="flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm data-[current=true]:border-teal/40 data-[current=true]:bg-teal-mist/40"
                data-current={step.status === 'current'}
              >
                <span aria-hidden className="mt-0.5 text-teal">
                  {step.status === 'done' ? (
                    <Check className="size-4" />
                  ) : step.status === 'current' ? (
                    <ChevronRight className="size-4" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground" />
                  )}
                </span>
                <span className="grid gap-0.5">
                  <span className="font-medium text-ink">
                    {step.n}. {step.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {step.actor} ·{' '}
                    {step.status === 'done'
                      ? 'Done'
                      : step.status === 'current'
                        ? 'Next'
                        : 'Waiting'}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          {current?.n === 7 ? (
            <Field
              id="licence-decision"
              label="CRM licence decision"
              hint="The CRM decides. Pick the decision the simulated CRM returns."
            >
              <OptionSelect
                id="licence-decision"
                value={decision}
                placeholder="Choose the CRM decision"
                onChange={setDecision}
                options={DECISIONS}
              />
            </Field>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={advance.isPending || s.complete}
              onClick={() =>
                go(
                  current?.n === 7
                    ? { licenceDecision: (decision ?? undefined) as LicenceStatus | undefined }
                    : {},
                )
              }
            >
              {s.complete ? 'Scenario complete' : `Advance to step ${current?.n ?? 1}`}
            </Button>
            {blocked && !unmapped && current && current.n >= 3 && current.n <= 5 ? (
              <Button
                variant="outline"
                disabled={advance.isPending}
                onClick={() => go({ simulateEvidence: true })}
              >
                <ShieldQuestion /> Continue with simulated evidence
              </Button>
            ) : null}
            {unmapped && last?.events[0] ? (
              <Button
                variant="outline"
                onClick={() => setFixEvent(last.events[0]?.eventId ?? null)}
              >
                Resolve mapping
              </Button>
            ) : null}
            <Button
              variant="ghost"
              disabled={reset.isPending}
              onClick={() => reset.mutate(undefined, { onSuccess: () => setLast(null) })}
            >
              <RotateCcw /> Restart
            </Button>
          </div>

          {last ? (
            <p
              role={blocked ? 'alert' : 'status'}
              className={
                blocked
                  ? 'rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink'
                  : 'rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-sm text-ink'
              }
            >
              {last.message}
            </p>
          ) : null}
          {s.simulatedEvidence ? (
            <p className="text-xs text-muted-foreground">
              This run uses labelled simulated evidence for unmet gates. No LMS record was changed
              and no certificate was created.
            </p>
          ) : null}
        </div>

        <div className="grid content-start gap-4">
          <LearnerCard s={s} />
          {s.log.length > 0 ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium text-ink">Run log</p>
              <ol className="grid max-h-72 gap-2 overflow-auto text-xs">
                {[...s.log].reverse().map((l) => (
                  <li
                    key={`${l.at}-${l.step}-${l.result.slice(0, 12)}`}
                    className="rounded-md border p-2"
                  >
                    <span className="font-medium text-ink">Step {l.step}</span> · {qDateTime(l.at)}
                    {l.simulated ? ' · simulated' : ''}
                    <span className="mt-0.5 block text-muted-foreground">{l.result}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </div>
      <ResolveMappingDialog eventId={fixEvent} crmCode="QT-A" onClose={() => setFixEvent(null)} />
    </Panel>
  )
}
