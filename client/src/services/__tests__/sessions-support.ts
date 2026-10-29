import { expect } from 'bun:test'
import { ApiError } from '@/lib/api-error'
import { db } from '@/mocks/db'

/** Seeded accounts the sessions, rsvps, attendance and exports tests act as. */
export const OMAR = 'user-l0002'
export const MAHA = 'user-l0001'
export const LEILA = 'user-l0003'
export const T01 = 'user-t01'
export const T03 = 'user-t03'
export const T05 = 'user-t05'
export const T10 = 'user-t10'
export const ADMIN = 'user-admin'

/** A seeded session's id by its code (e.g. 'SES-T01-2'). */
export function sessionId(code: string): string {
  const session = db.sessions.find((s) => s.code === code)
  if (!session) throw new Error(`No seeded session ${code}`)
  return session.id
}

/** The bookings of a session, in waitlist order. */
export function rsvpsOn(code: string) {
  const id = sessionId(code)
  return db.rsvps
    .filter((r) => r.sessionId === id)
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0))
}

/** Awaits a service call that must fail; returns the ApiError for further checks. */
export async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    return error as ApiError
  }
  throw new Error('Expected the call to be refused')
}

/** Moves the demo clock: `referenceDate` at 08:00 Qatar time, shifted by `offsetHours`. */
export function setClock(referenceDate: string, offsetHours = 0): void {
  db.meta.referenceDate = referenceDate
  db.meta.seededAt = new Date(Date.now() - offsetHours * 3_600_000).toISOString()
}
