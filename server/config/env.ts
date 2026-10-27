import { z } from 'zod'

/**
 * Boot-time validation of the environment. This is the only file that reads `process.env`
 * (drizzle.config.ts at the root is the other exception), so every setting the server uses is
 * listed, typed and defaulted here.
 */

const url = z.url()

// Comma-separated list of allowed browser origins, e.g. "http://localhost:5173,https://app.x.com".
const originList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(z.array(url.transform((origin) => new URL(origin).origin)).min(1))

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(8000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    DATABASE_URL: url,

    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: url,
    CLIENT_URL: originList,

    // Only true when a reverse proxy we control (Traefik under Dokploy) is the sole way in.
    // Otherwise X-Forwarded-For is attacker-controlled and must be ignored.
    TRUST_PROXY: z.stringbool().default(false),

    // Email: SES when deployed (staging, production), Mailpit everywhere else.
    AWS_REGION: z.string().default('us-east-1'),
    // Optional: without them the AWS SDK falls back to its default chain (e.g. an IAM role).
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    SES_FROM_EMAIL: z.email().default('no-reply@example.com'),
    MAILPIT_HOST: z.string().default('localhost'),
    MAILPIT_PORT: z.coerce.number().int().min(1).max(65_535).default(1025),
  })
  .superRefine((value, ctx) => {
    // A half-configured key pair is always a mistake; fail loudly instead of at first send.
    if (Boolean(value.AWS_ACCESS_KEY_ID) !== Boolean(value.AWS_SECRET_ACCESS_KEY)) {
      ctx.addIssue({
        code: 'custom',
        path: ['AWS_SECRET_ACCESS_KEY'],
        message: 'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set together',
      })
    }
  })

export type Env = z.infer<typeof envSchema>

/**
 * Docker Compose substitutes an unset `${VAR}` with an empty string, so '' means "not set":
 * required keys fail and optional keys take their default.
 */
function dropBlank(source: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''))
}

export function parseEnv(source: Record<string, string | undefined>) {
  return envSchema.safeParse(dropBlank(source))
}

function loadEnv(): Env {
  const result = parseEnv(process.env)
  if (result.success) return result.data

  // Name the keys and the reason, never the values: they may be secrets.
  const lines = result.error.issues.map((issue) => {
    const key = issue.path.join('.') || '(root)'
    const missing = !process.env[String(issue.path[0])]
    return `  - ${key}: ${missing ? 'missing (unset or empty)' : issue.message}`
  })
  console.error(`Invalid environment configuration:\n${lines.join('\n')}`)
  process.exit(1)
}

export const env = loadEnv()

/**
 * Running in a deployed container (staging or production). Staging behaves like production —
 * secure cookies, real email, no internal error messages — so it tests what will ship.
 */
export const isDeployed = env.NODE_ENV === 'production' || env.NODE_ENV === 'staging'
