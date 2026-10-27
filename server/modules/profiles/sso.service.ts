import { db } from '@server/db/connection'
import { user } from '@server/db/schema'
import { recordAudit } from '@server/modules/audit/audit.service'
import { eq } from 'drizzle-orm'
import { createDemoSession } from './demo-session'

/**
 * SIMULATED single sign-on (brief §3: "In demo mode, open an explanation and use a mock account;
 * label the connection as simulated."). No identity provider is contacted and nothing is
 * claimed as authenticated by Qatar Tourism. Each button maps to ONE fixed, seeded LEARNER
 * account, so it can never reach a trainer, an admin or a newly registered visitor.
 */
export const SSO_PROVIDERS = ['qatar-tourism', 'organisation'] as const
export type SsoProvider = (typeof SSO_PROVIDERS)[number]

const MOCK_ACCOUNTS: Record<SsoProvider, { email: string; label: string }> = {
  'qatar-tourism': { email: 'learner0013@example.com', label: 'Qatar Tourism account (simulated)' },
  organisation: { email: 'learner0016@example.com', label: 'Organisation account (simulated)' },
}

export async function signInSimulated(provider: SsoProvider) {
  const mock = MOCK_ACCOUNTS[provider]
  const [account] = await db
    .select({ id: user.id, name: user.name, role: user.role })
    .from(user)
    .where(eq(user.email, mock.email))
    .limit(1)
  // Guard against a changed dataset: the mock must still be a learner.
  if (account?.role !== 'learner') throw new Error('The simulated SSO account is not available')
  const session = await createDemoSession(account.id)
  await recordAudit(
    { id: account.id, role: 'learner', name: account.name },
    {
      action: 'auth.sso_simulated',
      objectType: 'user',
      objectId: account.id,
      after: { provider, mode: 'simulated', claimsVerified: false },
      reason: mock.label,
    },
  )
  return { session, result: { name: account.name, role: 'learner' as const, provider } }
}
