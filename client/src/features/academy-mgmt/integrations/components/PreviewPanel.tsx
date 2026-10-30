import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type Eye, LogIn, ShieldAlert, ShieldCheck, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Button } from '@/components/ui/button'
import {
  type AccessPreview,
  type PreviewPersona,
  previewAccess,
} from '@/services/integrations/access.service'
import { Panel } from '../../hub/components/Panel'
import { StatusPill } from '../../hub/components/StatusPill'
import { errorMessage } from '../queries/integrations.queries'
import { type FlowStatus, FlowStrip } from './FlowStrip'

const PERSONAS: { persona: PreviewPersona; label: string; icon: typeof Eye }[] = [
  { persona: 'learner', label: 'Preview as learner', icon: UserRound },
  { persona: 'trainer', label: 'Preview as external trainer', icon: Users },
  { persona: 'visitor', label: 'Preview as signed-out visitor', icon: LogIn },
]

/**
 * An in-page simulated preview. It evaluates the Academy's access rule for a persona and shows
 * the outcome; it never switches the real session.
 */
export function PreviewPanel() {
  const client = useQueryClient()
  const [result, setResult] = useState<AccessPreview | null>(null)
  const run = useMutation({
    mutationFn: (persona: PreviewPersona) => previewAccess(persona),
    onSuccess: (data) => {
      setResult(data)
      client.invalidateQueries({ queryKey: ['admin', 'integrations', 'audit'] })
    },
  })

  return (
    <Panel
      title="Access previews"
      description="See what each kind of user gets. These are labelled demo states; your own session is not switched."
      action={<SimulatedTag label="Demo state" />}
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map(({ persona, label, icon: Icon }) => (
            <Button
              key={persona}
              variant="outline"
              disabled={run.isPending}
              onClick={() => run.mutate(persona)}
            >
              <Icon /> {label}
            </Button>
          ))}
          <Button variant="ghost" disabled={run.isPending} onClick={() => run.mutate('unassigned')}>
            <ShieldAlert /> Try an unassigned learner
          </Button>
        </div>
        {run.isError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errorMessage(run.error)}
          </p>
        ) : null}
        {result ? (
          <PreviewResult result={result} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Choose a preview. The learner opens an assigned lesson; an unassigned learner is denied;
            a signed-out visitor is asked to sign in; the trainer sees only assigned cohorts and
            authorised content.
          </p>
        )}
      </div>
    </Panel>
  )
}

function PreviewResult({ result }: { result: AccessPreview }) {
  const statuses = result.steps.map((s) => s.status as FlowStatus)
  const ok = result.outcome === 'launched'
  return (
    <div className="grid gap-4" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill tone={ok ? 'good' : result.outcome === 'sign_in_required' ? 'warn' : 'bad'}>
          {ok
            ? 'Allowed'
            : result.outcome === 'sign_in_required'
              ? 'Sign in required'
              : 'Access denied'}
        </StatusPill>
        <p className="text-sm font-medium text-ink">{result.demoUser}</p>
      </div>
      <p className="text-sm text-ink/80">{result.headline}</p>
      <FlowStrip statuses={statuses} details={result.steps.map((s) => s.detail)} />
      {result.content ? (
        <div className="grid gap-1 rounded-xl border bg-sand/50 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-ink">
            <ShieldCheck aria-hidden className="size-4 text-teal" />
            {result.content.title} ({result.content.language})
          </p>
          <p className="break-all font-mono text-xs text-muted-foreground">
            {result.content.protectedUrl}
          </p>
          <p className="text-xs text-muted-foreground">
            Example protected address. It is not served from this demo.
          </p>
        </div>
      ) : null}
      {result.persona === 'visitor' ? (
        <div className="rounded-xl border border-dashed p-4 text-sm">
          <p className="font-medium text-ink">Sign in to continue</p>
          <p className="text-muted-foreground">
            Protected learning content opens only after sign in, identity check and Academy
            permissions.
          </p>
        </div>
      ) : null}
      {result.cohorts.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium text-ink">Assigned cohorts only</p>
          <ul className="grid gap-1 text-sm text-ink/80">
            {result.cohorts.map((c) => (
              <li key={c.code}>
                {c.code}: {c.title} ({c.learners} confirmed)
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.exports.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium text-ink">Export actions</p>
          <ul className="grid gap-1.5">
            {result.exports.map((e) => (
              <li key={e.label} className="flex flex-wrap items-center gap-2 text-sm">
                <StatusPill tone={e.allowed ? 'good' : 'bad'}>
                  {e.allowed ? 'Allowed, restricted' : 'Blocked'}
                </StatusPill>
                <span>{e.label}</span>
                <span className="text-xs text-muted-foreground">{e.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
