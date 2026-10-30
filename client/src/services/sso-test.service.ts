import { learnerDisplayId } from '@shared/utils/identity'
import { commit, db, delay, nowIso, out, requireCapability } from './api'
import { audit } from './audit.service'
import { settingRow, ssoConfig } from './integrations/settings'

/**
 * The SSO "Test sign in" (SPEC §2). A mock identity provider asserts one fixed demo identity.
 * The Academy matches it to the EXISTING learner account by email: one Academy account spans
 * programmes, and no profile is ever created. The admin's real session is not switched.
 */

export const SSO_TEST_LEARNER_CODE = 'L0042'

export type IdpAssertion = {
  providerName: string
  protocol: 'SAML' | 'OpenID Connect'
  subject: string
  email: string
  displayName: string
  groups: string[]
}

/** What the mock identity provider shows on its sign-in step. */
export async function beginSsoTest(): Promise<IdpAssertion> {
  await delay()
  requireCapability('integration.configure')
  const config = ssoConfig()
  const profile = db.profiles.find((p) => p.learnerCode === SSO_TEST_LEARNER_CODE)
  const user = db.users.find((u) => u.id === profile?.userId)
  return out({
    providerName: config.providerName,
    protocol: config.protocol === 'saml' ? 'SAML' : 'OpenID Connect',
    subject: 'idp-demo-subject-0042',
    email: user?.email ?? 'mariam.alnuaimi@example.com',
    displayName: profile?.fullName ?? 'Mariam Al Nuaimi',
    groups: [config.roleMapping.learner],
  })
}

export type SsoTestResult =
  | {
      ok: true
      accountId: string
      learnerId: string
      name: string
      programmes: string[]
      duplicateProfilesCreated: 0
      message: string
    }
  | { ok: false; message: string; reason: string }

/** Completes the test: approve returns to the same learner account, fail shows the failed state. */
export async function completeSsoTest(outcome: 'approve' | 'fail'): Promise<SsoTestResult> {
  await delay()
  requireCapability('integration.configure')
  const row = settingRow('sso')
  const profile = db.profiles.find((p) => p.learnerCode === SSO_TEST_LEARNER_CODE)
  const account = db.users.find((u) => u.id === profile?.userId && u.role === 'learner')
  const demoUser = profile?.fullName ?? 'Demo learner'
  row.lastTestAt = nowIso()

  if (outcome === 'fail' || !profile || !account) {
    const reason =
      outcome === 'fail'
        ? 'The identity provider declined the sign in (simulated failure).'
        : 'No Academy learner account matches the identity returned by the provider; no account was created.'
    row.state = 'Test failed'
    audit({
      action: 'sso.test_sign_in',
      objectType: 'integration',
      objectId: 'sso',
      after: { demoUser, result: 'failed' },
      reason,
      outcome: 'denied',
    })
    commit()
    return { ok: false, message: 'Sign in failed. Retry the test sign in.', reason }
  }

  const programmes = db.enrolments
    .filter((e) => e.learnerId === account.id)
    .map((e) => `Program ${db.programmes.find((p) => p.id === e.programmeId)?.code ?? '?'}`)
    .sort()
  row.state = 'Connected demo'
  const display = learnerDisplayId(profile.learnerCode)
  audit({
    action: 'sso.test_sign_in',
    objectType: 'integration',
    objectId: 'sso',
    after: { demoUser, learner: display, result: 'matched existing account', programmes },
    reason: `Matched the existing Academy account ${display}; no profile was created.`,
  })
  commit()
  return out({
    ok: true as const,
    accountId: account.id,
    learnerId: display,
    name: profile.fullName,
    programmes,
    duplicateProfilesCreated: 0 as const,
    message: `Signed back in to the same Academy account (${display}). One account spans ${programmes.join(' and ') || 'all programmes'}; no duplicate profile was created.`,
  })
}
