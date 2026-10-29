import type { ProgrammeCode } from '@shared/constants'

/**
 * Deterministic intent matching for the Demo analytics assistant (brief §13; DECISIONS.md
 * "Scripted AI"). No model, no free-form query execution: a question maps to one governed
 * answer builder or to a clarification, refusal or "unsupported" reply.
 */
export type Intent =
  | 'programme_distribution'
  | 'lowest_completion_orgs'
  | 'pre_post'
  | 'trainers_unmarked'
  | 'attendance_by_format'
  | 'a_certification_ready'
  | 'inactive_two_weeks'
  | 'best_by_score'
  | 'best_by_completion'
  | 'best_by_improvement'

export type Match =
  | { kind: 'intent'; intent: Intent; programme: ProgrammeCode | null }
  | { kind: 'clarify' }
  | { kind: 'refused'; reason: 'write' | 'personal' | 'query' }
  | { kind: 'unsupported'; topic: string | null }

/** The seven suggested prompts, verbatim from the brief. */
export const SUGGESTED_PROMPTS = [
  'How many learners are in each programme?',
  'Which organisations have the lowest completion rate?',
  'Compare pre and post scores for Program B.',
  'Which trainers have unmarked assignments?',
  'Show attendance by delivery format.',
  'How many Program A learners are ready for certification?',
  'Which learners have been inactive for two weeks?',
] as const

export const CLARIFY_OPTIONS = [
  { label: 'Assessment score', prompt: 'Who has the best assessment scores?' },
  { label: 'Completion', prompt: 'Which organisations have the best completion rate?' },
  { label: 'Improvement', prompt: 'Who improved the most between pre and post?' },
] as const

export function normalise(question: string): string {
  return question
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9%\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "Program B", "programme a", "prog. c" → the code. */
export function programmeIn(text: string): ProgrammeCode | null {
  const match = /\bprog(?:ram|ramme)?s? ([abc])\b/.exec(text)
  return match ? (match[1]?.toUpperCase() as ProgrammeCode) : null
}

const has = (text: string, ...patterns: RegExp[]) => patterns.some((p) => p.test(text))

/** Topics the dataset does not hold, named so the reply can say exactly what is unavailable. */
const UNAVAILABLE: [RegExp, string][] = [
  [/\b(revenue|cost|price|budget|spend|salary|salaries|pay)\b/, 'financial data'],
  [/\b(nps|satisfaction|survey|sentiment|rating|review stars)\b/, 'learner satisfaction surveys'],
  [
    /\b(occupancy|bookings? revenue|hotel stays?|visitor numbers|arrivals)\b/,
    'tourism operations data',
  ],
  [/\b(weather|forecast|predict|next (month|year|quarter))\b/, 'forecasts'],
]

export function match(question: string): Match {
  const q = normalise(question)
  const programme = programmeIn(q)

  // Read-only and governed: refuse writes, personal fields and raw queries before anything else.
  if (
    has(
      q,
      /\b(select|insert|update|delete|drop|truncate)\b.*\b(from|into|table|where)\b/,
      /\bsql\b/,
      /\bdatabase query\b/,
    )
  )
    return { kind: 'refused', reason: 'query' }
  if (
    has(
      q,
      /\b(email address(es)?|emails|e mail|phone|mobile|telephone|qid|passport|national id|identity number|home address|date of birth|password)\b/,
    )
  )
    return { kind: 'refused', reason: 'personal' }
  if (
    has(
      q,
      /^(please )?(delete|remove|update|change|edit|enrol|enroll|reset|issue|revoke|send|email|mark|assign|suspend|cancel|reschedule)\b/,
      /\b(can you|could you|please) (delete|remove|update|change|edit|enrol|enroll|reset|issue|revoke|send|mark|assign|suspend|cancel|reschedule)\b/,
    )
  )
    return { kind: 'refused', reason: 'write' }

  for (const [pattern, topic] of UNAVAILABLE) {
    if (pattern.test(q)) return { kind: 'unsupported', topic }
  }

  const intent = (value: Intent): Match => ({ kind: 'intent', intent: value, programme })

  if (
    has(q, /\b(improv\w*|gain\w*|progress\w* most)\b/) &&
    has(q, /\b(most|best|top|biggest|largest|highest|who)\b/) &&
    !has(q, /\bcompare\b/)
  )
    return intent('best_by_improvement')
  if (
    has(
      q,
      /\b(best|top|highest|strongest)\b.*\b(score|scores|scored|assessment|result|results|marks?)\b/,
      /\b(score|scores|scored)\b.*\b(best|top|highest)\b/,
    )
  )
    return intent('best_by_score')
  if (
    has(
      q,
      /\b(best|top|highest|strongest)\b.*\bcomplet\w*/,
      /\bcomplet\w*\b.*\b(best|top|highest)\b/,
    )
  )
    return intent('best_by_completion')
  if (
    has(
      q,
      /\b(who|which \w+)\b.*\b(doing best|best|top performers?|performing best|leading|strongest|star)\b/,
      /\bdoing (the )?best\b/,
      /\btop performers?\b/,
    )
  )
    return { kind: 'clarify' }

  if (
    has(
      q,
      /\b(lowest|worst|least|poorest|bottom|weakest)\b.*\bcomplet\w*/,
      /\bcomplet\w*\b.*\b(lowest|worst|poorest|lagging)\b/,
    )
  )
    return intent('lowest_completion_orgs')
  if (
    has(
      q,
      /\b(pre|baseline|before)\b.*\b(post|after)\b/,
      /\bpre post\b/,
      /\b(compare|comparison)\b.*\bscores?\b/,
      /\blearning improvement\b/,
    )
  )
    return intent('pre_post')
  if (
    has(
      q,
      /\btrainers?\b.*\b(unmarked|marking|backlog|pending|outstanding|not (yet )?marked|to mark|awaiting)\b/,
      /\b(unmarked|marking backlog)\b/,
    )
  )
    return intent('trainers_unmarked')
  if (
    has(
      q,
      /\battend\w*\b.*\b(format|delivery|online|in person|virtual|face to face)\b/,
      /\b(format|delivery|online|in person)\b.*\battend\w*/,
    )
  )
    return intent('attendance_by_format')
  if (
    has(
      q,
      /\b(ready|eligible|eligibility|close)\b.*\bcertif\w*/,
      /\bcertif\w*\b.*\b(ready|eligible|readiness)\b/,
    )
  )
    return intent('a_certification_ready')
  if (
    has(
      q,
      /\binactive\b/,
      /\bnot (been )?active\b/,
      /\b(two|2) weeks\b/,
      /\b14 days\b/,
      /\bno (recent )?activity\b/,
      /\bdisengaged\b/,
    )
  )
    return intent('inactive_two_weeks')
  if (
    has(
      q,
      /\b(how many|number of|count|split|distribution|breakdown)\b.*\b(learners?|enrolments?|enrollments?|users?)\b/,
      /\blearners? (in|per|by) (each )?prog/,
      /\benrolments? (by|per) prog/,
      /\b(split|distribution|breakdown|mix)\b.*\bprog/,
      /\bprog\w* (split|distribution|breakdown|mix)\b/,
    )
  )
    return intent('programme_distribution')

  return { kind: 'unsupported', topic: null }
}
