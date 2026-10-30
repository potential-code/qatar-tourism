import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type HostingInput, saveHostingConfig } from '@/services/integrations.service'
import { Field } from '../../hub/components/Field'
import { OptionSelect } from '../../hub/components/OptionSelect'
import { Panel } from '../../hub/components/Panel'
import { CardsSkeleton, ErrorPanel } from '../../hub/components/QueryStates'
import { TableFrame } from '../../hub/components/TableFrame'
import {
  packagesQuery,
  snapshotQuery,
  useIntegrationMutation,
} from '../queries/integrations.queries'
import { AccessAuditTable } from './AccessAuditTable'
import { ReadOnlyValue, StateBadge } from './shared'

const DOWNLOADS = [
  { value: 'admin_only', label: 'Administrators only' },
  { value: 'assigned_trainers', label: 'Assigned trainers and administrators' },
  { value: 'nobody', label: 'Nobody (launch only)' },
]

/** Content Hosting: package catalogue, launch and download settings, protected URL and access log. */
export function ContentHostingTab() {
  const query = useQuery(snapshotQuery())
  const packages = useQuery(packagesQuery())
  const [form, setForm] = useState<HostingInput | null>(null)
  useEffect(() => {
    if (query.data && !form) {
      setForm({
        authenticatedLaunch: query.data.hosting.authenticatedLaunch,
        downloadPermission: query.data.hosting.downloadPermission,
      })
    }
  }, [query.data, form])
  const save = useIntegrationMutation(saveHostingConfig, 'Demo configuration saved.')

  if (query.isPending || !form) return <CardsSkeleton count={2} className="grid gap-5" />
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
  const hosting = query.data.hosting

  return (
    <div className="grid gap-6">
      <Panel
        title="Package catalogue"
        description="Learning packages in the Content Library and who may launch them."
        bodyClassName="p-0"
      >
        {packages.data ? (
          <TableFrame label="Package catalogue">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Access group</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.data.map((p) => (
                  <TableRow key={p.packageId}>
                    <TableCell>
                      <span className="font-medium text-ink">{p.title}</span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {p.packageId}
                      </span>
                    </TableCell>
                    <TableCell lang={p.language.toLowerCase()}>{p.language}</TableCell>
                    <TableCell>{p.format}</TableCell>
                    <TableCell>{p.version}</TableCell>
                    <TableCell>{p.accessGroup}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableFrame>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">Loading the catalogue</div>
        )}
      </Panel>

      <Panel
        title="Launch and download"
        description="Settings only; nothing is hosted outside this demo."
        action={<StateBadge state={hosting.state} />}
      >
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate(form)
          }}
        >
          <div className="flex items-center gap-3">
            <Switch
              id="auth-launch"
              checked={form.authenticatedLaunch}
              onCheckedChange={(v) => setForm({ ...form, authenticatedLaunch: v })}
            />
            <Label htmlFor="auth-launch">
              Authenticated launch (sign in required to open a package)
            </Label>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field id="download" label="Download permission">
              <OptionSelect
                id="download"
                value={form.downloadPermission}
                onChange={(v) =>
                  v &&
                  setForm({ ...form, downloadPermission: v as HostingInput['downloadPermission'] })
                }
                options={DOWNLOADS}
              />
            </Field>
            <ReadOnlyValue
              label="Example protected content URL"
              value={hosting.exampleProtectedUrl}
              hint="Illustrative address. It does not resolve."
            />
          </div>
          <div>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving' : 'Save demo configuration'}
            </Button>
          </div>
        </form>
      </Panel>

      <AccessAuditTable />
    </div>
  )
}
