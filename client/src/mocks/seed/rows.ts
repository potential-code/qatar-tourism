import { type NewRow, withDefaults } from '../defaults'
import type { Row, TableName } from '../tables'

/**
 * The seed builders work with `Date` objects (the old Drizzle insert types), which keeps their
 * date arithmetic unchanged. `toRows` turns them into stored rows: instants become ISO strings
 * and left-out columns take their defaults.
 */

type Stamps = 'createdAt' | 'updatedAt'

/** Instant columns per table: the ones a seed builder fills with a `Date`. */
interface InstantColumns {
  users: Stamps
  verifications: Stamps | 'expiresAt'
  organisations: Stamps
  profiles: Stamps | 'consentAcceptedAt' | 'registeredAt' | 'lastActivityAt'
  trainerProfiles: Stamps
  trainerProgrammes: Stamps
  programmes: Stamps
  courses: Stamps
  contentPackages: Stamps
  learningPaths: Stamps
  pathVersions: Stamps | 'publishedAt'
  pathItems: Stamps
  assignmentRules: Stamps
  enrolments: Stamps | 'enrolledAt' | 'startedAt' | 'completedAt' | 'lastActivityAt'
  unitProgress: Stamps | 'completedAt' | 'lastActivityAt'
  assessments: Stamps
  assessmentAttempts: Stamps | 'startedAt' | 'submittedAt'
  assessmentAnswers: Stamps
  rolePlayAttempts: Stamps | 'completedAt'
  sessions: Stamps | 'startsAt' | 'endsAt' | 'bookingDeadline'
  sessionReschedules: Stamps | 'previousStartsAt' | 'previousEndsAt' | 'newStartsAt' | 'newEndsAt'
  rsvps: Stamps | 'bookedAt'
  attendance: Stamps | 'markedAt'
  sessionScores: Stamps | 'finalisedAt'
  assignments: Stamps
  submissions: Stamps | 'submittedAt'
  reviews: Stamps | 'reviewedAt'
  certificates: Stamps | 'issuedAt' | 'revokedAt'
  notifications: Stamps | 'readAt'
  auditEvents: 'createdAt'
}

type AsDate<V> = Date | Extract<V, null | undefined>

/** A row as a seed builder writes it: instants as `Date`, defaulted columns optional. */
export type SeedRow<T extends TableName> = {
  [K in keyof NewRow<T>]: K extends InstantColumns[T] ? AsDate<NewRow<T>[K]> : NewRow<T>[K]
}

/** Dates → ISO strings, recursively (JSON columns too, as Postgres jsonb stored them). */
function isoDates(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(isoDates)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, inner] of Object.entries(value)) out[key] = isoDates(inner)
    return out
  }
  return value
}

export function toRows<T extends TableName>(table: T, rows: readonly SeedRow<T>[]): Row<T>[] {
  return rows.map((row) => withDefaults(table, isoDates(row) as NewRow<T>))
}
