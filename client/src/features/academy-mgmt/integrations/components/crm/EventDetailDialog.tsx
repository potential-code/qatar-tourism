import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CrmEventView } from '@/services/crm/views'
import { qDateTime } from '../../../hub/utils/format'
import { DirectionLabel, EventStatusPill, TYPE_LABEL } from './status'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  )
}

/** One event: id, type, timestamp, source, destination, learner, entity, payload and result. */
export function EventDetailDialog({
  event,
  onClose,
}: {
  event: CrmEventView | null
  onClose: () => void
}) {
  return (
    <Dialog open={event !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        {event ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-normal">
                {event.eventId}: {TYPE_LABEL[event.type]}
              </DialogTitle>
              <DialogDescription>
                Simulated event. The event ID is immutable and is used to stop duplicates.
              </DialogDescription>
            </DialogHeader>
            <dl className="grid gap-2.5">
              <Row label="Event ID">{event.eventId}</Row>
              <Row label="Type">{TYPE_LABEL[event.type]}</Row>
              <Row label="Timestamp">{qDateTime(event.occurredAt)} Qatar time</Row>
              <Row label="Source">{event.source}</Row>
              <Row label="Destination">{event.destination}</Row>
              <Row label="Direction">
                <DirectionLabel source={event.source} destination={event.destination} />
              </Row>
              <Row label="Learner ID">
                {event.learnerDisplayId ?? 'Not matched'}
                {event.learnerName ? ` (${event.learnerName})` : ''}
                {event.externalLearnerId ? `, CRM ${event.externalLearnerId}` : ''}
              </Row>
              <Row label="Enrolment or credential">{event.entityLabel ?? 'None yet'}</Row>
              <Row label="Result">
                <span className="inline-flex flex-wrap items-center gap-2">
                  <EventStatusPill status={event.status} />
                  {event.attempts} attempt{event.attempts === 1 ? '' : 's'}
                </span>
              </Row>
              {event.error ? <Row label="Message">{event.error}</Row> : null}
            </dl>
            <div className="grid gap-1.5">
              <p className="text-sm font-medium text-ink">Payload preview</p>
              <pre
                // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region needs keyboard focus
                tabIndex={0}
                className="max-h-56 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100"
              >
                {event.payloadPreview}
              </pre>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
