import { ROLEPLAY_RUBRIC } from '@shared/constants'
import { ROLEPLAY_SCENARIOS, SIMULATED_AI_LABEL } from '@shared/content/scenarios'
import type { RolePlayAttemptRow } from '@shared/types/db'
import { db } from '../api'

/** Read side of simulated AI practice (formerly roleplay.controller + service queries). */

/** Practice belongs to the active demo programmes; C is an illustrative overview only. */
const PRACTICE_PROGRAMMES = ['A', 'B'] as const

const LABELS = Object.fromEntries(ROLEPLAY_RUBRIC.map((c) => [c.key, c.label])) as Record<
  string,
  string
>

export type AttemptWithProgramme = { attempt: RolePlayAttemptRow; programmeCode: string }

function programmeCodeOf(enrolmentId: string): string | null {
  const enrolment = db.enrolments.find((e) => e.id === enrolmentId)
  return db.programmes.find((p) => p.id === enrolment?.programmeId)?.code ?? null
}

/** The learner's A and B enrolments, ordered by programme code. */
export function practiceEnrolments(learnerId: string) {
  const programmes = new Map(db.programmes.map((p) => [p.id, p]))
  return db.enrolments
    .filter((e) => e.learnerId === learnerId)
    .map((e) => ({ enrolment: e, programme: programmes.get(e.programmeId) }))
    .filter(
      ({ programme }) =>
        programme && (PRACTICE_PROGRAMMES as readonly string[]).includes(programme.code),
    )
    .map(({ enrolment, programme }) => ({
      id: enrolment.id,
      programmeCode: programme?.code ?? '',
      programmeTitle: programme?.title ?? '',
      status: enrolment.status,
    }))
    .sort((a, b) => a.programmeCode.localeCompare(b.programmeCode))
}

/** The learner's attempts, newest first (completedAt desc, id desc). */
export function attemptsOf(learnerId: string, scenarioKey?: string): AttemptWithProgramme[] {
  return db.rolePlayAttempts
    .filter((a) => a.learnerId === learnerId && (!scenarioKey || a.scenarioKey === scenarioKey))
    .flatMap((attempt) => {
      const programmeCode = programmeCodeOf(attempt.enrolmentId)
      return programmeCode ? [{ attempt, programmeCode }] : []
    })
    .sort(
      (a, b) =>
        b.attempt.completedAt.localeCompare(a.attempt.completedAt) ||
        b.attempt.id.localeCompare(a.attempt.id),
    )
}

export function toAttemptView(row: RolePlayAttemptRow, programmeCode: string) {
  const scenario = ROLEPLAY_SCENARIOS.find((s) => s.key === row.scenarioKey)
  return {
    id: row.id,
    enrolmentId: row.enrolmentId,
    programmeCode,
    scenarioKey: row.scenarioKey,
    scenarioTitle: scenario?.title ?? row.scenarioKey,
    mode: row.mode,
    transcript: row.transcript,
    criteria: row.feedback.criteria.map((c) => ({ ...c, label: LABELS[c.key] ?? c.key })),
    strength: row.feedback.strength,
    improve: row.feedback.improve,
    retry: row.feedback.retry,
    totalScore: row.totalScore,
    totalPercent: row.totalPercent,
    usedRecordedDemo: row.usedRecordedDemo,
    completedAt: row.completedAt,
    label: SIMULATED_AI_LABEL,
  }
}

type AttemptSummary = { id: string; percent: number; completedAt: string }

/** Rows arrive newest first: the first is the latest; best breaks ties by the earliest. */
export function summarise(rows: readonly AttemptWithProgramme[]) {
  const latest = rows[0]?.attempt
  let best: RolePlayAttemptRow | undefined
  for (const { attempt } of rows) {
    if (!best || attempt.totalPercent >= best.totalPercent) best = attempt
  }
  const view = (a?: RolePlayAttemptRow): AttemptSummary | null =>
    a ? { id: a.id, percent: a.totalPercent, completedAt: a.completedAt } : null
  return { attempts: rows.length, best: view(best), latest: view(latest) }
}
