import { z } from 'zod'
import { PATH_ITEM_KINDS, PATH_VERSION_STATUSES, PROGRAMME_CODES } from '../constants/enums'

const ruleCondition = z.object({
  field: z.enum([
    'organisationType',
    'organisation',
    'jobFunction',
    'jobTitle',
    'seniority',
    'experience',
    'goals',
    'baselineWeakCompetency',
  ]),
  operator: z.enum(['eq', 'in', 'includes_any', 'contains']),
  value: z.union([z.string(), z.array(z.string())]),
})

type RuleGroupInput = {
  op: 'AND' | 'OR'
  conditions: (z.infer<typeof ruleCondition> | RuleGroupInput)[]
}

export const ruleGroup: z.ZodType<RuleGroupInput> = z.lazy(() =>
  z.object({
    op: z.enum(['AND', 'OR']),
    conditions: z.array(z.union([ruleCondition, ruleGroup])),
  }),
)

export const pathItemInput = z.object({
  kind: z.enum(PATH_ITEM_KINDS),
  courseId: z.uuid().nullable().optional(),
  scenarioKey: z.string().nullable().optional(),
  title: z.string().trim().min(2).max(160),
  required: z.boolean(),
  level: z.number().int().min(1).max(5),
  stage: z.string().trim().min(2).max(120),
  note: z.string().trim().max(200).nullable().optional(),
})

export const pathDraftInput = z.object({
  name: z.string().trim().min(3).max(120),
  programme: z.enum(PROGRAMME_CODES),
  description: z.string().trim().min(5).max(400),
  items: z.array(pathItemInput).min(1),
})
export type PathDraftInput = z.infer<typeof pathDraftInput>

export const pathVersionView = z.object({
  id: z.uuid(),
  pathId: z.uuid(),
  version: z.number().int(),
  status: z.enum(PATH_VERSION_STATUSES),
  changeNote: z.string().nullable(),
  publishedAt: z.string().nullable(),
})

export const assignmentRuleInput = z.object({
  name: z.string().trim().min(3).max(120),
  programme: z.enum(PROGRAMME_CODES),
  pathId: z.uuid(),
  priority: z.number().int().min(0).max(1000),
  isDefault: z.boolean().default(false),
  conditions: ruleGroup,
})
export type AssignmentRuleInput = z.infer<typeof assignmentRuleInput>

/** Path preview with a profile (brief §14: "Add a path preview using Maha’s profile"). */
export const pathPreviewInput = z.object({
  programme: z.enum(PROGRAMME_CODES),
  learnerCode: z
    .string()
    .regex(/^L\d{4}$/)
    .default('L0001'),
})

export const pathOverrideInput = z.object({
  enrolmentId: z.uuid(),
  pathId: z.uuid(),
  reason: z.string().trim().min(5).max(300),
})
