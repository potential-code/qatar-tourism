import type { Viewer } from '@server/middleware/auth.middleware'
import type { ProfileCompleteInput, ProfileDraftInput, RegisterInput } from '@shared/schemas'
import type { FacilitatorTarget, ProfileUpdateInput } from '@shared/schemas/profile-account'
import * as facilitatorService from './facilitator.service'
import { assertFacilitator } from './profiles.policy'
import * as profilesService from './profiles.service'
import * as registrationService from './registration.service'
import type { SsoProvider } from './sso.service'
import * as ssoService from './sso.service'

export function ping() {
  return { module: 'profiles' as const, status: 'ok' as const }
}

export function register(input: RegisterInput) {
  return registrationService.register(input)
}

export function verify(email: string, code: string) {
  return registrationService.verifySimulated(email, code)
}

export function resend(email: string) {
  return registrationService.resendSimulated(email)
}

export function getMine(viewer: Viewer) {
  return profilesService.getOwnProfile(viewer.id)
}

export function saveDraft(viewer: Viewer, input: ProfileDraftInput) {
  return profilesService.saveDraft(viewer.id, input)
}

export function complete(viewer: Viewer, input: ProfileCompleteInput) {
  return profilesService.completeProfile(viewer, input)
}

export function update(viewer: Viewer, input: ProfileUpdateInput) {
  return profilesService.updateProfile(viewer.id, input)
}

export function acceptRevision(viewer: Viewer, programme: 'A' | 'B' | 'C') {
  return profilesService.acceptRevision(viewer, programme)
}

export async function facilitatorStatus(
  viewer: Viewer,
  token: string,
  cookie: string | false | undefined,
) {
  const adminId = await facilitatorService.facilitatorFor(
    { userId: viewer.id, role: viewer.role, token },
    cookie,
  )
  if (!adminId) return { active: false as const, targets: [] }
  return { active: true as const, targets: await facilitatorService.listTargets() }
}

export async function facilitatorSwitch(
  viewer: Viewer,
  token: string,
  cookie: string | false | undefined,
  target: FacilitatorTarget,
) {
  const adminId = await facilitatorService.facilitatorFor(
    { userId: viewer.id, role: viewer.role, token },
    cookie,
  )
  assertFacilitator(adminId)
  const switched = await facilitatorService.switchTo(adminId, target, token)
  return {
    adminId,
    session: switched.session,
    result: { role: switched.role, name: switched.name },
  }
}

export function simulatedSso(provider: SsoProvider) {
  return ssoService.signInSimulated(provider)
}
