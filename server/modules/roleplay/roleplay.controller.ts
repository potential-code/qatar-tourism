import type { RolePlayAttemptRow } from '@server/db/schema'
import type { Viewer } from '@server/middleware/auth.middleware'
import { ROLEPLAY_RUBRIC } from '@shared/constants'
import { SIMULATED_AI_LABEL } from '@shared/content/scenarios'
import type { PracticeAttemptInput, PracticeTurnInput } from '@shared/schemas/practice-roleplay'
import * as roleplayService from './roleplay.service'

export function ping() {
  return { module: 'roleplay' as const, status: 'ok' as const }
}

const LABELS = Object.fromEntries(ROLEPLAY_RUBRIC.map((c) => [c.key, c.label])) as Record<
  string,
  string
>

function toAttemptView(row: RolePlayAttemptRow, programmeCode: string) {
  const scenario = roleplayService.scenarios.find((s) => s.key === row.scenarioKey)
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
    completedAt: row.completedAt.toISOString(),
    label: SIMULATED_AI_LABEL,
  }
}

type AttemptSummary = { id: string; percent: number; completedAt: string }

function summarise(rows: { attempt: RolePlayAttemptRow }[]) {
  // Rows arrive newest first: the first is the latest; best breaks ties by the earliest.
  const latest = rows[0]?.attempt
  let best: RolePlayAttemptRow | undefined
  for (const { attempt } of rows) {
    if (!best || attempt.totalPercent >= best.totalPercent) best = attempt
  }
  const view = (a?: RolePlayAttemptRow): AttemptSummary | null =>
    a ? { id: a.id, percent: a.totalPercent, completedAt: a.completedAt.toISOString() } : null
  return { attempts: rows.length, best: view(best), latest: view(latest) }
}

/** Scenario picker: the four scenarios with this learner's history, and their enrolments. */
export async function overview(viewer: Viewer) {
  const [enrolmentRows, attemptRows] = await Promise.all([
    roleplayService.practiceEnrolments(viewer.id),
    roleplayService.listAttempts(viewer.id),
  ])
  return {
    label: SIMULATED_AI_LABEL,
    enrolments: enrolmentRows,
    summary: summarise(attemptRows),
    scenarios: roleplayService.scenarios.map((s) => ({
      key: s.key,
      title: s.title,
      visitorOpening: s.visitorOpening,
      learnerObjective: s.learnerObjective,
      competency: s.competency,
      difficulty: s.difficulty,
      estimatedMinutes: s.estimatedMinutes,
      ...summarise(attemptRows.filter((r) => r.attempt.scenarioKey === s.key)),
    })),
  }
}

export async function listAttempts(viewer: Viewer, scenarioKey?: string) {
  const rows = await roleplayService.listAttempts(viewer.id, scenarioKey)
  return {
    summary: summarise(rows),
    items: rows.map((r) => toAttemptView(r.attempt, r.programmeCode)),
  }
}

export async function getAttempt(viewer: Viewer, attemptId: string) {
  const row = await roleplayService.getAttempt(viewer.id, attemptId)
  return toAttemptView(row.attempt, row.programmeCode)
}

export function nextTurn(input: PracticeTurnInput) {
  const { transcript, done } = roleplayService.nextTurn(input)
  const visitor = transcript[transcript.length - 1]
  return { reply: visitor?.speaker === 'visitor' ? visitor.text : '', done, transcript }
}

export function demonstration(scenarioKey: string) {
  return {
    transcript: roleplayService.demonstration(scenarioKey),
    label: 'Prerecorded demonstration',
  }
}

export async function createAttempt(viewer: Viewer, input: PracticeAttemptInput) {
  const { attempt, programmeCode } = await roleplayService.createAttempt(viewer.id, input)
  return toAttemptView(attempt, programmeCode)
}
