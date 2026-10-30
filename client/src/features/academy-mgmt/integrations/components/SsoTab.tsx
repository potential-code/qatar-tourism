import { useQuery } from '@tanstack/react-query'
import { KeyRound, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type SsoInput, saveSsoConfig } from '@/services/integrations.service'
import {
  beginSsoTest,
  completeSsoTest,
  type IdpAssertion,
  type SsoTestResult,
} from '@/services/sso-test.service'
import { Field } from '../../hub/components/Field'
import { OptionSelect } from '../../hub/components/OptionSelect'
import { Panel } from '../../hub/components/Panel'
import { CardsSkeleton, ErrorPanel } from '../../hub/components/QueryStates'
import { qDateTime } from '../../hub/utils/format'
import { snapshotQuery, useIntegrationMutation } from '../queries/integrations.queries'
import { FlowStrip } from './FlowStrip'
import { IdpDialog } from './IdpDialog'
import { FieldNote, issueMap, ReadOnlyValue, StateBadge } from './shared'

const PROTOCOLS = [
  { value: 'saml', label: 'SAML 2.0' },
  { value: 'oidc', label: 'OpenID Connect' },
]

/** SSO: provider settings, role mapping and the mock-IdP Test sign in. */
export function SsoTab() {
  const query = useQuery(snapshotQuery())
  const [form, setForm] = useState<SsoInput | null>(null)
  const [assertion, setAssertion] = useState<IdpAssertion | null>(null)
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<SsoTestResult | null>(null)

  useEffect(() => {
    if (query.data && !form) {
      const { providerName, protocol, entityId, roleMapping } = query.data.sso
      setForm({ providerName, protocol, entityId, roleMapping })
    }
  }, [query.data, form])

  const save = useIntegrationMutation(
    saveSsoConfig,
    'Demo configuration saved. Run Test sign in to check it.',
  )
  const begin = useIntegrationMutation(beginSsoTest)
  const complete = useIntegrationMutation(completeSsoTest)

  if (query.isPending || !form) return <CardsSkeleton count={2} className="grid gap-5" />
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
  const sso = query.data.sso
  const errors = issueMap(save.error)
  const startTest = () =>
    begin.mutate(undefined, {
      onSuccess: (a) => {
        setAssertion(a)
        setOpen(true)
      },
    })
  const choose = (outcome: 'approve' | 'fail') =>
    complete.mutate(outcome, {
      onSuccess: (r) => {
        setResult(r)
        setOpen(false)
      },
    })

  return (
    <div className="grid gap-6">
      <Panel
        title="Single sign-on"
        description="Federation with a customer identity provider is optional and needs configuration. One Academy account spans every programme either way."
        action={<StateBadge state={sso.state} />}
      >
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate(form)
          }}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field id="sso-name" label="Provider display name" error={errors.providerName}>
              <Input
                id="sso-name"
                value={form.providerName}
                onChange={(e) => setForm({ ...form, providerName: e.target.value })}
                aria-invalid={Boolean(errors.providerName)}
              />
            </Field>
            <Field id="sso-protocol" label="Protocol" error={errors.protocol}>
              <OptionSelect
                id="sso-protocol"
                value={form.protocol}
                onChange={(v) =>
                  v && setForm({ ...form, protocol: v === 'oidc' ? 'oidc' : 'saml' })
                }
                options={PROTOCOLS}
              />
            </Field>
            <Field id="sso-entity" label="Metadata / issuer address (demo)" error={errors.entityId}>
              <Input
                id="sso-entity"
                value={form.entityId}
                onChange={(e) => setForm({ ...form, entityId: e.target.value })}
                aria-invalid={Boolean(errors.entityId)}
              />
            </Field>
            <ReadOnlyValue
              label="Client secret (masked)"
              value={sso.maskedSecret}
              hint="A placeholder. No real secret is stored or shown in the browser."
            />
            <Field
              id="sso-learner"
              label="Learner role mapping"
              hint="Provider group that maps to the Academy learner role."
              error={errors.learnerRole}
            >
              <Input
                id="sso-learner"
                value={form.roleMapping.learner}
                onChange={(e) =>
                  setForm({
                    ...form,
                    roleMapping: { ...form.roleMapping, learner: e.target.value },
                  })
                }
              />
            </Field>
            <Field
              id="sso-trainer"
              label="Trainer role mapping"
              hint="Provider group that maps to the Academy trainer role."
              error={errors.trainerRole}
            >
              <Input
                id="sso-trainer"
                value={form.roleMapping.trainer}
                onChange={(e) =>
                  setForm({
                    ...form,
                    roleMapping: { ...form.roleMapping, trainer: e.target.value },
                  })
                }
              />
            </Field>
          </div>
          <FieldNote id="sso" error={errors['']} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving' : 'Save demo configuration'}
            </Button>
            <Button type="button" variant="outline" onClick={startTest} disabled={begin.isPending}>
              <KeyRound /> Test sign in
            </Button>
            <p className="text-xs text-muted-foreground">
              Last test: {sso.lastTestAt ? qDateTime(sso.lastTestAt) : 'not run'}
            </p>
          </div>
        </form>
      </Panel>

      <Panel
        title="Test sign in"
        description="The test hands over to a mock identity provider and returns to the same learner account."
      >
        <div className="grid gap-4">
          <FlowStrip
            statuses={
              result
                ? result.ok
                  ? ['passed', 'passed', 'passed', 'passed']
                  : ['passed', 'failed', 'skipped', 'skipped']
                : []
            }
          />
          {result?.ok ? (
            <p
              role="status"
              className="rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-sm text-ink"
            >
              {result.message}
            </p>
          ) : result ? (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm"
            >
              <p className="grow text-ink">
                <span className="font-medium">Test failed. </span>
                {result.reason}
              </p>
              <Button size="sm" variant="outline" onClick={startTest}>
                <RotateCcw /> Retry
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Run Test sign in to see the flow.</p>
          )}
        </div>
      </Panel>

      <IdpDialog
        open={open}
        onOpenChange={setOpen}
        assertion={assertion}
        pending={complete.isPending}
        onChoose={choose}
      />
    </div>
  )
}
