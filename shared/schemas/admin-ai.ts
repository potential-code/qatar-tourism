import { z } from 'zod'
import type { ReportKey } from './admin-reports'

/** A question to the read-only Demo analytics assistant (brief §13). */
export const askInput = z.object({
  question: z.string().trim().min(2, 'Ask a question').max(300),
})
export type AskInput = z.infer<typeof askInput>

export type AnswerKind = 'answer' | 'clarify' | 'unsupported' | 'refused'

export type AnswerCell = string | number | null

export type AnswerChart =
  | {
      type: 'column' | 'bar'
      label: string
      unit: 'count' | 'percent' | 'points'
      data: { label: string; value: number }[]
    }
  | {
      type: 'grouped'
      unit: 'count' | 'percent' | 'points'
      series: { key: string; label: string }[]
      data: ({ label: string } & Record<string, number | string>)[]
    }

export type AnswerTable = {
  columns: { key: string; header: string; numeric?: boolean }[]
  rows: Record<string, AnswerCell>[]
}

/** Everything an answer must carry (brief §13): prose, chart/table, filters, definition, period, n, time. */
export type AnalyticsAnswer = {
  id: string
  question: string
  kind: AnswerKind
  intent: string | null
  title: string
  prose: string
  chart: AnswerChart | null
  table: AnswerTable | null
  filters: { label: string; value: string }[]
  definition: string | null
  period: string | null
  sampleSize: { label: string; value: number } | null
  generatedAt: string
  /** "View underlying records": the report and the search params that reproduce the answer. */
  records: { label: string; report: ReportKey; search: Record<string, string> } | null
  /** Follow-up prompts: the clarifying choices, or what the assistant can answer instead. */
  options: { label: string; prompt: string }[]
  assistant: 'Demo analytics assistant'
}
