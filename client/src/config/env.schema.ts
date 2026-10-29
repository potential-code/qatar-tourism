import { z } from 'zod'

/**
 * Schema for the SPA's build-time environment, checked by vite.config.ts so a bad value fails
 * `vite build` instead of shipping. Every key is optional: the mockup runs with no settings.
 */
export const clientEnvSchema = z.object({
  /** YYYY-MM-DD. Moves every "Day +N" in the seed; unset keeps the fixed reference date. */
  VITE_DEMO_REFERENCE_DATE: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

export type ClientEnv = z.infer<typeof clientEnvSchema>

export function parseClientEnv(source: Record<string, unknown>): ClientEnv {
  const result = clientEnvSchema.safeParse(source)
  if (!result.success) {
    // Name the keys, never the values: build logs are often shared.
    const keys = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))]
    throw new Error(`Invalid client environment: ${keys.join(', ')}. See .env.example.`)
  }
  return result.data
}
