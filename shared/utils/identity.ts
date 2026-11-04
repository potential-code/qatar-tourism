import type { AccountStatus } from '../constants/enums'

/**
 * Learner identity helpers (29 Oct update). One learner identity spans programmes, admin records,
 * trainer attendance, assessment reports, certificates and CRM examples.
 */

/** `L0042` (the profile's learnerCode) shown as `LRN-0042` in the 29 Oct screens and copy. */
export function learnerDisplayId(learnerCode: string): string {
  return `LRN-${learnerCode.replace(/^L/, '')}`
}

/** The stable CRM identifier derived from a learner code: `L0042` becomes `CRM-0042`. */
export function crmLearnerId(learnerCode: string): string {
  return `CRM-${learnerCode.replace(/^L/, '')}`
}

/**
 * The effective account status. `suspended` is the older flag (a disabled account); it wins over
 * an 'active' `accountStatus` so existing suspensions read as 'disabled'.
 */
export function accountStatusOf(profile: {
  accountStatus: AccountStatus
  suspended: boolean
}): AccountStatus {
  if (profile.accountStatus === 'active' && profile.suspended) return 'disabled'
  return profile.accountStatus
}

/**
 * The fictional sign-in address for a seeded name: first name, a dot, then the rest of the name
 * with no spaces, at example.com. `Maha Al Nouri` becomes `maha.alnouri@example.com`.
 */
export function demoEmail(fullName: string): string {
  const [first = '', ...rest] = fullName
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .split(' ')
    .filter(Boolean)
  return `${first}.${rest.join('')}@example.com`
}

/** `demoEmail`, numbered (`sara.mansour2@…`) when `used` already holds it. Adds the result to `used`. */
export function uniqueDemoEmail(fullName: string, used: Set<string>): string {
  const base = demoEmail(fullName)
  let email = base
  for (let n = 2; used.has(email); n++) email = base.replace('@', `${n}@`)
  used.add(email)
  return email
}
