import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Search, ShieldCheck, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QueryErrorPanel } from '@/features/sessions/components/QueryErrorPanel'
import { qatarDateShort } from '@/features/sessions/utils/qatar-time'
import { ATTENDANCE_LABEL, RSVP_LABEL } from '@/features/sessions/utils/session-labels'
import { learnersQuery } from '../../queries/trainer.queries'
import { WorkspaceSkeleton } from '../shared/WorkspaceSkeleton'

/** Assigned learners (brief §10–11): learner ID and permitted display name only, no contact data. */
export function AssignedLearnersPage() {
  const learners = useQuery(learnersQuery())
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const items = learners.data?.items ?? []
    return q
      ? items.filter(
          (l) => l.learnerCode.toLowerCase().includes(q) || l.displayName.toLowerCase().includes(q),
        )
      : items
  }, [learners.data, search])

  const header = (
    <PageHeader
      title="Assigned learners"
      description="Learners booked on your sessions. You see their learner ID and display name only."
    />
  )
  if (learners.isPending)
    return (
      <>
        {header}
        <WorkspaceSkeleton rows={6} />
      </>
    )
  if (learners.isError)
    return (
      <>
        {header}
        <QueryErrorPanel error={learners.error} onRetry={() => learners.refetch()} />
      </>
    )

  return (
    <>
      {header}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid w-full max-w-sm gap-2">
          <Label htmlFor="learner-search">Search by learner ID or name</Label>
          <div className="relative">
            <Search
              aria-hidden
              className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="learner-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck aria-hidden className="size-4 text-teal" /> Email, phone and identity data
          are hidden for trainers.
        </p>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/60">
          <EmptyState
            icon={Users}
            title={search ? 'No learner matches that search' : 'No learners yet'}
            description={
              search
                ? 'Check the learner ID and try again.'
                : 'Learners appear when they book your sessions.'
            }
          />
        </div>
      ) : (
        <section
          aria-label={`${filtered.length} assigned learners`}
          className="overflow-x-auto rounded-xl border bg-card shadow-xs"
        >
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">
              Assigned learners. Scrolls sideways on small screens.
            </caption>
            <thead className="bg-sand text-xs text-muted-foreground">
              <tr>
                {[
                  'Learner ID',
                  'Display name',
                  'Latest session',
                  'Booking',
                  'Attendance',
                  'Session score',
                ].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-start font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((l) => (
                <tr key={l.learnerCode}>
                  <td className="px-4 py-3 font-medium tabular-nums">{l.learnerCode}</td>
                  <td className="px-4 py-3">{l.displayName}</td>
                  <td className="px-4 py-3">
                    <Link
                      to="/trainer/attendance/$sessionId"
                      params={{ sessionId: l.latestSession.id }}
                      className="text-teal hover:underline"
                    >
                      {l.latestSession.title}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {qatarDateShort(l.latestSession.startsAt)}, {l.latestSession.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">{RSVP_LABEL[l.latestSession.rsvpStatus]}</td>
                  <td className="px-4 py-3">
                    {l.attendance ? ATTENDANCE_LABEL[l.attendance] : 'Not recorded'}
                  </td>
                  <td className="px-4 py-3">
                    {l.score
                      ? `${l.score.total}/100 ${l.score.status === 'final' ? (l.score.passed ? 'Pass' : 'Below pass') : 'Draft'}`
                      : 'Not scored'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  )
}
