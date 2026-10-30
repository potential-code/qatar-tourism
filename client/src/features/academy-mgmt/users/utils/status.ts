import type { Tone } from '../../hub/components/StatusPill'

export const ACCOUNT_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'good' },
  invited: { label: 'Invited', tone: 'info' },
  locked: { label: 'Locked', tone: 'warn' },
  suspended: { label: 'Suspended', tone: 'bad' },
}

export const ROLE_LABEL: Record<string, string> = {
  learner: 'Learner',
  trainer: 'Trainer',
  admin: 'Administrator',
}

export const ENROLMENT_TONE: Record<string, Tone> = {
  not_started: 'muted',
  in_progress: 'info',
  awaiting_review: 'warn',
  completed: 'good',
}
