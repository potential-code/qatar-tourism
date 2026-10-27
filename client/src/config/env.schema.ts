import { z } from 'zod'

/**
 * Schema for the SPA's build-time environment. Shared by the runtime check (config/env.ts)
 * and the build (vite.config.ts), so a bad value fails `vite build` instead of shipping.
 */
export const clientEnvSchema = z.object({
  VITE_API_URL: z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, '')),
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
