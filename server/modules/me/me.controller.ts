import type { Viewer } from '@server/middleware/auth.middleware'

export function me(viewer: Viewer) {
  const { id, name, email, role } = viewer
  return { user: { id, name, email, role } }
}
