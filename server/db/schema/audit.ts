import { index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { tstz } from './columns'

/**
 * Audit trail (brief §11): actor, role, timestamp, object, action, before/after summary and
 * reason. Append-only. `actor_id` is nulled, not cascaded, if the user is ever deleted, so the
 * trail survives.
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    actorRole: text('actor_role').notNull(),
    actorLabel: text('actor_label'),
    action: text('action').notNull(),
    objectType: text('object_type').notNull(),
    objectId: text('object_id'),
    before: jsonb('before').$type<Record<string, unknown>>(),
    after: jsonb('after').$type<Record<string, unknown>>(),
    reason: text('reason'),
    /** allowed | denied: exports that were blocked are recorded too (brief §11). */
    outcome: text('outcome').notNull().default('allowed'),
    requestId: text('request_id'),
    createdAt: tstz('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('audit_events_created_idx').on(table.createdAt),
    index('audit_events_object_idx').on(table.objectType, table.objectId),
    index('audit_events_actor_idx').on(table.actorId),
    index('audit_events_action_idx').on(table.action),
  ],
)

export type AuditEventRow = typeof auditEvents.$inferSelect
export type NewAuditEventRow = typeof auditEvents.$inferInsert
