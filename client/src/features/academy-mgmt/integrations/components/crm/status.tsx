import { ArrowRight } from 'lucide-react'
import type { CrmEventView } from '@/services/crm/views'
import { StatusPill, type Tone } from '../../../hub/components/StatusPill'

const STATUS: Record<CrmEventView['status'], { tone: Tone; label: string }> = {
  processed: { tone: 'good', label: 'Processed' },
  queued: { tone: 'warn', label: 'Queued' },
  failed: { tone: 'bad', label: 'Failed' },
  conflict: { tone: 'warn', label: 'Conflict' },
}

export function EventStatusPill({ status }: { status: CrmEventView['status'] }) {
  const { tone, label } = STATUS[status]
  return <StatusPill tone={tone}>{label}</StatusPill>
}

/** "CRM to LMS" with an arrow, so direction never relies on colour. */
export function DirectionLabel({ source, destination }: { source: string; destination: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {source}
      <ArrowRight aria-label="to" className="size-3.5 text-muted-foreground" />
      {destination}
    </span>
  )
}

export const TYPE_LABEL: Record<CrmEventView['type'], string> = {
  enrolment: 'Enrolment',
  completion: 'Completion',
  examination: 'Examination',
  certification: 'Certification',
  licence: 'Licence status',
}
