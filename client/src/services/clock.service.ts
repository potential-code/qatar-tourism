import { ApiError } from '@/lib/api-error'
import { commit, db, delay, now, nowIso, out, requireCapability } from './api'
import { audit } from './audit.service'

/**
 * Presenter controls for the demo clock (29 Oct): advance by whole days to show reminders,
 * "expiring soon" and expiry without changing the device date, then reset. Admin only
 * (`demo.clock`), audited. The offset lives in `db.meta.clockOffsetDays` and is read by
 * `services/clock.ts now()`; a full demo reset also clears it.
 */

export const MAX_ADVANCE_DAYS = 730

export interface DemoClockView {
  now: string
  offsetDays: number
}

function view(): DemoClockView {
  return { now: nowIso(), offsetDays: db.meta.clockOffsetDays }
}

export async function getDemoClock(): Promise<DemoClockView> {
  await delay()
  requireCapability('demo.clock')
  return out(view())
}

/** Moves the demo clock forward by `days` (1 to 730). */
export async function advanceDemoClock(days: number): Promise<DemoClockView> {
  await delay()
  requireCapability('demo.clock')
  if (!Number.isInteger(days) || days < 1 || days > MAX_ADVANCE_DAYS) {
    throw ApiError.badRequest(`Choose a whole number of days between 1 and ${MAX_ADVANCE_DAYS}`)
  }
  const before = db.meta.clockOffsetDays
  const beforeNow = now().toISOString()
  db.meta.clockOffsetDays = before + days
  audit({
    action: 'demo.clock.advance',
    objectType: 'demo',
    objectId: 'clock',
    before: { offsetDays: before, now: beforeNow },
    after: { offsetDays: db.meta.clockOffsetDays, now: nowIso() },
    reason: `Presenter advanced the demo clock by ${days} day${days === 1 ? '' : 's'}`,
  })
  commit()
  return out(view())
}

/** Puts the demo clock back to the real elapsed time since the snapshot (offset 0). */
export async function resetDemoClock(): Promise<DemoClockView> {
  await delay()
  requireCapability('demo.clock')
  const before = db.meta.clockOffsetDays
  db.meta.clockOffsetDays = 0
  audit({
    action: 'demo.clock.reset',
    objectType: 'demo',
    objectId: 'clock',
    before: { offsetDays: before },
    after: { offsetDays: 0, now: nowIso() },
    reason: 'Presenter reset the demo clock',
  })
  commit()
  return out(view())
}
