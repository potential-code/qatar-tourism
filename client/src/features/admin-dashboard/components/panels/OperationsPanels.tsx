import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { CalendarCheck, ClipboardList, Hourglass, MonitorPlay, Users } from 'lucide-react'
import { Meter } from '@/components/data'
import { EmptyState } from '@/components/ui/empty-state'
import type { Overview } from '../../queries/analytics.queries'
import { count, qatarDateTime } from '../../utils/format'
import { PanelCard } from '../PanelCard'

type OpenReport = (report: string, extra?: Record<string, string>) => void

/** Brief §12 operational panels: sessions nearing capacity, marking backlog, inactive learners. */
export function OperationsPanels({ data, openReport }: { data: Overview; openReport: OpenReport }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <CapacityPanel data={data} openReport={openReport} />
      <BacklogPanel data={data} openReport={openReport} />
      <InactivePanel data={data} openReport={openReport} />
    </div>
  )
}

function CapacityPanel({ data, openReport }: { data: Overview; openReport: OpenReport }) {
  const sessions = data.nearingCapacity
  return (
    <PanelCard
      title="Sessions nearing capacity"
      description="Upcoming sessions at 80% of seats or more."
      info={{
        label: data.definitions.sessionsNearingCapacity.label,
        definition: data.definitions.sessionsNearingCapacity.definition,
      }}
      delay={0.05}
    >
      {sessions.length === 0 ? (
        <EmptyState
          size="sm"
          icon={CalendarCheck}
          title="Plenty of seats"
          description="No upcoming session in this cohort is above 80% full."
        />
      ) : (
        <ul className="grid gap-4">
          {sessions.slice(0, 4).map((s) => (
            <li key={s.sessionId}>
              <Meter
                label={
                  <span className="flex items-center gap-1.5">
                    {s.format === 'online' ? (
                      <MonitorPlay className="size-3.5 text-teal" aria-label="Online" />
                    ) : (
                      <Users className="size-3.5 text-teal" aria-label="In person" />
                    )}
                    <span className="truncate">{s.title}</span>
                  </span>
                }
                value={s.confirmed}
                max={s.capacity}
                toneLabel={s.confirmed >= s.capacity ? 'Full' : 'Nearly full'}
                caption={`${s.code} · ${qatarDateTime(s.startsAt)} Qatar time · ${s.confirmed} of ${s.capacity} seats${s.waitlisted ? ` · ${s.waitlisted} waitlisted` : ''}`}
              />
            </li>
          ))}
        </ul>
      )}
      {data.nextFullest.length ? (
        <div className="mt-5 border-t pt-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Next most booked</p>
          <ul className="grid gap-3">
            {data.nextFullest.map((s) => (
              <li key={s.sessionId}>
                <Meter
                  label={<span className="truncate text-xs">{s.title}</span>}
                  value={s.confirmed}
                  max={s.capacity}
                  caption={`${s.code} · ${qatarDateTime(s.startsAt)} · ${s.confirmed} of ${s.capacity} seats`}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <PanelLink onClick={() => openReport('sessions', { view: 'upcoming' })}>
        View upcoming sessions
      </PanelLink>
    </PanelCard>
  )
}

function BacklogPanel({ data, openReport }: { data: Overview; openReport: OpenReport }) {
  const rows = data.backlog
  const max = Math.max(1, ...rows.map((r) => r.total))
  return (
    <PanelCard
      title="Trainer marking backlog"
      description="Submissions and draft session scores awaiting each trainer."
      info={{
        label: data.definitions.markingBacklog.label,
        definition: data.definitions.markingBacklog.definition,
      }}
      delay={0.1}
    >
      {rows.length === 0 ? (
        <EmptyState
          size="sm"
          icon={ClipboardList}
          title="Nothing to mark"
          description="Every submission in this cohort has been marked."
        />
      ) : (
        <ul className="grid gap-3">
          {rows.slice(0, 5).map((r) => (
            <li
              key={r.trainerId}
              className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1"
            >
              <span className="truncate text-sm text-ink">{r.trainerName}</span>
              <span className="text-sm font-semibold tabular-nums">{r.total}</span>
              <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-maroon-mist">
                <div
                  className="h-full rounded-full bg-maroon"
                  style={{ width: `${(r.total / max) * 100}%` }}
                />
              </div>
              <span className="col-span-2 text-[11px] text-muted-foreground">
                {r.submissions} submissions, {r.draftScores} draft scores · oldest {r.oldestDays}{' '}
                days
                {r.overdue ? ` · ${r.overdue} overdue` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      <PanelLink onClick={() => openReport('assignments', { view: 'pending' })}>
        View pending submissions
      </PanelLink>
    </PanelCard>
  )
}

function InactivePanel({ data, openReport }: { data: Overview; openReport: OpenReport }) {
  const { count: total, sample } = data.inactive
  return (
    <PanelCard
      title="Learners inactive 14 days"
      description="Open enrolments with no recorded activity for two weeks."
      info={{
        label: data.definitions.inactiveLearners.label,
        definition: data.definitions.inactiveLearners.definition,
      }}
      delay={0.15}
    >
      <p className="font-display text-5xl leading-none font-light tabular-nums text-maroon-deep">
        {count(total)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">learners to re-engage</p>
      {sample.length ? (
        <ul className="mt-4 grid gap-2">
          {sample.map((s) => (
            <li
              key={`${s.learnerCode}-${s.programme}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="min-w-0 truncate">
                <span className="font-medium text-ink">{s.learnerName}</span>{' '}
                <span className="text-xs text-muted-foreground">
                  {s.learnerCode} · {PROGRAMME_LABELS[s.programme]}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Hourglass className="size-3" aria-hidden />
                {s.days} days
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <PanelLink onClick={() => openReport('learners', { view: 'inactive' })}>
        View inactive learners
      </PanelLink>
    </PanelCard>
  )
}

function PanelLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-auto self-start pt-5 text-sm font-medium text-teal underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {children}
    </button>
  )
}
