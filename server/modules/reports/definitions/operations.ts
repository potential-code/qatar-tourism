import { attendanceRecords, markingBacklog } from '../../analytics/analytics.metrics'
import * as reportsService from '../reports.service'
import type { ReportDefinition } from '../reports.types'

const FORMAT_LABEL = { in_person: 'In person', online: 'Live online' } as const
const SESSION_STATUS_LABEL = {
  draft: 'Draft',
  published: 'Published',
  full: 'Full',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const

/** Brief §13 Trainers: ID, name, expertise, programmes, format, upcoming, attendance, marking. */
export const trainersReport: ReportDefinition = {
  key: 'trainers',
  title: 'Trainers',
  description: 'All ten fictional trainers, their sessions and their marking workload.',
  filterScope: 'programme',
  columns: [
    { key: 'trainerCode', header: 'Trainer ID', type: 'code' },
    { key: 'name', header: 'Name', type: 'text' },
    { key: 'expertise', header: 'Expertise', type: 'text' },
    { key: 'programmes', header: 'Assigned programmes', type: 'text' },
    { key: 'formats', header: 'Format', type: 'text' },
    { key: 'languages', header: 'Languages', type: 'text', detailOnly: true },
    { key: 'upcoming', header: 'Upcoming sessions', type: 'number' },
    { key: 'attendanceRecords', header: 'Attendance records', type: 'number' },
    { key: 'pendingMarking', header: 'Pending marking', type: 'number' },
    { key: 'oldestWait', header: 'Oldest wait (days)', type: 'number', detailOnly: true },
  ],
  defaultSort: { key: 'trainerCode', direction: 'asc' },
  searchKeys: ['trainerCode', 'name', 'expertise', 'programmes'],
  async load({ facts, cohort, query }) {
    const trainers = await reportsService.trainerDetails()
    const backlog = new Map(markingBacklog(facts, cohort).map((b) => [b.trainerId, b]))
    return trainers
      .filter((t) => !query.programme || t.programmes.includes(query.programme))
      .map((t) => {
        const mine = facts.sessions.filter((s) => s.trainerId === t.id)
        const formats = [...new Set(mine.map((s) => FORMAT_LABEL[s.format]))].sort()
        return {
          id: t.id,
          trainerCode: t.code,
          name: t.name,
          expertise: t.expertise.join(', ') || t.headline,
          programmes: t.programmes.map((p) => `Program ${p}`).join(', '),
          formats: formats.join(', '),
          languages: t.languages.join(', '),
          upcoming: mine.filter(
            (s) => s.startsAt > facts.asOf && (s.status === 'published' || s.status === 'full'),
          ).length,
          attendanceRecords: facts.attendance.filter(
            (a) => mine.some((s) => s.sessionId === a.sessionId) && a.status !== 'pending',
          ).length,
          pendingMarking: backlog.get(t.id)?.total ?? 0,
          oldestWait: backlog.get(t.id)?.oldestDays ?? 0,
        }
      })
  },
}

/** Brief §13 Sessions and attendance. */
export const sessionsReport: ReportDefinition = {
  key: 'sessions',
  title: 'Sessions and attendance',
  description: 'All 30 sample sessions with bookings, waitlists and recorded attendance.',
  filterScope: 'programme',
  columns: [
    { key: 'code', header: 'Session ID', type: 'code' },
    { key: 'title', header: 'Title', type: 'text' },
    { key: 'programme', header: 'Programme', type: 'programme' },
    { key: 'trainer', header: 'Trainer', type: 'text' },
    { key: 'startsAt', header: 'Date and time (Qatar time)', type: 'datetime' },
    { key: 'format', header: 'Format', type: 'text' },
    { key: 'venue', header: 'Venue', type: 'text' },
    { key: 'capacity', header: 'Capacity', type: 'number' },
    { key: 'rsvps', header: 'RSVPs', type: 'number' },
    { key: 'waitlist', header: 'Waitlist', type: 'number' },
    { key: 'attendance', header: 'Attendance', type: 'text' },
    { key: 'attendanceRate', header: 'Attendance rate', type: 'percent', detailOnly: true },
    { key: 'status', header: 'Status', type: 'status' },
  ],
  statusKey: 'status',
  statusOptions: Object.values(SESSION_STATUS_LABEL).map((label) => ({ value: label, label })),
  defaultSort: { key: 'startsAt', direction: 'asc' },
  searchKeys: ['code', 'title', 'trainer', 'venue'],
  async load({ facts, query }) {
    const records = attendanceRecords(facts, facts.enrolments)
    return facts.sessions
      .filter((s) => !query.programme || s.programme === query.programme)
      .filter(
        (s) =>
          query.view !== 'upcoming' ||
          (s.startsAt > facts.asOf && (s.status === 'published' || s.status === 'full')),
      )
      .map((s) => {
        const due = records.filter((a) => a.sessionId === s.sessionId)
        const present = due.filter((a) => a.status === 'attended' || a.status === 'late').length
        return {
          id: s.sessionId,
          code: s.code,
          title: s.title,
          programme: s.programme,
          trainer: `${s.trainerName} (${s.trainerCode})`,
          startsAt: s.startsAt.toISOString(),
          format: FORMAT_LABEL[s.format],
          venue:
            s.format === 'online'
              ? 'Demo meeting room (simulated)'
              : [s.venue, s.room].filter(Boolean).join(', '),
          capacity: s.capacity,
          rsvps: s.confirmed,
          waitlist: s.waitlisted,
          attendance: due.length ? `${present} of ${due.length}` : 'Not yet due',
          attendanceRate: due.length ? Math.round((present / due.length) * 1000) / 10 : null,
          status: SESSION_STATUS_LABEL[s.status],
        }
      })
  },
  summarise(rows) {
    const withRate = rows.filter((row) => row.attendanceRate !== null)
    return [
      { label: 'Sessions', value: String(rows.length) },
      {
        label: 'Confirmed RSVPs',
        value: rows.reduce((sum, row) => sum + Number(row.rsvps ?? 0), 0).toLocaleString('en-GB'),
      },
      {
        label: 'Sessions with attendance',
        value: String(withRate.length),
      },
    ]
  },
}
