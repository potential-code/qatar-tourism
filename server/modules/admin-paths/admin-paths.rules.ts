import type { RuleCondition, RuleDefinition, RuleGroup, RuleProfile } from '@shared/content/paths'
import { matchesGroup } from '@shared/content/paths'

/**
 * Pure helpers for the path builder: rule evaluation with an explanation per condition, so the
 * preview can say WHY a rule matched or not (brief §14 "preview the match before publishing").
 * Matching itself is `matchesGroup` / `resolvePathRule` from shared/content/paths.ts, the same
 * code the enrolment service uses, so the preview cannot disagree with real assignment.
 */

export type ConditionResult = {
  field: RuleCondition['field']
  operator: RuleCondition['operator']
  expected: string[]
  actual: string[]
  pass: boolean
}

export type GroupResult = {
  op: RuleGroup['op']
  pass: boolean
  conditions: (ConditionResult | GroupResult)[]
}

function isGroup(node: RuleCondition | RuleGroup): node is RuleGroup {
  return 'op' in node
}

function valuesOf(profile: RuleProfile, field: RuleCondition['field']): string[] {
  const raw = profile[field]
  if (raw === null || raw === undefined) return []
  return Array.isArray(raw) ? raw.map(String) : [String(raw)]
}

export function explainGroup(group: RuleGroup, profile: RuleProfile): GroupResult {
  const conditions = group.conditions.map((node) => {
    if (isGroup(node)) return explainGroup(node, profile)
    const wrapped: RuleGroup = { op: 'AND', conditions: [node] }
    return {
      field: node.field,
      operator: node.operator,
      expected: Array.isArray(node.value) ? [...node.value] : [String(node.value)],
      actual: valuesOf(profile, node.field),
      pass: matchesGroup(wrapped, profile),
    }
  })
  return { op: group.op, pass: matchesGroup(group, profile), conditions }
}

/** Stable short description of a path item for audit before/after summaries. */
export function itemSignature(item: {
  kind: string
  title: string
  required: boolean
  level: number
  stage: string
}) {
  return `L${item.level} ${item.stage}: ${item.title}${item.required ? '' : ' (optional)'}`
}

export type { RuleDefinition }
