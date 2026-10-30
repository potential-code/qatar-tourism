import type { CredentialLifecycle } from '@shared/constants/enums'
import type { Tone } from '@/features/academy-mgmt/hub/components/StatusPill'
import type { HistoryStatus } from '@/services/credentials/history'

export const LIFECYCLE_TONE: Record<CredentialLifecycle, Tone> = {
  active: 'good',
  expiring_soon: 'warn',
  expired: 'bad',
  revoked: 'bad',
  superseded: 'muted',
}

export const HISTORY_STATUS_TONE: Record<HistoryStatus, Tone> = {
  completed: 'good',
  attended: 'good',
  in_progress: 'info',
  upcoming: 'info',
  attendance_pending: 'warn',
  waitlisted: 'warn',
  absent: 'bad',
  cancelled: 'muted',
}

export const HISTORY_STATUSES: readonly HistoryStatus[] = [
  'completed',
  'in_progress',
  'upcoming',
  'attended',
  'attendance_pending',
  'absent',
  'waitlisted',
  'cancelled',
]

export const HISTORY_MODES = [
  'video',
  'interactive',
  'resource',
  'preview',
  'in_person',
  'online',
] as const
