import { timestamp } from 'drizzle-orm/pg-core'

/** timestamptz, UTC. Rendering in Asia/Qatar happens in the client. */
export const tstz = (name: string) => timestamp(name, { withTimezone: true })

/**
 * created_at / updated_at for every table (project rule). The seed always sets them explicitly,
 * so a re-seed is byte-for-byte reproducible; the defaults serve runtime inserts.
 */
export const timestamps = {
  createdAt: tstz('created_at').defaultNow().notNull(),
  updatedAt: tstz('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}
