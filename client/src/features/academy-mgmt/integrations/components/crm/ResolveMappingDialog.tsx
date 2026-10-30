import { useMutation } from '@tanstack/react-query'
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
import type { ProgrammeLetter } from '@/services/crm/mapping'
import { retryCrmEvent } from '@/services/crm.service'
import {
  previewResolveMapping,
  type ResolvePreview,
  resolveCrmMapping,
} from '@/services/crm-mapping.service'
import { Field } from '../../../hub/components/Field'
import { OptionSelect } from '../../../hub/components/OptionSelect'
import { errorMessage, useIntegrationMutation } from '../../queries/integrations.queries'

const PROGRAMMES = [
  { value: 'A', label: 'Program A' },
  { value: 'B', label: 'Program B' },
  { value: 'C', label: 'Program C' },
]

/** Select the programme, preview the mapping change, save it, then retry the event. */
export function ResolveMappingDialog({
  eventId,
  crmCode,
  onClose,
}: {
  eventId: string | null
  crmCode: string
  onClose: () => void
}) {
  const [programme, setProgramme] = useState<ProgrammeLetter | null>(null)
  const [preview, setPreview] = useState<ResolvePreview | null>(null)
  const [saved, setSaved] = useState(false)
  const [outcome, setOutcome] = useState<string | null>(null)

  useEffect(() => {
    if (eventId) {
      setProgramme(null)
      setPreview(null)
      setSaved(false)
      setOutcome(null)
    }
  }, [eventId])

  const previewMutation = useMutation({
    mutationFn: (p: ProgrammeLetter) => previewResolveMapping(eventId ?? '', p),
    onSuccess: setPreview,
  })
  const apply = useIntegrationMutation(
    (p: ProgrammeLetter) => resolveCrmMapping(eventId ?? '', p),
    'Mapping saved. Retry the event to process it.',
  )
  const retry = useIntegrationMutation(() => retryCrmEvent(eventId ?? ''))

  return (
    <Dialog open={eventId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Resolve mapping</DialogTitle>
          <DialogDescription>
            CRM programme code {crmCode} does not have an LMS mapping. Select the programme, preview
            the change and retry {eventId}.
          </DialogDescription>
        </DialogHeader>
        <Field id="resolve-programme" label={`LMS programme for ${crmCode}`}>
          <OptionSelect
            id="resolve-programme"
            value={programme}
            placeholder="Select a programme"
            onChange={(v) => {
              const next = v as ProgrammeLetter | null
              setProgramme(next)
              setSaved(false)
              setOutcome(null)
              if (next) previewMutation.mutate(next)
            }}
            options={PROGRAMMES}
          />
        </Field>
        {previewMutation.isError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errorMessage(previewMutation.error)}
          </p>
        ) : null}
        {preview ? (
          <div className="grid gap-2 rounded-xl border bg-sand/50 p-4 text-sm" aria-live="polite">
            <p className="font-medium text-ink">Preview of the change</p>
            <p>
              <span className="text-muted-foreground">Before: </span>
              <span className="font-mono text-xs">{preview.before}</span>
            </p>
            <p>
              <span className="text-muted-foreground">After: </span>
              <span className="font-mono text-xs">{preview.after}</span>
            </p>
            <p>{preview.effect}</p>
            {preview.alsoFixes.length > 0 ? (
              <p className="text-muted-foreground">Also unblocks: {preview.alsoFixes.join(', ')}</p>
            ) : null}
          </div>
        ) : null}
        {outcome ? (
          <p
            role="status"
            className="rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-sm text-ink"
          >
            {outcome}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            disabled={!programme || !preview || saved || apply.isPending}
            onClick={() =>
              programme && apply.mutate(programme, { onSuccess: () => setSaved(true) })
            }
          >
            {apply.isPending ? 'Saving' : 'Save mapping'}
          </Button>
          <Button
            disabled={!saved || retry.isPending}
            onClick={() => retry.mutate(undefined, { onSuccess: (r) => setOutcome(r.message) })}
          >
            Retry event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
