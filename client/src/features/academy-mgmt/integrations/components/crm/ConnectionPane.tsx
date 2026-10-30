import { useQuery } from '@tanstack/react-query'
import { Pause, Play, PlugZap, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { CRM_CATEGORIES } from '@/services/crm/common'
import {
  type CrmConnectionInput,
  runCrmDemoSync,
  saveCrmConnection,
  setCrmOutage,
  setCrmPaused,
  testCrmConnection,
} from '@/services/crm.service'
import { Field } from '../../../hub/components/Field'
import { OptionSelect } from '../../../hub/components/OptionSelect'
import { Panel } from '../../../hub/components/Panel'
import { CardsSkeleton, ErrorPanel } from '../../../hub/components/QueryStates'
import { StatusPill } from '../../../hub/components/StatusPill'
import { qDateTime } from '../../../hub/utils/format'
import { crmConnectionQuery, useIntegrationMutation } from '../../queries/integrations.queries'
import { CheckGroup, issueMap, ReadOnlyValue, StateBadge } from '../shared'

const DIRECTIONS = [
  { value: 'both', label: 'Two-way (CRM and LMS)' },
  { value: 'crm_to_lms', label: 'CRM to LMS only' },
  { value: 'lms_to_crm', label: 'LMS to CRM only' },
]
const TRIGGERS = [
  { value: 'event-driven', label: 'Event-driven' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'manual', label: 'Manual' },
]

/** Connection: demo settings, Test connection, Save, Pause sync and Run demo sync. */
export function ConnectionPane() {
  const query = useQuery(crmConnectionQuery())
  const [form, setForm] = useState<CrmConnectionInput | null>(null)
  const [testNote, setTestNote] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (query.data && !form) {
      const c = query.data
      setForm({
        name: c.name,
        environment: c.environment,
        endpoint: c.endpoint,
        authMethod: c.authMethod,
        syncDirection: c.syncDirection,
        triggerMode: c.triggerMode,
        enabledCategories: c.enabledCategories,
      })
    }
  }, [query.data, form])

  const save = useIntegrationMutation(
    saveCrmConnection,
    'Demo configuration saved. No network call was made.',
  )
  const test = useIntegrationMutation(testCrmConnection)
  const pause = useIntegrationMutation(setCrmPaused, (c) =>
    c.paused ? 'Sync paused. New events are kept in the queue.' : 'Sync resumed.',
  )
  const outage = useIntegrationMutation(setCrmOutage, (c) =>
    c.simulateOutage ? 'Simulated outage on. Events stay queued.' : 'Simulated outage off.',
  )
  const sync = useIntegrationMutation(runCrmDemoSync, (r) => {
    const done = r.results.filter((x) => x.status === 'processed').length
    const queued = r.results.filter((x) => x.status === 'queued').length
    return queued > 0
      ? `Demo sync ran: ${done} delivered, ${queued} kept queued for retry.`
      : `Demo sync ran: ${done} event${done === 1 ? '' : 's'} delivered.`
  })

  if (query.isPending || !form) return <CardsSkeleton count={1} className="grid gap-5" />
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
  const crm = query.data
  const errors = issueMap(save.error)

  return (
    <Panel
      title="Connection"
      description="Demo settings for the simulated CRM. No network call is made."
      action={<StateBadge state={crm.state} />}
    >
      <form
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate(form)
        }}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="crm-name" label="CRM name" error={errors.name}>
            <Input
              id="crm-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              aria-invalid={Boolean(errors.name)}
            />
          </Field>
          <Field id="crm-env" label="Environment" error={errors.environment}>
            <Input
              id="crm-env"
              value={form.environment}
              onChange={(e) => setForm({ ...form, environment: e.target.value })}
            />
          </Field>
          <Field id="crm-endpoint" label="Demo endpoint" error={errors.endpoint}>
            <Input
              id="crm-endpoint"
              value={form.endpoint}
              onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
              aria-invalid={Boolean(errors.endpoint)}
            />
          </Field>
          <Field id="crm-auth" label="Authentication method" error={errors.authMethod}>
            <Input
              id="crm-auth"
              value={form.authMethod}
              onChange={(e) => setForm({ ...form, authMethod: e.target.value })}
            />
          </Field>
          <ReadOnlyValue
            label="Credential (masked)"
            value={crm.maskedCredential}
            hint="A placeholder. No real secret is stored or shown in the browser."
          />
          <div className="grid gap-1.5">
            <p className="text-sm font-medium text-ink">Last test</p>
            <p className="rounded-lg border bg-sand/60 px-3 py-2 text-sm">
              {crm.lastTestAt ? `${qDateTime(crm.lastTestAt)} Qatar time (simulated)` : 'Not run'}
            </p>
          </div>
          <Field id="crm-direction" label="Sync direction" error={errors.syncDirection}>
            <OptionSelect
              id="crm-direction"
              value={form.syncDirection}
              onChange={(v) =>
                v && setForm({ ...form, syncDirection: v as CrmConnectionInput['syncDirection'] })
              }
              options={DIRECTIONS}
            />
          </Field>
          <Field id="crm-trigger" label="Trigger mode" error={errors.triggerMode}>
            <OptionSelect
              id="crm-trigger"
              value={form.triggerMode}
              onChange={(v) =>
                v && setForm({ ...form, triggerMode: v as CrmConnectionInput['triggerMode'] })
              }
              options={TRIGGERS}
            />
          </Field>
        </div>
        <CheckGroup
          legend="Enabled event categories"
          idPrefix="crm-cat"
          options={CRM_CATEGORIES}
          value={form.enabledCategories}
          onChange={(next) =>
            setForm({ ...form, enabledCategories: next as CrmConnectionInput['enabledCategories'] })
          }
          error={errors.enabledCategories}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving' : 'Save demo configuration'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={test.isPending}
            onClick={() =>
              test.mutate(undefined, {
                onSuccess: (r) => setTestNote({ ok: r.ok, text: r.message }),
              })
            }
          >
            <PlugZap /> Test connection
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pause.isPending}
            onClick={() => pause.mutate(!crm.paused)}
          >
            {crm.paused ? <Play /> : <Pause />} {crm.paused ? 'Resume sync' : 'Pause sync'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={sync.isPending || crm.paused}
            onClick={() => sync.mutate(undefined)}
          >
            <RefreshCw /> Run demo sync
          </Button>
          {crm.paused ? <StatusPill tone="warn">Sync paused</StatusPill> : null}
        </div>
        {testNote ? (
          <p
            role="status"
            className={
              testNote.ok ? 'text-sm text-success' : 'text-sm font-medium text-destructive'
            }
          >
            {testNote.text}
          </p>
        ) : null}

        <div className="flex items-start gap-3 rounded-xl border border-dashed p-4">
          <Switch
            id="crm-outage"
            checked={crm.simulateOutage}
            onCheckedChange={(v) => outage.mutate(v)}
            disabled={outage.isPending}
          />
          <div className="grid gap-0.5">
            <Label htmlFor="crm-outage">Simulate a CRM outage (presenter control)</Label>
            <p className="text-xs text-muted-foreground">
              While on, delivery to the CRM fails and each event is kept in the queue for retry.
              Turn it off and run a demo sync to deliver them.
            </p>
          </div>
        </div>
      </form>
    </Panel>
  )
}
