import type { Viewer } from '@server/middleware/auth.middleware'
import type { AdminProgrammeUpdate } from '@shared/schemas/admin-programmes'
import * as service from './admin-programmes.service'

export const list = () => service.listProgrammes()
export const detail = (programmeId: string) => service.getProgramme(programmeId)
export const update = (
  viewer: Viewer,
  programmeId: string,
  input: AdminProgrammeUpdate,
  requestId?: string,
) => service.updateProgramme(viewer, programmeId, input, requestId)
