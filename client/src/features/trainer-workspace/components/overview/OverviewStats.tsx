import { useNavigate } from '@tanstack/react-router'
import { CalendarDays, ClipboardList, FileText, Users } from 'lucide-react'
import { StatCard } from '@/components/data/StatCard'
import type { OverviewData } from '../../types'

/** The four §10 counts. Each tile opens the screen where the work happens. */
export function OverviewStats({ stats }: { stats: OverviewData['stats'] }) {
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      <StatCard
        label="Upcoming sessions"
        value={stats.upcomingSessions}
        icon={CalendarDays}
        description={`${stats.seatsBooked} of ${stats.seatsOffered} seats booked`}
        onClick={() => navigate({ to: '/trainer/sessions' })}
      />
      <StatCard
        label="Assigned learners"
        value={stats.assignedLearners}
        icon={Users}
        tone="maroon"
        description="Booked on your sessions"
        onClick={() => navigate({ to: '/trainer/learners' })}
      />
      <StatCard
        label="Attendance outstanding"
        value={stats.attendanceOutstanding}
        icon={ClipboardList}
        tone="gold"
        description={`${stats.draftScores} scores saved as draft`}
        onClick={() => navigate({ to: '/trainer/attendance' })}
      />
      <StatCard
        label="Marking queue"
        value={stats.markingQueue}
        icon={FileText}
        tone="sky"
        description="Assignment submissions to review"
        onClick={() => navigate({ to: '/trainer/assignments' as never })}
      />
    </div>
  )
}
