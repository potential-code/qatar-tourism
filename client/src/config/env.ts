import { parseClientEnv } from './env.schema'

/**
 * Validated client environment. Vite inlines `import.meta.env.VITE_*` at build time, so every
 * value here is public and fixed per build.
 */
export const env = parseClientEnv(import.meta.env)
