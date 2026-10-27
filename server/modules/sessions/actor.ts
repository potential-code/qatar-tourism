import type { Viewer } from '@server/middleware/auth.middleware'

/** The signed-in viewer plus the request id, as services record it in the audit trail. */
export type Actor = Pick<Viewer, 'id' | 'role' | 'name'> & { requestId?: string }

/** Route helper: services never see Hono, only this plain object. */
export function actorOf(c: { var: { viewer: Viewer }; get: (key: never) => unknown }): Actor {
  return { ...c.var.viewer, requestId: c.get('requestId' as never) as string | undefined }
}
