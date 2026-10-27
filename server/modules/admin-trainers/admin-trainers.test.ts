import '../../__tests__/helpers/env'

import { afterEach, beforeAll, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { db } from '@server/db/connection'
import { auditEvents, trainerProfiles, user } from '@server/db/schema'
import { reseed } from '@server/db/seed'
import { and, eq } from 'drizzle-orm'
import { CLIENT_ORIGIN } from '../../__tests__/helpers/env'
import { stubSession } from '../../__tests__/helpers/session'
import { adminTestApp as app } from '../admin-api/admin-test-app'

setDefaultTimeout(120_000)

const send = (method: string, body: unknown) => ({
  method,
  headers: { 'Content-Type': 'application/json', Origin: CLIENT_ORIGIN },
  body: JSON.stringify(body),
})

beforeAll(async () => {
  await reseed({ referenceDate: '2026-10-27' })
})

afterEach(() => {
  mock.restore()
})

const trainerId = async (code: string) =>
  (
    await db
      .select({ id: trainerProfiles.id })
      .from(trainerProfiles)
      .where(eq(trainerProfiles.code, code))
  )[0]?.id as string

describe('trainer management', () => {
  test('lists ten trainers with approved programmes', async () => {
    stubSession('admin')
    const body = await (await app.request('/api/admin/trainers')).json()
    expect(body.items).toHaveLength(10)
    expect(body.items.find((t: { code: string }) => t.code === 'T10').programmes).toEqual([
      'A',
      'B',
    ])
  })

  test('detail shows role-based rights from the permission matrix', async () => {
    stubSession('admin')
    const body = await (await app.request(`/api/admin/trainers/${await trainerId('T03')}`)).json()
    expect(body.sessions).toHaveLength(3)
    const exportRight = body.rights.find((r: { action: string }) => r.action === 'export.personal')
    expect(exportRight.access).toBe('none')
    expect(body.marksExportFields).toEqual(['learnerCode', 'score'])
  })

  test('changing approved programmes is audited as a permission change', async () => {
    stubSession('admin')
    const id = await trainerId('T01')
    const res = await app.request(
      `/api/admin/trainers/${id}/programmes`,
      send('PUT', { programmes: ['A', 'C'], reason: 'Covering the storytelling sample' }),
    )
    expect(res.status).toBe(200)
    const [event] = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.action, 'permission.change'), eq(auditEvents.objectId, 'T01')))
    expect(event?.before).toEqual({ approvedProgrammes: ['A'] })
    expect(event?.after).toEqual({ approvedProgrammes: ['A', 'C'] })
    expect(event?.reason).toBe('Covering the storytelling sample')
  })

  test('an admin can provision a trainer; the account gets the trainer role', async () => {
    stubSession('admin')
    const res = await app.request(
      '/api/admin/trainers',
      send('POST', {
        fullName: 'Mariam Haddad',
        email: 'trainer11@example.com',
        headline: 'Heritage interpretation coach',
        bio: 'Fictional trainer who coaches heritage storytelling for guides.',
        expertise: ['Storytelling'],
        languages: ['Arabic', 'English'],
        organisation: 'Demo Academy Faculty',
        programmes: ['C'],
      }),
    )
    expect(res.status).toBe(201)
    expect((await res.json()).code).toBe('T11')
    const [created] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.email, 'trainer11@example.com'))
    expect(created?.role).toBe('trainer')
  })

  test('edits are audited', async () => {
    stubSession('admin')
    const id = await trainerId('T02')
    const res = await app.request(
      `/api/admin/trainers/${id}`,
      send('PATCH', { headline: 'Senior tour guiding facilitator' }),
    )
    expect(res.status).toBe(200)
    const events = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.action, 'trainer.update'), eq(auditEvents.objectId, 'T02')))
    expect(events).toHaveLength(1)
  })

  for (const role of ['learner', 'trainer'] as const) {
    test(`${role} gets 403`, async () => {
      stubSession(role)
      expect((await app.request('/api/admin/trainers')).status).toBe(403)
      expect(
        (
          await app.request(
            `/api/admin/trainers/${await trainerId('T01')}/programmes`,
            send('PUT', { programmes: ['A', 'B', 'C'], reason: 'Self-escalation' }),
          )
        ).status,
      ).toBe(403)
    })
  }
})
