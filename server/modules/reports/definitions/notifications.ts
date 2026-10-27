import * as reportsService from '../reports.service'
import type { ReportDefinition, ReportRow } from '../reports.types'

const KIND_LABEL: Record<string, string> = {
  session_rescheduled: 'Session rescheduled',
  session_cancelled: 'Session cancelled',
  assignment_returned: 'Assignment returned',
  user_invited: 'Learner invited',
}

const STATE_LABEL = {
  simulated: 'Simulated',
  queued: 'Queued',
  sent: 'Sent',
  failed: 'Failed',
} as const

type State = keyof typeof STATE_LABEL

/**
 * Brief §13 Notifications and exports: one row per notification event (deduplicated by event
 * ID) and one per export attempt. Emails are always "Simulated" unless a provider confirmed
 * them, and the report never relabels them.
 */
export const notificationsReport: ReportDefinition = {
  key: 'notifications',
  title: 'Notifications and exports',
  description: 'Notification events by delivery state, and every report export, allowed or denied.',
  filterScope: 'none',
  columns: [
    { key: 'event', header: 'Event', type: 'text' },
    { key: 'object', header: 'Affected session or report', type: 'text' },
    { key: 'recipients', header: 'Recipients', type: 'number' },
    { key: 'inApp', header: 'In-app', type: 'text' },
    { key: 'email', header: 'Email', type: 'text' },
    { key: 'state', header: 'State', type: 'status' },
    { key: 'createdAt', header: 'Timestamp (Qatar time)', type: 'datetime' },
    { key: 'actor', header: 'Actor', type: 'text' },
    { key: 'eventId', header: 'Event ID', type: 'code', detailOnly: true },
    { key: 'detail', header: 'Detail', type: 'text', detailOnly: true },
  ],
  statusKey: 'state',
  statusOptions: [
    ...Object.values(STATE_LABEL).map((label) => ({ value: label, label })),
    { value: 'Allowed', label: 'Export allowed' },
    { value: 'Denied', label: 'Export denied' },
  ],
  defaultSort: { key: 'createdAt', direction: 'desc' },
  searchKeys: ['event', 'object', 'actor', 'eventId'],
  async load() {
    const [notes, exports] = await Promise.all([
      reportsService.notificationRows(),
      reportsService.exportEvents(),
    ])
    const events = new Map<string, typeof notes>()
    for (const note of notes) {
      const list = events.get(note.eventId) ?? []
      list.push(note)
      events.set(note.eventId, list)
    }
    const summary = (states: State[]) => {
      if (states.length === 0) return 'None'
      const counts = new Map<State, number>()
      for (const s of states) counts.set(s, (counts.get(s) ?? 0) + 1)
      return [...counts.entries()]
        .map(([s, n]) => `${n} ${STATE_LABEL[s].toLowerCase()}`)
        .join(', ')
    }
    const rows: ReportRow[] = []
    for (const [eventId, list] of events) {
      const first = list[0]
      if (!first) continue
      const email = list.filter((n) => n.channel === 'email').map((n) => n.state)
      const inApp = list.filter((n) => n.channel === 'in_app').map((n) => n.state)
      // The headline state is the email's: that is the channel the brief asks to label honestly.
      const headline: State = email.includes('failed')
        ? 'failed'
        : email.includes('queued')
          ? 'queued'
          : email.length && email.every((s) => s === 'sent')
            ? 'sent'
            : email.length
              ? 'simulated'
              : (inApp[0] ?? 'sent')
      rows.push({
        id: eventId,
        eventId,
        kind: 'notification',
        event: KIND_LABEL[first.kind] ?? first.kind,
        object: first.sessionCode
          ? `${first.sessionCode} ${first.sessionTitle ?? ''}`.trim()
          : first.subject,
        recipients: new Set(list.map((n) => n.recipientId)).size,
        inApp: summary(inApp),
        email: summary(email),
        state: STATE_LABEL[headline],
        createdAt: first.createdAt.toISOString(),
        actor: first.actorName ? `${first.actorName} (${first.actorRole})` : 'System',
        detail: first.subject,
      })
    }
    for (const event of exports) {
      const after = (event.after ?? {}) as Record<string, unknown>
      const report = String(after.report ?? event.objectId ?? 'report')
      rows.push({
        id: event.id,
        eventId: event.id,
        kind: 'export',
        event: event.outcome === 'denied' ? 'Export denied' : 'Report export (CSV)',
        object: report,
        recipients: typeof after.rows === 'number' ? after.rows : null,
        inApp: 'Not applicable',
        email: 'Not applicable',
        state: event.outcome === 'denied' ? 'Denied' : 'Allowed',
        createdAt: event.createdAt.toISOString(),
        actor: `${event.actorLabel ?? 'Unknown'} (${event.actorRole})`,
        detail:
          event.reason ?? (typeof after.rows === 'number' ? `${after.rows} rows exported` : null),
      })
    }
    return rows
  },
  summarise(rows) {
    const notes = rows.filter((row) => row.kind === 'notification')
    return [
      { label: 'Notification events', value: String(notes.length) },
      {
        label: 'Recipients notified',
        value: notes
          .reduce((sum, row) => sum + Number(row.recipients ?? 0), 0)
          .toLocaleString('en-GB'),
      },
      { label: 'Exports logged', value: String(rows.length - notes.length) },
    ]
  },
}
