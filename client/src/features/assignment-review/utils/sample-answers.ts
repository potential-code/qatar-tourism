import type { RubricItem } from '@/features/assignments/types'

/** Share of each rubric part's maximum the sample awards: a clear pass, not a perfect mark. */
const SHARE = 0.84

/** Presenter sample marks: every part scored, an approve decision and specific feedback. */
export function sampleMarking(rubric: readonly RubricItem[]) {
  return {
    breakdown: Object.fromEntries(rubric.map((item) => [item.key, Math.round(item.max * SHARE)])),
    decision: 'approved' as const,
    feedback:
      'A warm, well-structured response. You acknowledged the change straight away, your discovery questions were specific, and the options you offered were realistic and confirmed before you offered them. Next time, give the guest a precise time for your follow-up message so they know exactly when to expect it.',
  }
}
