import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ClipboardCheck, Hourglass, LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { getAttentionCounts } from '@/services/approvals.service'
import { count } from '../../utils/format'
import { PanelCard } from '../PanelCard'

function Tile({
  icon,
  label,
  value,
  hint,
  children,
}: {
  icon: ReactNode
  label: string
  value: number | undefined
  hint: string
  children: ReactNode
}) {
  return (
    <div className="relative flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-teal-mist/40">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-mist text-teal-deep">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-display text-3xl leading-none tabular-nums text-ink">
          {value === undefined ? <Skeleton className="h-8 w-10" /> : count(value)}
        </p>
        <p className="mt-1 text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  )
}

/**
 * Items that need an administrator (SPEC §5): pending approvals, waitlisted learners and locked
 * accounts. Each tile is a link to the list it counts, already filtered, and the count is the
 * length of that list.
 */
export function AttentionCounts() {
  const query = useQuery({ queryKey: ['admin', 'attention-counts'], queryFn: getAttentionCounts })
  const data = query.data
  const stretched = 'absolute inset-0 rounded-xl focus-visible:outline-none'

  return (
    <PanelCard
      title="Needs attention"
      description="Open each count to see the filtered list behind it."
      className="col-span-12"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile
          icon={<ClipboardCheck aria-hidden className="size-5" />}
          label="Pending approvals"
          value={data?.pendingApprovals}
          hint="Enrolment and external-certificate requests"
        >
          <Link
            to="/admin/manage/approvals"
            search={{ status: 'pending' }}
            className={stretched}
            aria-label="Open pending approvals"
          />
        </Tile>
        <Tile
          icon={<Hourglass aria-hidden className="size-5" />}
          label="Waitlisted learners"
          value={data?.waitlistedLearners}
          hint="Waiting for a seat, or holding an offer"
        >
          <Link
            to="/admin/manage/sessions"
            search={{ view: 'waitlist' }}
            className={stretched}
            aria-label="Open waitlisted learners"
          />
        </Tile>
        <Tile
          icon={<LockKeyhole aria-hidden className="size-5" />}
          label="Locked accounts"
          value={data?.lockedAccounts}
          hint="Cannot sign in until unlocked"
        >
          <Link
            to="/admin/manage/users"
            search={{ status: 'locked' }}
            className={stretched}
            aria-label="Open locked accounts"
          />
        </Tile>
      </div>
    </PanelCard>
  )
}
