export type AssignmentState = 'not_started' | 'awaiting_review' | 'returned' | 'approved'
export type SubmissionStatus = 'submitted' | 'under_review' | 'returned' | 'approved'

/** Status words and tones. Every status has a word, so colour is never the only signal. */
export const SUBMISSION_STATUS: Record<SubmissionStatus, { label: string; tone: Tone }> = {
  submitted: { label: 'Submitted', tone: 'info' },
  under_review: { label: 'Under review', tone: 'info' },
  returned: { label: 'Returned for revision', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
}

export const ASSIGNMENT_STATE: Record<AssignmentState, { label: string; tone: Tone }> = {
  not_started: { label: 'Not started', tone: 'neutral' },
  awaiting_review: { label: 'Waiting for your trainer', tone: 'info' },
  returned: { label: 'Returned for revision', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
}

export type Tone = 'neutral' | 'info' | 'warning' | 'success'
