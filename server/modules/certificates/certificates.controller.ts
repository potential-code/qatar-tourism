import type { Viewer } from '@server/middleware/auth.middleware'
import * as service from './certificates.service'

export function ping() {
  return { module: 'certificates' as const, status: 'ok' as const }
}

export const verify = (code: string) => service.verify(code)
export const mine = (viewer: Viewer) => service.listMine(viewer.id)
export const detail = (viewer: Viewer, code: string) => service.getForViewer(viewer, code)
export const pdf = (viewer: Viewer, code: string) => service.pdfForViewer(viewer, code)
export const revoke = (viewer: Viewer, code: string, reason: string) =>
  service.revoke(viewer, code, reason)
export const reissue = (viewer: Viewer, code: string, reason: string) =>
  service.reissue(viewer, code, reason)
