import {
  COMPETENCIES,
  EXPERIENCE_BANDS,
  JOB_FUNCTIONS,
  LEARNING_GOALS,
  ORGANISATION_TYPES,
  type PathItemKind,
  SENIORITY_LEVELS,
} from '@shared/constants'
import { COMPETENCY_LABELS } from '@shared/content/assessments'
import type { RuleCondition, RuleField, RuleGroup, RuleOperator } from '@shared/content/paths'
import {
  EXPERIENCE_LABELS,
  GOAL_LABELS,
  JOB_FUNCTION_LABELS,
  ORGANISATION_TYPE_LABELS,
  SENIORITY_LABELS,
} from '@shared/schemas/admin-labels'

/** Rule-builder vocabulary (brief §14 "Rule controls"). */

type Option = { value: string; label: string }

const options = <K extends string>(values: readonly K[], labels: Record<K, string>): Option[] =>
  values.map((value) => ({ value, label: labels[value] }))

export type FieldMeta = {
  field: RuleField
  label: string
  /** Choices for enumerated fields; free text otherwise. */
  options?: Option[]
  operators: RuleOperator[]
  multi: boolean
}

export const RULE_FIELDS: FieldMeta[] = [
  {
    field: 'organisationType',
    label: 'Organisation type',
    options: options(ORGANISATION_TYPES, ORGANISATION_TYPE_LABELS),
    operators: ['eq', 'in'],
    multi: false,
  },
  { field: 'organisation', label: 'Organisation', operators: ['eq', 'contains'], multi: false },
  {
    field: 'jobFunction',
    label: 'Job function',
    options: options(JOB_FUNCTIONS, JOB_FUNCTION_LABELS),
    operators: ['eq', 'in'],
    multi: false,
  },
  { field: 'jobTitle', label: 'Job title', operators: ['contains'], multi: false },
  {
    field: 'seniority',
    label: 'Seniority',
    options: options(SENIORITY_LEVELS, SENIORITY_LABELS),
    operators: ['eq', 'in'],
    multi: false,
  },
  {
    field: 'experience',
    label: 'Experience',
    options: options(EXPERIENCE_BANDS, EXPERIENCE_LABELS),
    operators: ['eq', 'in'],
    multi: false,
  },
  {
    field: 'goals',
    label: 'Learning goals',
    options: options(LEARNING_GOALS, GOAL_LABELS),
    operators: ['includes_any'],
    multi: true,
  },
  {
    field: 'baselineWeakCompetency',
    label: 'Baseline weakest competency',
    options: options(COMPETENCIES, COMPETENCY_LABELS),
    operators: ['eq', 'in'],
    multi: false,
  },
]

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  eq: 'is',
  in: 'is any of',
  includes_any: 'includes any of',
  contains: 'contains',
}

export const fieldMeta = (field: RuleField) =>
  RULE_FIELDS.find((f) => f.field === field) ?? (RULE_FIELDS[0] as FieldMeta)

export function valueLabel(field: RuleField, value: string) {
  return fieldMeta(field).options?.find((o) => o.value === value)?.label ?? value
}

export const isGroup = (node: RuleCondition | RuleGroup): node is RuleGroup => 'op' in node

export const asList = (value: RuleCondition['value']): string[] =>
  Array.isArray(value) ? [...value] : value ? [String(value)] : []

/** Plain-language summary: "Organisation type is Hotel AND Job function is any of …". */
export function describeGroup(group: RuleGroup): string {
  if (group.conditions.length === 0) return 'Default when no more specific rule matches'
  return group.conditions
    .map((node) => {
      if (isGroup(node)) return `(${describeGroup(node)})`
      const meta = fieldMeta(node.field)
      const values = asList(node.value).map((v) => valueLabel(node.field, v))
      return `${meta.label} ${OPERATOR_LABELS[node.operator]} ${values.join(', ') || '…'}`
    })
    .join(` ${group.op} `)
}

export function blankCondition(): RuleCondition {
  return { field: 'organisationType', operator: 'eq', value: 'hotel_accommodation' }
}

export const ITEM_KIND_LABELS: Record<PathItemKind, string> = {
  course: 'Course unit',
  assessment_pre: 'Pre-assessment',
  assessment_post: 'Post-assessment',
  assessment_formative: 'Formative quiz',
  ai_practice: 'AI practice',
  session: 'Trainer-led session gate',
  assignment: 'Assignment gate',
}
