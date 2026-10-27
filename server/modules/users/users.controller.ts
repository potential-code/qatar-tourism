import type { ListQuery } from '@shared/schemas'
import * as usersService from './users.service'

export async function listUsers(query: ListQuery) {
  const { items, total } = await usersService.listUsers(query)
  return {
    items: items.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}
