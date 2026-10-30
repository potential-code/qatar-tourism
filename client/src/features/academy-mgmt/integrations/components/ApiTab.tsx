import { useQuery } from '@tanstack/react-query'
import { Braces, PlugZap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CONNECTION_TYPES,
  EVENT_CATEGORIES,
  READ_SCOPES,
  WRITE_SCOPES,
} from '@/services/integrations/settings'
import {
  type ApiInput,
  getApiSample,
  saveApiConfig,
  testApiConnection,
} from '@/services/integrations.service'
import { Field } from '../../hub/components/Field'
import { OptionSelect } from '../../hub/components/OptionSelect'
import { Panel } from '../../hub/components/Panel'
import { CardsSkeleton, ErrorPanel } from '../../hub/components/QueryStates'
import { qDateTime } from '../../hub/utils/format'
import { snapshotQuery, useIntegrationMutation } from '../queries/integrations.queries'
import { CheckGroup, issueMap, ReadOnlyValue, StateBadge } from './shared'

type Sample = Awaited<ReturnType<typeof getApiSample>>

/** API Access: demo base URL, scopes, categories, masked credential and a sample exchange. */
export function ApiTab() {
  const query = useQuery(snapshotQuery())
  const [form, setForm] = useState<ApiInput | null>(null)
  const [sample, setSample] = useState<Sample | null>(null)

  useEffect(() => {
    if (query.data && !form) {
      const { baseUrl, connectionType, eventCategories, scopes } = query.data.api
      setForm({ baseUrl, connectionType, eventCategories, scopes })
    }
  }, [query.data, form])

  const save = useIntegrationMutation(saveApiConfig, 'Demo configuration saved.')
  const test = useIntegrationMutation(
    testApiConnection,
    'Test passed (simulated). No request was sent.',
  )
  const viewSample = useIntegrationMutation(getApiSample)

  if (query.isPending || !form) return <CardsSkeleton count={2} className="grid gap-5" />
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
  const api = query.data.api
  const errors = issueMap(save.error)

  return (
    <div className="grid gap-6">
      <Panel
        title="API access"
        description="Which categories of events and which read and write scopes an external system may use."
        action={<StateBadge state={api.state} />}
      >
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate(form)
          }}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field id="api-url" label="Demo base URL" error={errors.baseUrl}>
              <Input
                id="api-url"
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                aria-invalid={Boolean(errors.baseUrl)}
              />
            </Field>
            <Field id="api-type" label="Connection type" error={errors.connectionType}>
              <OptionSelect
                id="api-type"
                value={form.connectionType}
                onChange={(v) =>
                  v && setForm({ ...form, connectionType: v as ApiInput['connectionType'] })
                }
                options={CONNECTION_TYPES.map((t) => ({ value: t, label: t }))}
              />
            </Field>
            <ReadOnlyValue
              label="Credential (masked)"
              value={api.maskedCredential}
              hint="A placeholder. No real secret is stored or shown in the browser."
            />
            <div className="grid gap-1.5">
              <p className="text-sm font-medium text-ink">Last test</p>
              <p className="rounded-lg border bg-sand/60 px-3 py-2 text-sm">
                {api.lastTestAt ? `${qDateTime(api.lastTestAt)} Qatar time (simulated)` : 'Not run'}
              </p>
            </div>
          </div>
          <CheckGroup
            legend="Permitted event categories"
            idPrefix="api-cat"
            options={EVENT_CATEGORIES}
            value={form.eventCategories}
            onChange={(eventCategories) => setForm({ ...form, eventCategories })}
            error={errors.eventCategories}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <CheckGroup
              legend="Read scopes"
              idPrefix="api-read"
              options={READ_SCOPES}
              value={form.scopes.read}
              onChange={(read) => setForm({ ...form, scopes: { ...form.scopes, read } })}
              error={errors.scopes}
            />
            <CheckGroup
              legend="Write scopes"
              idPrefix="api-write"
              options={WRITE_SCOPES}
              value={form.scopes.write}
              onChange={(write) => setForm({ ...form, scopes: { ...form.scopes, write } })}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving' : 'Save demo configuration'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={test.isPending}
              onClick={() => test.mutate(undefined)}
            >
              <PlugZap /> Test connection
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={viewSample.isPending}
              onClick={() => viewSample.mutate(undefined, { onSuccess: setSample })}
            >
              <Braces /> View sample request and response
            </Button>
          </div>
        </form>
      </Panel>

      {sample ? (
        <Panel title="Sample request and response" description={sample.note}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-1.5">
              <p className="text-sm font-medium text-ink">Request</p>
              <pre
                className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100"
                // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region needs keyboard focus
                tabIndex={0}
              >{`${sample.request.method} ${sample.request.url}\n${JSON.stringify(sample.request.headers, null, 2)}\n\n${JSON.stringify(sample.request.body, null, 2)}`}</pre>
            </div>
            <div className="grid gap-1.5">
              <p className="text-sm font-medium text-ink">Response</p>
              <pre
                className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100"
                // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region needs keyboard focus
                tabIndex={0}
              >{`${sample.response.status}\n${JSON.stringify(sample.response.body, null, 2)}`}</pre>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
