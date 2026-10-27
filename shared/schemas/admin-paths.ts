import { z } from 'zod'
import { PROGRAMME_CODES, RULE_STATUSES } from '../constants/enums'
import { pathItemInput, ruleGroup } from './path'

/** Learning path builder inputs (brief §14). Validated by the admin-paths API. */

export const pathIdParam = z.object({ pathId: z.uuid() })
export const ruleIdParam = z.object({ ruleId: z.uuid() })

export const createPathInput = z.object({
  programme: z.enum(PROGRAMME_CODES),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(5).max(400),
  /** Copy the published (or latest) items of this path into the new draft v1. */
  copyFromPathId: z.uuid().optional(),
})
export type CreatePathInput = z.infer<typeof createPathInput>

export const pathUpdateInput = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().min(5).max(400).optional(),
  /** Makes this the programme default: the default rule then points here. */
  isDefault: z.literal(true).optional(),
})

export const draftItemsInput = z.object({
  items: z.array(pathItemInput).min(1).max(40),
  changeNote: z.string().trim().max(300).optional(),
})
export type DraftItemsInput = z.infer<typeof draftItemsInput>

export const publishInput = z
  .object({
    changeNote: z.string().trim().min(5).max(300),
    /** Deliberate migration of open enrolments to the new version (brief §14). */
    migrateOpen: z.boolean().default(false),
    migrationReason: z.string().trim().max(300).optional(),
  })
  .refine((v) => !v.migrateOpen || (v.migrationReason?.length ?? 0) >= 5, {
    message: 'A migration needs a reason of at least 5 characters',
    path: ['migrationReason'],
  })
export type PublishInput = z.infer<typeof publishInput>

export const ruleInput = z.object({
  name: z.string().trim().min(3).max(120),
  programme: z.enum(PROGRAMME_CODES),
  pathId: z.uuid(),
  priority: z.number().int().min(0).max(1000),
  isDefault: z.boolean().default(false),
  conditions: ruleGroup,
  summary: z.string().trim().min(3).max(300),
  status: z.enum(RULE_STATUSES).default('published'),
})
export type RuleInput = z.infer<typeof ruleInput>

/** A rule as previewed: saved rules may be replaced by unsaved edits (id optional). */
export const previewRule = ruleInput.extend({ id: z.uuid().optional() })
export type PreviewRule = z.infer<typeof previewRule>

export const matchPreviewInput = z.object({
  programme: z.enum(PROGRAMME_CODES),
  learnerCode: z
    .string()
    .trim()
    .regex(/^L\d{4}$/, 'Use a learner ID such as L0001')
    .default('L0001'),
  /** Unsaved rule set for this programme. Omit to preview the saved, published rules. */
  rules: z.array(previewRule).max(30).optional(),
})
export type MatchPreviewInput = z.infer<typeof matchPreviewInput>

export const experienceQuery = z.object({
  learnerCode: z
    .string()
    .regex(/^L\d{4}$/)
    .default('L0001'),
  versionId: z.uuid().optional(),
})

export const overrideInput = z.object({
  enrolmentId: z.uuid(),
  pathId: z.uuid(),
  reason: z.string().trim().min(5, 'Give a reason of at least 5 characters').max(300),
})
