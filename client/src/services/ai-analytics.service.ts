import { type AnalyticsAnswer, askInput } from '@shared/schemas/admin-ai'
import { build } from './ai-analytics/answers'
import { CLARIFY_OPTIONS, match, SUGGESTED_PROMPTS } from './ai-analytics/intents'
import { loadFacts } from './analytics/facts'
import { delay, newId, nowIso, parseInput, referenceDate, requireRole } from './api'

/**
 * The Demo analytics assistant (brief §13), formerly /api/ai-analytics. Admin only and
 * read-only: a question maps to one governed answer builder or to a clarification, refusal or
 * "unsupported" reply. Nothing here writes.
 */

const ASSISTANT = 'Demo analytics assistant' as const

const REFUSALS = {
  write:
    'I am a read-only assistant, so I cannot change, enrol, send, mark or delete anything. Changes are made in Academy Management, where every action is audited.',
  personal:
    'I cannot show email addresses, phone numbers or identity data. My answers use learner IDs and permitted display names only.',
  query:
    'I do not run database queries. I answer from the governed Academy metrics only, so every figure matches the Dashboard and Reports.',
} as const

const SUPPORTED_TOPICS =
  'I can answer questions about enrolments by programme, completion by organisation, pre and post improvement, trainer marking, attendance by format, Program A certification readiness, inactive learners, certificates expiring soon, the Program A waitlist, assessment pass rates by programme and language, and failed CRM events.'

function blank(question: string): Omit<AnalyticsAnswer, 'kind' | 'title' | 'prose'> {
  return {
    id: newId(),
    question,
    intent: null,
    chart: null,
    table: null,
    filters: [],
    definition: null,
    period: null,
    sampleSize: null,
    generatedAt: nowIso(),
    records: null,
    options: [],
    assistant: ASSISTANT,
  }
}

const suggestions = () => SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => ({ label: prompt, prompt }))

/** Answers one question from the governed metrics. */
export async function ask(input: { question: string }): Promise<AnalyticsAnswer> {
  await delay(400)
  requireRole('admin')
  const { question } = parseInput(askInput, input)
  const result = match(question)
  const base = blank(question)

  if (result.kind === 'clarify') {
    return {
      ...base,
      kind: 'clarify',
      title: 'Which measure of "best"?',
      prose:
        'Do you mean the best assessment score, the highest completion rate or the largest improvement between pre and post? Each uses a different definition, so I will not pick one for you.',
      options: CLARIFY_OPTIONS.map((option) => ({ ...option })),
    }
  }
  if (result.kind === 'refused') {
    return {
      ...base,
      kind: 'refused',
      title: 'Not something I can do',
      prose: REFUSALS[result.reason],
      options: suggestions(),
    }
  }
  if (result.kind === 'unsupported') {
    return {
      ...base,
      kind: 'unsupported',
      title: 'Not available in this dataset',
      prose: `${result.topic ? `The demo dataset holds no ${result.topic}, so I cannot answer that without inventing figures. ` : 'I could not match that question to a governed metric, and I will not guess. '}${SUPPORTED_TOPICS}`,
      options: suggestions(),
    }
  }

  const facts = loadFacts()
  const built = build(result.intent, result.programme, facts, referenceDate())
  return {
    ...base,
    ...built,
    kind: 'answer',
    intent: result.intent,
    generatedAt: facts.asOf.toISOString(),
  }
}

/** The suggested prompts: the seven from the brief and the four added for the 29 Oct update. */
export async function listPrompts() {
  await delay()
  requireRole('admin')
  return { prompts: [...SUGGESTED_PROMPTS], assistant: ASSISTANT }
}
