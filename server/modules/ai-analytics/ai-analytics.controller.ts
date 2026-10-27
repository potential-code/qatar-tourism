import { randomUUID } from 'node:crypto'
import { now, referenceDate } from '@server/lib/clock'
import type { AnalyticsAnswer } from '@shared/schemas/admin-ai'
import * as analyticsService from '../analytics/analytics.service'
import { build } from './ai-analytics.answers'
import { CLARIFY_OPTIONS, match, SUGGESTED_PROMPTS } from './ai-analytics.intents'

export function ping() {
  return { module: 'ai-analytics' as const, status: 'ok' as const }
}

const REFUSALS = {
  write:
    'I am a read-only assistant, so I cannot change, enrol, send, mark or delete anything. Changes are made in Academy Management, where every action is audited.',
  personal:
    'I cannot show email addresses, phone numbers or identity data. My answers use learner IDs and permitted display names only.',
  query:
    'I do not run database queries. I answer from the governed Academy metrics only, so every figure matches the Dashboard and Reports.',
} as const

const SUPPORTED_TOPICS =
  'I can answer questions about enrolments by programme, completion by organisation, pre and post improvement, trainer marking, attendance by format, Program A certification readiness and inactive learners.'

function blank(question: string): Omit<AnalyticsAnswer, 'kind' | 'title' | 'prose'> {
  return {
    id: randomUUID(),
    question,
    intent: null,
    chart: null,
    table: null,
    filters: [],
    definition: null,
    period: null,
    sampleSize: null,
    generatedAt: now().toISOString(),
    records: null,
    options: [],
    assistant: 'Demo analytics assistant',
  }
}

const suggestions = () => SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => ({ label: prompt, prompt }))

/** Answers one question from the governed metrics. Read-only: nothing here writes. */
export async function ask(question: string): Promise<AnalyticsAnswer> {
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

  const facts = await analyticsService.loadFacts()
  const built = build(result.intent, result.programme, facts, referenceDate())
  return {
    ...base,
    ...built,
    kind: 'answer',
    intent: result.intent,
    generatedAt: facts.asOf.toISOString(),
  }
}

export function prompts() {
  return { prompts: [...SUGGESTED_PROMPTS], assistant: 'Demo analytics assistant' as const }
}
