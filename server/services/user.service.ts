import { db } from '@server/db/connection'
import { user } from '@server/db/schema'
import type { ListQuery } from '@shared/schemas'
import { count, desc } from 'drizzle-orm'

export async function listUsers({ page, pageSize }: ListQuery) {
  const [items, totals] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(user),
  ])
  return { items, total: totals[0]?.total ?? 0 }
}
