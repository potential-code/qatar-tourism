import { zValidator } from '@hono/zod-validator'
import { HttpError } from '@server/lib/errors'
import type { ValidationTargets } from 'hono'
import type { z } from 'zod'

/**
 * zValidator with the house error shape: a failed parse becomes a 400
 * `{ error: { code: 'VALIDATION_ERROR', message, details: { target, issues } } }`.
 * Throwing (instead of returning a response) keeps the success type the only one the RPC
 * client infers.
 */
export function validate<Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid request', { target, issues })
    }
  })
}
