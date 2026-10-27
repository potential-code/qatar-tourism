import type { AttendanceValue } from '@shared/constants'
import { CheckCircle2, PenLine, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RSVP_LABEL } from '@/features/sessions/utils/session-labels'
import type { RosterRow } from '../../types'
import { AttendanceSelect } from './AttendanceSelect'

/** Roster (brief §10): learner ID, permitted display name, RSVP status, attendance and score. */
export function RosterTable({
  rows,
  canRecord,
  onAttendance,
  onScore,
}: {
  rows: RosterRow[]
  canRecord: boolean
  onAttendance: (row: RosterRow, value: AttendanceValue) => void
  onScore: (row: RosterRow) => void
}) {
  return (
    <section
      aria-labelledby="roster-caption"
      className="relative overflow-x-auto rounded-xl border bg-card shadow-xs"
      tabIndex={-1}
    >
      <table className="w-full min-w-[760px] text-sm">
        <caption id="roster-caption" className="sr-only">
          Session roster. Scrolls sideways on small screens.
        </caption>
        <thead className="bg-sand text-start text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 text-start font-medium">
              Learner ID
            </th>
            <th scope="col" className="px-4 py-3 text-start font-medium">
              Display name
            </th>
            <th scope="col" className="px-4 py-3 text-start font-medium">
              RSVP
            </th>
            <th scope="col" className="px-4 py-3 text-start font-medium">
              Attendance
            </th>
            <th scope="col" className="px-4 py-3 text-start font-medium">
              Score
            </th>
            <th scope="col" className="px-4 py-3 text-end font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => {
            const confirmed = row.rsvpStatus === 'confirmed'
            const present = row.attendance === 'attended' || row.attendance === 'late'
            return (
              <tr key={row.rsvpId} className={confirmed ? '' : 'text-muted-foreground'}>
                <td className="px-4 py-3 font-medium tabular-nums">{row.learnerCode}</td>
                <td className="px-4 py-3">{row.displayName}</td>
                <td className="px-4 py-3">
                  {RSVP_LABEL[row.rsvpStatus]}
                  {row.waitlistPosition ? ` (${row.waitlistPosition})` : ''}
                </td>
                <td className="px-4 py-3">
                  {confirmed ? (
                    <AttendanceSelect
                      value={row.attendance}
                      onChange={(v) => onAttendance(row, v)}
                      disabled={!canRecord}
                      label={`Attendance for ${row.learnerCode}`}
                    />
                  ) : (
                    <span>Not applicable</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.score ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="font-display text-lg tabular-nums">{row.score.total}</span>
                      {row.score.passed ? (
                        <CheckCircle2 aria-label="Pass" className="size-4 text-success" />
                      ) : (
                        <XCircle aria-label="Below pass mark" className="size-4 text-destructive" />
                      )}
                      <Badge
                        variant="outline"
                        className={
                          row.score.status === 'final'
                            ? 'border-teal/30 text-teal-deep'
                            : 'border-warning/30 text-warning'
                        }
                      >
                        {row.score.status === 'final' ? 'Final' : 'Draft'}
                      </Badge>
                    </span>
                  ) : confirmed && !present && row.attendance !== 'pending' ? (
                    <span className="text-xs">No score: absence never passes</span>
                  ) : (
                    <span className="text-muted-foreground">Not scored</span>
                  )}
                </td>
                <td className="px-4 py-3 text-end">
                  {confirmed ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRecord || !present}
                      onClick={() => onScore(row)}
                    >
                      <PenLine aria-hidden /> {row.score ? 'Edit score' : 'Score'}
                    </Button>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
