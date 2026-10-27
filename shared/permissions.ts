import type { Role } from './roles'

/**
 * The permission matrix of brief §11, as data.
 *
 * Server policies call `can()` / `accessFor()`; the client may read the same data to decide
 * what to show, but hiding a control is never the check (brief §11: "A hidden button is
 * insufficient"). Scope (own / assigned / authorised) is resolved by the service layer, next to
 * the query, using `server/middleware/scope.middleware.ts`.
 */

/** How far a role's access reaches for an action. */
export type Access =
  /** Not permitted. */
  | 'none'
  /** The viewer's own records only. */
  | 'own'
  /** Records tied to the trainer's assigned sessions, submissions and learners; limited fields. */
  | 'assigned'
  /** Within the admin's authorised Academy scope. */
  | 'authorised'

export const ACTIONS = [
  // The nine rows of the brief §11 matrix.
  'profile.view',
  'contact.view',
  'session.create',
  'marking.record',
  'export.personal',
  'export.marks',
  'path.change',
  'analytics.use',
  'permissions.manage',
  // Operational actions the journeys need (derived from §6, §10, §11, §14).
  'session.manage',
  'rsvp.manage',
  'assignment.submit',
  'certificate.revoke',
  'demo.reset',
  'audit.view',
] as const

export type Action = (typeof ACTIONS)[number]

type MatrixRow = {
  /** Plain-language label, matching the brief where it gives one. */
  label: string
  learner: Access
  trainer: Access
  admin: Access
  /** Brief wording per role, for the admin "Roles and permissions" screen. */
  note: Record<Role, string>
}

export const PERMISSION_MATRIX: Record<Action, MatrixRow> = {
  'profile.view': {
    label: 'View profile and learning',
    learner: 'own',
    trainer: 'assigned',
    admin: 'authorised',
    note: {
      learner: 'Own only',
      trainer: 'Assigned learners; limited fields',
      admin: 'Authorised Academy scope',
    },
  },
  'contact.view': {
    label: 'View email, phone or identity data',
    learner: 'own',
    trainer: 'none',
    admin: 'authorised',
    note: {
      learner: 'Own permitted fields',
      trainer: 'Hidden by default; no QID',
      admin: 'Controlled fields; no real identity data in demo',
    },
  },
  'session.create': {
    label: 'Create sessions',
    learner: 'none',
    trainer: 'own',
    admin: 'authorised',
    note: {
      learner: 'No',
      trainer: 'Own permitted programmes',
      admin: 'All authorised programmes',
    },
  },
  'marking.record': {
    label: 'Mark attendance and work',
    learner: 'none',
    trainer: 'assigned',
    admin: 'authorised',
    note: {
      learner: 'No',
      trainer: 'Assigned sessions/submissions',
      admin: 'Review and administer',
    },
  },
  'export.personal': {
    label: 'Export learner personal data',
    learner: 'none',
    trainer: 'none',
    admin: 'authorised',
    note: { learner: 'No', trainer: 'Blocked', admin: 'Permitted report scope' },
  },
  'export.marks': {
    label: 'Export marks',
    learner: 'own',
    trainer: 'assigned',
    admin: 'authorised',
    note: {
      learner: 'Own results only',
      trainer: 'Optional learner ID and score only',
      admin: 'Authorised reports',
    },
  },
  'path.change': {
    label: 'Change paths or certificates',
    learner: 'none',
    trainer: 'none',
    admin: 'authorised',
    note: { learner: 'No', trainer: 'No', admin: 'Yes with audit trail' },
  },
  'analytics.use': {
    label: 'Use AI Analytics',
    learner: 'none',
    trainer: 'none',
    admin: 'authorised',
    note: {
      learner: 'No',
      trainer: 'No Academy-wide access',
      admin: 'Authorised read-only analytics',
    },
  },
  'permissions.manage': {
    label: 'Manage permissions',
    learner: 'none',
    trainer: 'none',
    admin: 'authorised',
    note: { learner: 'No', trainer: 'No', admin: 'Authorised admin only' },
  },
  'session.manage': {
    label: 'Edit, reschedule or cancel sessions',
    learner: 'none',
    trainer: 'assigned',
    admin: 'authorised',
    note: {
      learner: 'No',
      trainer: 'Own assigned sessions; programme reassignment needs an admin',
      admin: 'All sessions',
    },
  },
  'rsvp.manage': {
    label: 'Book, cancel and reschedule own sessions',
    learner: 'own',
    trainer: 'none',
    admin: 'authorised',
    note: {
      learner: 'Own bookings, within the 24-hour policy',
      trainer: 'No',
      admin: 'Administrative changes',
    },
  },
  'assignment.submit': {
    label: 'Submit assignments',
    learner: 'own',
    trainer: 'none',
    admin: 'none',
    note: { learner: 'Own submissions', trainer: 'No', admin: 'No' },
  },
  'certificate.revoke': {
    label: 'Revoke or reissue certificates',
    learner: 'none',
    trainer: 'none',
    admin: 'authorised',
    note: { learner: 'No', trainer: 'No', admin: 'Admin only, audited' },
  },
  'demo.reset': {
    label: 'Reset demo data',
    learner: 'none',
    trainer: 'none',
    admin: 'authorised',
    note: { learner: 'No', trainer: 'No', admin: 'Demo administrator only' },
  },
  'audit.view': {
    label: 'View audit events',
    learner: 'none',
    trainer: 'none',
    admin: 'authorised',
    note: { learner: 'No', trainer: 'No', admin: 'Authorised admin' },
  },
}

/** The role's access level for an action. */
export function accessFor(role: Role, action: Action): Access {
  return PERMISSION_MATRIX[action][role]
}

/** True when the role has any access to the action. Scope is still checked in the service. */
export function can(role: Role, action: Action): boolean {
  return accessFor(role, action) !== 'none'
}

/** Message the UI and API show for a blocked export (brief §11, verbatim). */
export const EXPORT_BLOCKED_MESSAGE =
  'Your role does not allow this export. Contact the Academy administrator.'

// ---------------------------------------------------------------------------------------------
// Field visibility
// ---------------------------------------------------------------------------------------------

/** Learner fields, by sensitivity. Everything not listed for a role is stripped. */
export const LEARNER_FIELDS = {
  identity: ['learnerCode', 'displayName'],
  profile: [
    'organisationName',
    'organisationType',
    'jobTitle',
    'jobFunction',
    'seniority',
    'experience',
    'country',
    'city',
    'preferredLanguage',
    'goals',
    'weeklyMinutes',
  ],
  contact: ['email', 'mobile'],
  accessibility: ['accessibilityRequest', 'captionsPreference'],
} as const

export type LearnerField =
  | (typeof LEARNER_FIELDS.identity)[number]
  | (typeof LEARNER_FIELDS.profile)[number]
  | (typeof LEARNER_FIELDS.contact)[number]
  | (typeof LEARNER_FIELDS.accessibility)[number]

/**
 * Fields a trainer may see about an assigned learner: the learner ID and permitted display name
 * only. No email or phone by default (brief §4, §11).
 */
export const TRAINER_LEARNER_FIELDS: readonly LearnerField[] = [...LEARNER_FIELDS.identity]

/** Fields an admin sees in reports. Contact fields are "controlled": opt-in per report. */
export const ADMIN_LEARNER_FIELDS: readonly LearnerField[] = [
  ...LEARNER_FIELDS.identity,
  ...LEARNER_FIELDS.profile,
]

/** Fields a learner sees on their own record. */
export const OWN_LEARNER_FIELDS: readonly LearnerField[] = [
  ...LEARNER_FIELDS.identity,
  ...LEARNER_FIELDS.profile,
  ...LEARNER_FIELDS.contact,
  ...LEARNER_FIELDS.accessibility,
]

export function visibleLearnerFields(role: Role): readonly LearnerField[] {
  if (role === 'trainer') return TRAINER_LEARNER_FIELDS
  if (role === 'admin') return ADMIN_LEARNER_FIELDS
  return OWN_LEARNER_FIELDS
}

/** Keeps only the fields the role may see. Unknown keys are dropped, never passed through. */
export function pickVisibleLearnerFields<T extends Partial<Record<LearnerField, unknown>>>(
  role: Role,
  record: T,
): Partial<Record<LearnerField, unknown>> {
  const allowed = visibleLearnerFields(role)
  const out: Partial<Record<LearnerField, unknown>> = {}
  for (const field of allowed) {
    if (field in record) out[field] = record[field]
  }
  return out
}

/** Columns a trainer's marks export may contain: learner ID and score only (brief §11). */
export const TRAINER_MARKS_EXPORT_FIELDS = ['learnerCode', 'score'] as const
