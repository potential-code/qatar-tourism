import { CERTIFICATE_STATUSES } from '@shared/constants'
import { sql } from 'drizzle-orm'
import { index, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { timestamps, tstz } from './columns'
import { enrolments } from './enrolments'
import { programmes } from './programmes'

export const certificateStatusEnum = pgEnum('certificate_status', CERTIFICATE_STATUSES)

/**
 * Watermarked demo certificate record (brief §6). Only Program A issues them. Revocation and
 * reissue are admin-only and audited; a reissue points back at the revoked record.
 */
export const certificates = pgTable(
  'certificates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Demo certificate ID printed on the certificate, e.g. QTA-DEMO-A-000001. */
    code: text('code').notNull().unique(),
    enrolmentId: uuid('enrolment_id')
      .notNull()
      .references(() => enrolments.id, { onDelete: 'cascade' }),
    learnerId: text('learner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    programmeId: uuid('programme_id')
      .notNull()
      .references(() => programmes.id, { onDelete: 'restrict' }),
    learnerName: text('learner_name').notNull(),
    status: certificateStatusEnum('status').notNull().default('issued'),
    issuedAt: tstz('issued_at').notNull(),
    issuedBy: text('issued_by').references(() => user.id, { onDelete: 'set null' }),
    revokedAt: tstz('revoked_at'),
    revokedBy: text('revoked_by').references(() => user.id, { onDelete: 'set null' }),
    revokeReason: text('revoke_reason'),
    reissuedFromId: uuid('reissued_from_id'),
    /** Eligibility evidence captured at issue time (brief §13 Certification report). */
    evidence: jsonb('evidence').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    // At most one issued (non-revoked) certificate per enrolment.
    uniqueIndex('certificates_active_enrolment_uq')
      .on(table.enrolmentId)
      .where(sql`${table.status} = 'issued'`),
    index('certificates_learner_idx').on(table.learnerId),
  ],
)

export type CertificateRow = typeof certificates.$inferSelect
