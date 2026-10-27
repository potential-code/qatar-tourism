import { db } from '@server/db/connection'
import { type NoteRow, note } from '@server/db/schema'
import { HttpError } from '@server/lib/errors'
import type { ListQuery, NoteInput } from '@shared/schemas'
import { and, count, desc, eq, gte, sql } from 'drizzle-orm'

export type NotePatch = Partial<NoteInput>

/**
 * Ownership rule for notes: someone else's note is reported as missing, not forbidden, so ids
 * cannot be probed for existence.
 */
export function assertOwnership(row: NoteRow | undefined, userId: string): NoteRow {
  if (!row || row.userId !== userId) throw HttpError.notFound('Note not found')
  return row
}

export async function listNotes(userId: string, { page, pageSize }: ListQuery) {
  const owned = eq(note.userId, userId)
  const [items, totals] = await Promise.all([
    db
      .select()
      .from(note)
      .where(owned)
      .orderBy(desc(note.createdAt), desc(note.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(note).where(owned),
  ])
  return { items, total: totals[0]?.total ?? 0 }
}

export async function getNote(userId: string, id: string) {
  const [row] = await db.select().from(note).where(eq(note.id, id)).limit(1)
  return assertOwnership(row, userId)
}

export async function createNote(userId: string, input: NoteInput) {
  const [row] = await db
    .insert(note)
    .values({ userId, title: input.title, body: input.body })
    .returning()
  if (!row) throw new Error('Insert returned no row')
  return row
}

export async function updateNote(userId: string, id: string, patch: NotePatch) {
  const values = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as NotePatch
  if (Object.keys(values).length === 0) return getNote(userId, id)

  // The owner check is part of the WHERE clause, so it cannot race with a concurrent change.
  const [row] = await db
    .update(note)
    .set(values)
    .where(and(eq(note.id, id), eq(note.userId, userId)))
    .returning()
  return assertOwnership(row, userId)
}

export async function deleteNote(userId: string, id: string) {
  const [row] = await db
    .delete(note)
    .where(and(eq(note.id, id), eq(note.userId, userId)))
    .returning()
  assertOwnership(row, userId)
}

export type DayCount = { date: string; count: number }

/** UTC calendar day, `YYYY-MM-DD`. */
function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

/**
 * Turns sparse per-day counts into exactly `days` entries ending today (UTC), oldest first,
 * with 0 for days without notes, so the chart has no gaps.
 */
export function fillDays(rows: DayCount[], today: Date, days = 30): DayCount[] {
  const byDay = new Map(rows.map((row) => [row.date, row.count]))
  const result: DayCount[] = []
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset),
    )
    const date = dayKey(day)
    result.push({ date, count: byDay.get(date) ?? 0 })
  }
  return result
}

export async function notesPerDay(userId: string, now = new Date(), days = 30) {
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)),
  )
  const day = sql<string>`to_char(${note.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`
  const rows = await db
    .select({ date: day, count: count() })
    .from(note)
    .where(and(eq(note.userId, userId), gte(note.createdAt, since)))
    .groupBy(day)
  return fillDays(rows, now, days)
}
