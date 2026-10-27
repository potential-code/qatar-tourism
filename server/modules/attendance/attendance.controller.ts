import type { Scope } from '@server/middleware/scope.middleware'
import type { Role } from '@shared/roles'
import type { SessionScoreInput } from '@shared/schemas/session'
import type { AttendanceUpdateInput } from '@shared/schemas/trainer-ops'
import type { Actor } from '../sessions/actor'
import * as attendanceService from './attendance.service'
import * as learnersService from './learners.service'

export function ping() {
  return { module: 'attendance' as const, status: 'ok' as const }
}

export const roster = (scope: Scope, role: Role, sessionId: string) =>
  attendanceService.roster(scope, role, sessionId)
export const mark = (actor: Actor, scope: Scope, input: AttendanceUpdateInput) =>
  attendanceService.markAttendance(actor, scope, input)
export const score = (actor: Actor, scope: Scope, input: SessionScoreInput) =>
  attendanceService.recordScore(actor, scope, input)
export const learners = (scope: Scope, role: Role) => learnersService.assignedLearners(scope, role)
