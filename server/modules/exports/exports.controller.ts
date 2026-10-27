import type { ProgrammeCode } from '@shared/constants'
import type { Actor } from '../sessions/actor'
import * as exportsService from './exports.service'

export function ping() {
  return { module: 'exports' as const, status: 'ok' as const }
}

export const sessionMarks = (actor: Actor, sessionId: string) =>
  exportsService.exportSessionMarks(actor, sessionId)
export const sessionPersonal = (actor: Actor, sessionId: string) =>
  exportsService.exportSessionPersonal(actor, sessionId)
export const programmeLearners = (actor: Actor, programme: ProgrammeCode) =>
  exportsService.exportProgrammeLearners(actor, programme)
