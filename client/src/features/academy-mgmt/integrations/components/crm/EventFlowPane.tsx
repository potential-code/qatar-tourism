import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Building2, GraduationCap } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { CrmEventView } from '@/services/crm/views'
import { Panel } from '../../../hub/components/Panel'
import { CardsSkeleton, ErrorPanel } from '../../../hub/components/QueryStates'
import { qDateTime } from '../../../hub/utils/format'
import { crmEventsQuery } from '../../queries/integrations.queries'
import { EventDetailDialog } from './EventDetailDialog'
import { EventStatusPill, TYPE_LABEL } from './status'

/** A track of moving dots. With reduced motion the dots stand still and the arrow stays. */
function AnimatedArrow({ direction }: { direction: 'right' | 'left' }) {
  const reduce = useReducedMotion()
  const Arrow = direction === 'right' ? ArrowRight : ArrowLeft
  return (
    <div
      aria-hidden
      className={cn(
        'relative flex h-6 items-center text-teal',
        direction === 'left' && 'flex-row-reverse',
      )}
    >
      <div className="relative h-0.5 grow overflow-hidden rounded-full bg-teal/25">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute top-0 h-0.5 w-6 rounded-full bg-teal"
            style={{ left: reduce ? `${i * 33 + 8}%` : '-2rem' }}
            animate={reduce ? undefined : { left: ['-10%', '110%'] }}
            transition={{
              duration: 2.4,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
              delay: i * 0.8,
            }}
          />
        ))}
      </div>
      <Arrow className="size-5 shrink-0" />
    </div>
  )
}

function EventCard({ event, onOpen }: { event: CrmEventView; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full gap-1 rounded-lg border bg-card px-3 py-2 text-start text-sm shadow-xs transition-colors hover:border-teal/40 hover:bg-teal-mist/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-ink">
          {event.eventId}: {TYPE_LABEL[event.type]}
        </span>
        <EventStatusPill status={event.status} />
      </span>
      <span className="text-xs text-muted-foreground">
        {event.learnerDisplayId ?? event.externalLearnerId ?? 'Unmatched'} ·{' '}
        {qDateTime(event.occurredAt)}
      </span>
    </button>
  )
}

function SidePanel({
  title,
  icon,
  items,
}: {
  title: string
  icon: React.ReactNode
  items: string[]
}) {
  return (
    <div className="grid content-start gap-3 rounded-xl border bg-sand/50 p-4">
      <p className="flex items-center gap-2 font-medium text-ink">
        <span aria-hidden className="text-teal">
          {icon}
        </span>
        {title}
      </p>
      <ul className="grid gap-1 text-xs text-muted-foreground">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

/** Event Flow: CRM and LMS panels, animated directional arrows and clickable event cards. */
export function EventFlowPane() {
  const query = useQuery(crmEventsQuery())
  const [open, setOpen] = useState<CrmEventView | null>(null)
  if (query.isPending) return <CardsSkeleton count={3} />
  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
  const inbound = query.data.filter((e) => e.direction === 'crm_to_lms').slice(0, 6)
  const outbound = query.data.filter((e) => e.direction === 'lms_to_crm').slice(0, 6)

  return (
    <Panel
      title="Event flow"
      description="Learner LRN-0042 is linked to CRM-0042. Select an event card to see its payload and result."
    >
      <div className="grid gap-5 lg:grid-cols-[14rem_1fr_14rem]">
        <SidePanel
          title="CRM (simulated)"
          icon={<Building2 className="size-4" />}
          items={[
            'Learner CRM-0042',
            'Programme codes',
            'Exam and certificate records',
            'Licence decisions (authority)',
          ]}
        />
        <div className="grid gap-6">
          <section aria-label="CRM to LMS events" className="grid gap-3">
            <p className="text-sm font-medium text-ink">CRM to LMS</p>
            <AnimatedArrow direction="right" />
            {inbound.map((e) => (
              <EventCard key={e.eventId} event={e} onOpen={() => setOpen(e)} />
            ))}
            {inbound.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events in this direction.</p>
            ) : null}
          </section>
          <section aria-label="LMS to CRM events" className="grid gap-3">
            <p className="text-sm font-medium text-ink">LMS to CRM</p>
            <AnimatedArrow direction="left" />
            {outbound.map((e) => (
              <EventCard key={e.eventId} event={e} onOpen={() => setOpen(e)} />
            ))}
            {outbound.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events in this direction.</p>
            ) : null}
          </section>
        </div>
        <SidePanel
          title="LMS (this Academy)"
          icon={<GraduationCap className="size-4" />}
          items={[
            'Learner LRN-0042',
            'Enrolments and approvals',
            'Assessment results',
            'Credentials and licence view',
          ]}
        />
      </div>
      <EventDetailDialog event={open} onClose={() => setOpen(null)} />
    </Panel>
  )
}
