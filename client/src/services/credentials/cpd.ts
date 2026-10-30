import type { CpdStatus, CpdUnit } from '@shared/constants/enums'
import type { CpdLedgerRow } from '@shared/types/db'
import { db } from '../api'
import { demoSettings } from '../demo-settings.service'

/**
 * CPD ledger maths (SPEC §7). Hours and credits are only ever combined through the configured
 * `cpdHoursPerCredit` conversion, and only `earned` and `approved` lines count. Program B lines
 * are derived here (not stored) from completed courses while the demo rule is switched on, so
 * turning the rule off removes them again.
 */

export interface LedgerLine {
  id: string
  source: 'academy' | 'external'
  title: string
  amount: number
  unit: CpdUnit
  status: CpdStatus
  earnedOn: string
  externalCertificateId: string | null
  certificateId: string | null
  /** True for lines derived from the Program B demo rule. */
  derived: boolean
}

export interface CpdSummary {
  unit: CpdUnit
  target: number
  earned: number
  pending: number
  remaining: number
  lines: LedgerLine[]
}

const round = (value: number) => Math.round(value * 100) / 100

/** Amount expressed in `to`, through the one defined hours-per-credit conversion. */
export function convertCpd(amount: number, from: CpdUnit, to: CpdUnit, hoursPerCredit: number) {
  if (from === to) return amount
  return from === 'credits' ? amount * hoursPerCredit : amount / hoursPerCredit
}

function programmeBLines(learnerId: string): LedgerLine[] {
  const settings = demoSettings()
  if (!settings.programmeBCpdEnabled) return []
  const programmeB = db.programmes.find((p) => p.code === 'B')
  if (!programmeB) return []
  const own = new Set(
    db.enrolments
      .filter((e) => e.learnerId === learnerId && e.programmeId === programmeB.id)
      .map((e) => e.id),
  )
  return db.unitProgress
    .filter((u) => own.has(u.enrolmentId) && u.status === 'completed' && u.completedAt)
    .map((u) => ({
      id: `b-cpd:${u.id}`,
      source: 'academy' as const,
      title: `Program B: ${db.courses.find((c) => c.id === u.courseId)?.title ?? 'Course'}`,
      amount: settings.programmeBCpdPerCourse,
      unit: settings.cpdUnit,
      status: 'earned' as const,
      earnedOn: (u.completedAt ?? '').slice(0, 10),
      externalCertificateId: null,
      certificateId: null,
      derived: true,
    }))
}

const toLine = (row: CpdLedgerRow): LedgerLine => ({
  id: row.id,
  source: row.source,
  title: row.title,
  amount: row.hours,
  unit: row.unit,
  status: row.status,
  earnedOn: row.earnedOn,
  externalCertificateId: row.externalCertificateId,
  certificateId: row.certificateId,
  derived: false,
})

export function cpdSummary(learnerId: string): CpdSummary {
  const settings = demoSettings()
  const lines = [
    ...db.cpdLedger.filter((l) => l.learnerId === learnerId).map(toLine),
    ...programmeBLines(learnerId),
  ].sort((a, b) => b.earnedOn.localeCompare(a.earnedOn))
  const inUnit = (l: LedgerLine) =>
    convertCpd(l.amount, l.unit, settings.cpdUnit, settings.cpdHoursPerCredit)
  const sum = (wanted: readonly CpdStatus[]) =>
    round(lines.filter((l) => wanted.includes(l.status)).reduce((s, l) => s + inUnit(l), 0))
  const earned = sum(['earned', 'approved'])
  return {
    unit: settings.cpdUnit,
    target: settings.cpdTarget,
    earned,
    pending: sum(['pending']),
    remaining: round(Math.max(0, settings.cpdTarget - earned)),
    lines,
  }
}
