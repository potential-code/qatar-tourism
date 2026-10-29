import { ApiError, commit, db, delay } from './api'
import { recordAudit } from './audit.service'
import { startSession } from './auth/session'

/**
 * SIMULATED single sign-on (brief §3: "In demo mode, open an explanation and use a mock account;
 * label the connection as simulated."), formerly server/modules/profiles/sso.service.ts. No
 * identity provider is contacted. Each button maps to ONE fixed, seeded LEARNER account, so it
 * can never reach a trainer, an admin or a newly registered visitor.
 */
export const SSO_PROVIDERS = ['qatar-tourism', 'organisation'] as const
export type SsoProvider = (typeof SSO_PROVIDERS)[number]

const MOCK_ACCOUNTS: Record<SsoProvider, { email: string; label: string }> = {
  'qatar-tourism': { email: 'learner0013@example.com', label: 'Qatar Tourism account (simulated)' },
  organisation: { email: 'learner0016@example.com', label: 'Organisation account (simulated)' },
}

/** Signs in as the provider's mock learner. Audited as simulated, with no verified claims. */
export async function signInSimulated(provider: SsoProvider) {
  await delay(300)
  const mock = SSO_PROVIDERS.includes(provider) ? MOCK_ACCOUNTS[provider] : undefined
  if (!mock) throw ApiError.validation('Invalid request', { target: 'json', issues: [] })
  const account = db.users.find((u) => u.email === mock.email)
  // Guard against a changed dataset: the mock must still be a learner.
  if (account?.role !== 'learner') {
    throw new ApiError(503, 'SSO_UNAVAILABLE', 'The simulated SSO account is not available')
  }
  startSession(account)
  recordAudit(
    { id: account.id, role: 'learner', name: account.name },
    {
      action: 'auth.sso_simulated',
      objectType: 'user',
      objectId: account.id,
      after: { provider, mode: 'simulated', claimsVerified: false },
      reason: mock.label,
    },
  )
  commit()
  return { name: account.name, role: 'learner' as const, provider }
}
