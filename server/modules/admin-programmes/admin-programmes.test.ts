import '../../__tests__/helpers/env'

import { afterEach, beforeAll, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { db } from '@server/db/connection'
import { auditEvents, programmes } from '@server/db/schema'
import { reseed } from '@server/db/seed'
import { eq } from 'drizzle-orm'
import { CLIENT_ORIGIN } from '../../__tests__/helpers/env'
import { stubSession } from '../../__tests__/helpers/session'
import { adminTestApp as app } from '../admin-api/admin-test-app'

setDefaultTimeout(120_000)

beforeAll(async () => {
  await reseed({ referenceDate: '2026-10-27' })
})

afterEach(() => {
  mock.restore()
})

const patch = (body: unknown) => ({
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Origin: CLIENT_ORIGIN },
  body: JSON.stringify(body),
})

async function idOf(code: 'A' | 'B' | 'C') {
  const [row] = await db
    .select({ id: programmes.id })
    .from(programmes)
    .where(eq(programmes.code, code))
  return row?.id ?? ''
}

describe('programme list', () => {
  test('counts come from the database: A 420, B 660, C 180; 120 A certificates', async () => {
    stubSession('admin')
    const res = await app.request('/api/admin/programmes')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      code: string
      enrolments: number
      certificates: number
      canCertify: boolean
    }[]
    expect(body.map((p) => [p.code, p.enrolments, p.certificates, p.canCertify])).toEqual([
      ['A', 420, 120, true],
      ['B', 660, 0, false],
      ['C', 180, 0, false],
    ])
  })

  test('detail shows the stage structure of the default path', async () => {
    stubSession('admin')
    const res = await app.request(`/api/admin/programmes/${await idOf('A')}`)
    const body = (await res.json()) as {
      structure: { level: number }[]
      defaultPath: { code: string }
    }
    expect(body.defaultPath.code).toBe('A-PRO')
    expect(new Set(body.structure.map((s) => s.level))).toEqual(new Set([1, 2]))
  })
})

describe('certification is enforced off for B and C (brief §14)', () => {
  for (const code of ['B', 'C'] as const) {
    test(`Program ${code}: enabling certification is refused and nothing changes`, async () => {
      stubSession('admin')
      const res = await app.request(
        `/api/admin/programmes/${await idOf(code)}`,
        patch({ certificationEnabled: true }),
      )
      expect(res.status).toBe(422)
      expect((await res.json()).error.code).toBe('CERTIFICATION_NOT_ALLOWED')
      const [row] = await db
        .select({ on: programmes.certificationEnabled })
        .from(programmes)
        .where(eq(programmes.code, code))
      expect(row?.on).toBe(false)
    })
  }

  test('an allowed edit is saved and audited with before/after', async () => {
    stubSession('admin')
    const res = await app.request(
      `/api/admin/programmes/${await idOf('B')}`,
      patch({ audience: 'Anyone who welcomes visitors in Qatar.' }),
    )
    expect(res.status).toBe(200)
    const [event] = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.action, 'programme.update'))
    expect(event?.objectId).toBe('B')
    expect(event?.after).toMatchObject({ audience: 'Anyone who welcomes visitors in Qatar.' })
  })
})

describe('access', () => {
  for (const role of ['learner', 'trainer'] as const) {
    test(`${role} gets 403`, async () => {
      stubSession(role)
      expect((await app.request('/api/admin/programmes')).status).toBe(403)
      expect(
        (
          await app.request(
            `/api/admin/programmes/${await idOf('B')}`,
            patch({ title: 'Hacked title' }),
          )
        ).status,
      ).toBe(403)
    })
  }
})
