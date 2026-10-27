import '../../__tests__/helpers/env'

import { afterEach, beforeAll, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { app } from '@server/app'
import { ensureSeeded } from '../../__tests__/helpers/seeded'
import { stubSession } from '../../__tests__/helpers/session'

setDefaultTimeout(120_000)

beforeAll(async () => {
  await ensureSeeded()
})

afterEach(() => {
  mock.restore()
})

describe('GET /api/admin/users', () => {
  test('lists the 1,211 seeded accounts to an admin without any password field', async () => {
    stubSession('admin')
    const res = await app.request('/api/admin/users?pageSize=5')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(1211)
    expect(body.items).toHaveLength(5)
    expect(Object.keys(body.items[0]).sort()).toEqual(['createdAt', 'email', 'id', 'name', 'role'])
  })
})
