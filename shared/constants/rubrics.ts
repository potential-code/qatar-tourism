import type { RolePlayCriterion } from './enums'

/** Session scoring rubric (brief §10). Weights sum to 100; pass at 70. */
export const SESSION_RUBRIC = [
  { key: 'preparation', label: 'Preparation', max: 20 },
  { key: 'communication', label: 'Communication', max: 30 },
  { key: 'practical', label: 'Practical application', max: 30 },
  { key: 'professionalism', label: 'Professionalism', max: 20 },
] as const

export type SessionRubricKey = (typeof SESSION_RUBRIC)[number]['key']

export const SESSION_RUBRIC_MAX = SESSION_RUBRIC.reduce((sum, item) => sum + item.max, 0)

/** Role-play criteria (brief §9), each scored 0–4 with one evidence excerpt and a suggestion. */
export const ROLEPLAY_RUBRIC: readonly { key: RolePlayCriterion; label: string }[] = [
  { key: 'empathy_professionalism', label: 'Empathy and professionalism' },
  { key: 'discovery_questions', label: 'Discovery questions' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'accuracy_boundaries', label: 'Accuracy and boundaries' },
  { key: 'solution_followthrough', label: 'Solution and follow-through' },
]

/** Assignment review rubric: a single 0-100 mark in the demo, pass at THRESHOLDS.assignmentPass. */
export const ASSIGNMENT_RUBRIC = [
  { key: 'discovery', label: 'Discovery questions', max: 25 },
  { key: 'options', label: 'Two feasible options', max: 25 },
  { key: 'escalation', label: 'Escalation path', max: 25 },
  { key: 'followup', label: 'Follow-up message', max: 25 },
] as const
