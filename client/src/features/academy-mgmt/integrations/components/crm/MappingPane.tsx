import { useMutation, useQuery } from '@tanstack/react-query'
import { Pencil, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
import type { MappingPreview } from '@/services/crm/mapping'
import {
  type MappingPatch,
  type MappingRowView,
  previewCrmMapping,
  updateCrmMapping,
} from '@/services/crm-mapping.service'
import { Field } from '../../../hub/components/Field'
import { OptionSelect } from '../../../hub/components/OptionSelect'
import { Panel } from '../../../hub/components/Panel'
import { ErrorPanel, TableSkeleton } from '../../../hub/components/QueryStates'
import { StatusPill } from '../../../hub/components/StatusPill'
import { TableFrame } from '../../../hub/components/TableFrame'
import {
  crmMappingsQuery,
  errorMessage,
  useIntegrationMutation,
} from '../../queries/integrations.queries'
import { issueMap } from '../shared'

const DIRECTION_LABEL = { crm_to_lms: 'CRM to LMS', lms_to_crm: 'LMS to CRM', both: 'Both ways' }
const DIRECTIONS = Object.entries(DIRECTION_LABEL).map(([value, label]) => ({ value, label }))
const SYSTEMS = [
  { value: 'crm', label: 'CRM' },
  { value: 'lms', label: 'LMS' },
]

/** Field Mapping: the rows, with an editor that previews the effect on a synthetic record. */
export function MappingPane() {
  const query = useQuery(crmMappingsQuery())
  const [editing, setEditing] = useState<MappingRowView | null>(null)
  return (
    <Panel
      title="Field mapping"
      description="Which CRM field feeds which LMS field, in which direction, and which system wins a disagreement."
      bodyClassName="p-0"
    >
      {query.isPending ? (
        <TableSkeleton rows={6} cols={7} />
      ) : query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          {query.data.unmappedCodes.length > 0 ? (
            <p
              role="alert"
              className="flex items-start gap-2 border-b bg-warning/10 px-6 py-3 text-sm text-ink"
            >
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
              CRM programme code {query.data.unmappedCodes.join(', ')} has no LMS mapping. Events
              that carry it pause until it is mapped (see Sync Log).
            </p>
          ) : null}
          <TableFrame label="Field mapping">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CRM field</TableHead>
                  <TableHead>LMS field</TableHead>
                  <TableHead>Data type</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Transformation</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Authoritative system</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.fields.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.crmField}</TableCell>
                    <TableCell className="font-mono text-xs">{r.lmsField}</TableCell>
                    <TableCell>{r.dataType}</TableCell>
                    <TableCell>{DIRECTION_LABEL[r.direction]}</TableCell>
                    <TableCell className="max-w-xs whitespace-normal">{r.transformation}</TableCell>
                    <TableCell>{r.required ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <StatusPill tone={r.authoritative === 'crm' ? 'info' : 'neutral'}>
                        {r.authoritative === 'crm' ? 'CRM' : 'LMS'}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(r)}
                        aria-label={`Edit ${r.crmField}`}
                      >
                        <Pencil /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableFrame>
        </>
      )}
      <MappingEditor row={editing} onClose={() => setEditing(null)} />
    </Panel>
  )
}

function MappingEditor({ row, onClose }: { row: MappingRowView | null; onClose: () => void }) {
  const [draft, setDraft] = useState<MappingPatch>({})
  const [sample, setSample] = useState('')
  const [preview, setPreview] = useState<MappingPreview | null>(null)

  useEffect(() => {
    if (row) {
      setDraft({
        lmsField: row.lmsField,
        dataType: row.dataType,
        direction: row.direction,
        transformation: row.transformation,
        required: row.required,
        authoritative: row.authoritative,
      })
      setSample(row.sample)
      setPreview(null)
    }
  }, [row])

  const run = useMutation({
    mutationFn: () => previewCrmMapping(row?.id ?? '', draft, sample),
    onSuccess: setPreview,
  })
  const save = useIntegrationMutation(
    () => updateCrmMapping(row?.id ?? '', draft),
    'Mapping saved (demo configuration).',
  )
  const errors = issueMap(save.error ?? run.error)

  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">
            Edit {row?.crmField}
          </DialogTitle>
          <DialogDescription>
            Change the row, then preview its effect on a synthetic record before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="map-lms" label="LMS field" error={errors.lmsField}>
            <Input
              id="map-lms"
              value={draft.lmsField ?? ''}
              onChange={(e) => setDraft({ ...draft, lmsField: e.target.value })}
            />
          </Field>
          <Field id="map-type" label="Data type">
            <Input
              id="map-type"
              value={draft.dataType ?? ''}
              onChange={(e) => setDraft({ ...draft, dataType: e.target.value })}
            />
          </Field>
          <Field id="map-direction" label="Direction" error={errors.direction}>
            <OptionSelect
              id="map-direction"
              value={draft.direction}
              onChange={(v) =>
                v && setDraft({ ...draft, direction: v as MappingPatch['direction'] })
              }
              options={DIRECTIONS}
            />
          </Field>
          <Field id="map-auth" label="Authoritative system" error={errors.authoritative}>
            <OptionSelect
              id="map-auth"
              value={draft.authoritative}
              onChange={(v) =>
                v && setDraft({ ...draft, authoritative: v as MappingPatch['authoritative'] })
              }
              options={SYSTEMS}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field
              id="map-transform"
              label="Transformation"
              hint="For a value map write entries like: Value map: QT-A to Program A, QT-B to Program B"
              error={errors.transformation}
            >
              <Input
                id="map-transform"
                value={draft.transformation ?? ''}
                onChange={(e) => setDraft({ ...draft, transformation: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="map-required"
              checked={draft.required ?? false}
              onCheckedChange={(v) => setDraft({ ...draft, required: v })}
            />
            <Label htmlFor="map-required">Required</Label>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border bg-sand/50 p-4">
          <p className="text-sm font-medium text-ink">Preview on a synthetic record</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-52 grow gap-1.5">
              <Label htmlFor="map-sample">Sample CRM value</Label>
              <Input id="map-sample" value={sample} onChange={(e) => setSample(e.target.value)} />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={run.isPending}
              onClick={() => run.mutate()}
            >
              Preview effect
            </Button>
          </div>
          {run.isError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errorMessage(run.error)}
            </p>
          ) : null}
          {preview ? (
            <div className="grid gap-2 text-sm" aria-live="polite">
              <p>
                <span className="text-muted-foreground">Result: </span>
                <span className="font-mono">
                  {preview.output === null ? 'no value' : String(preview.output)}
                </span>
              </p>
              <p>{preview.effect}</p>
              <p>
                <span className="text-muted-foreground">Authoritative system: </span>
                <span className="font-medium">{preview.authoritativeLabel}</span>
              </p>
              {preview.conflicts.length > 0 ? (
                <ul className="grid gap-1.5">
                  {preview.conflicts.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-destructive">
                      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                      <span>
                        <span className="font-medium">Conflict. </span>
                        {c}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-success">No conflicts.</p>
              )}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() => save.mutate(undefined, { onSuccess: onClose })}
          >
            {save.isPending ? 'Saving' : 'Save mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
