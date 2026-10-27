import type { Viewer } from '@server/middleware/auth.middleware'
import * as userService from '@server/services/user.service'
import type { ListQuery } from '@shared/schemas'

export function me(viewer: Viewer) {
  const { id, name, email, role } = viewer
  return { user: { id, name, email, role } }
}

export async function listUsers(query: ListQuery) {
  const { items, total } = await userService.listUsers(query)
  return {
    items: items.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}
