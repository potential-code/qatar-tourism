import { auth } from '@server/auth/auth'
import { env } from '@server/config/env'
import type { Role } from '@shared/roles'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { closeDb, db } from './connection'
import { user } from './schema'

/**
 * Development seed: one admin and one regular user, created through Better Auth so passwords
 * are hashed exactly as sign-up would. Safe to run repeatedly. Credentials come from the
 * environment; nothing is hardcoded, so no known password can end up in a real database.
 */

// Seed-only settings, parsed here rather than in config/env.ts so the server never requires
// them. '' counts as unset, as in config/env.ts.
const seedEnv = z
  .object({
    SEED_ADMIN_EMAIL: z.email(),
    SEED_ADMIN_PASSWORD: z.string().min(12),
    SEED_USER_EMAIL: z.email(),
    SEED_USER_PASSWORD: z.string().min(12),
  })
  .safeParse(
    Object.fromEntries(
      Object.entries(process.env).filter(([key, value]) => key.startsWith('SEED_') && value),
    ),
  )

async function ensureAccount(email: string, password: string, name: string, role: Role) {
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email))

  if (!existing) {
    await auth.api.signUpEmail({ body: { name, email, password } })
    console.log(`Created ${role} ${email}`)
  } else {
    console.log(`${email} already exists, updating role`)
  }

  // Role is not client-settable (input: false), and seeded accounts skip email verification.
  await db.update(user).set({ role, emailVerified: true }).where(eq(user.email, email))
}

async function main() {
  if (env.NODE_ENV === 'production') {
    console.error('Refusing to seed: NODE_ENV is production.')
    process.exit(1)
  }
  if (!seedEnv.success) {
    const keys = [...new Set(seedEnv.error.issues.map((issue) => issue.path.join('.')))]
    console.error(`Missing or invalid seed settings: ${keys.join(', ')}. See .env.example.`)
    process.exit(1)
  }

  const seed = seedEnv.data
  await ensureAccount(seed.SEED_ADMIN_EMAIL, seed.SEED_ADMIN_PASSWORD, 'Admin', 'admin')
  await ensureAccount(seed.SEED_USER_EMAIL, seed.SEED_USER_PASSWORD, 'User', 'user')
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(closeDb)
