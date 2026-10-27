import type { Scope } from '@server/middleware/scope.middleware'
import type { SessionStatus } from '@shared/constants'
import type { SessionRescheduleInput } from '@shared/schemas/session'
import type { SessionUpdateInput } from '@shared/schemas/trainer-ops'
import type { Actor } from './actor'
import * as overviewService from './overview.service'
import * as changesService from './session-changes.service'
import * as sessionsService from './sessions.service'

export function ping() {
  return { module: 'sessions' as const, status: 'ok' as const }
}

export const overview = (scope: Scope) => overviewService.trainerOverview(scope)
export const profile = (scope: Scope) => overviewService.trainerProfile(scope)
export const resources = (scope: Scope) => overviewService.trainerResources(scope)
export const formOptions = (scope: Scope) => sessionsService.formOptions(scope)
export const list = (scope: Scope, status?: SessionStatus) =>
  sessionsService.listSessions(scope, status)
export const detail = (scope: Scope, id: string) => sessionsService.sessionDetail(scope, id)
export const create = (actor: Actor, scope: Scope, input: SessionUpdateInput, publish: boolean) =>
  sessionsService.createSession(actor, scope, input, publish)
export const update = (actor: Actor, scope: Scope, id: string, input: SessionUpdateInput) =>
  sessionsService.updateSession(actor, scope, id, input)
export const publish = (actor: Actor, scope: Scope, id: string) =>
  sessionsService.publishSession(actor, scope, id)
export const complete = (actor: Actor, scope: Scope, id: string) =>
  sessionsService.completeSession(actor, scope, id)
export const impact = (
  scope: Scope,
  id: string,
  proposed: { startsAt?: string; endsAt?: string },
) => changesService.impact(scope, id, proposed)
export const reschedule = (actor: Actor, scope: Scope, id: string, input: SessionRescheduleInput) =>
  changesService.reschedule(actor, scope, id, input)
export const cancel = (
  actor: Actor,
  scope: Scope,
  id: string,
  input: { reason: string; idempotencyKey: string },
) => changesService.cancelSession(actor, scope, id, input)
