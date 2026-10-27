import { rubricTotal } from '@shared/schemas/assignment-marking'
import { useMemo, useState } from 'react'
import type { RubricItem } from '@/features/assignments/types'
import type { Decision } from '../types'

export type MarkingFields = {
  breakdown: Record<string, number>
  feedback: string
  decision: Decision | null
}

/** Rubric, feedback and decision state shared by marking and correction. */
export function useMarkingFields(rubric: RubricItem[], initial: Partial<MarkingFields>) {
  const [breakdown, setBreakdown] = useState<Record<string, number>>(() =>
    Object.fromEntries(rubric.map((item) => [item.key, initial.breakdown?.[item.key] ?? 0])),
  )
  const [feedback, setFeedback] = useState(initial.feedback ?? '')
  const [decision, setDecision] = useState<Decision | null>(initial.decision ?? null)
  const total = useMemo(() => rubricTotal(rubric, breakdown), [rubric, breakdown])

  const setPart = (key: string, value: number) =>
    setBreakdown((current) => ({ ...current, [key]: value }))

  return { breakdown, setPart, feedback, setFeedback, decision, setDecision, total }
}
