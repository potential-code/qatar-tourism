import '../__tests__/helpers/env'

import { beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { db } from '@server/db/connection'
import { sessions } from '@server/db/schema'
import { eq } from 'drizzle-orm'
import { ensureSeeded } from '../__tests__/helpers/seeded'
import {
  assertLearnerInScope,
  assertSessionInScope,
  assignedLearnerIds,
  resolveScope,
} from './scope.middleware'

setDefaultTimeout(120_000)

const viewer = (id: string, role: 'learner' | 'trainer' | 'admin') => ({
  id,
  role,
  name: id,
  email: `${id}@example.com`,
})

async function sessionOf(code: string) {
  const [row] = await db.select().from(sessions).where(eq(sessions.code, code))
  if (!row) throw new Error(`No session ${code}`)
  return row
}

beforeAll(async () => {
  await ensureSeeded()
})

describe('trainer scope (brief §10–11)', () => {
  test('a trainer is scoped to their own trainer profile', async () => {
    const scope = await resolveScope(viewer('user-t01', 'trainer'))
    expect(scope.kind).toBe('trainer')
  })

  test("Trainer 1 may open their own session but not Trainer 2's", async () => {
    const scope = await resolveScope(viewer('user-t01', 'trainer'))
    await expect(
      assertSessionInScope(scope, (await sessionOf('SES-T01-2')).id),
    ).resolves.toBeUndefined()
    await expect(
      assertSessionInScope(scope, (await sessionOf('SES-T02-2')).id),
    ).rejects.toMatchObject({
      status: 403,
    })
  })

  test("Trainer 1's learners exclude learners who only attend Trainer 2's sessions", async () => {
    const scope1 = await resolveScope(viewer('user-t01', 'trainer'))
    const scope2 = await resolveScope(viewer('user-t02', 'trainer'))
    const mine = (await assignedLearnerIds(scope1)) as string[]
    const theirs = (await assignedLearnerIds(scope2)) as string[]
    expect(mine.length).toBeGreaterThan(0)
    const onlyTheirs = theirs.find((id) => !mine.includes(id)) as string
    expect(onlyTheirs).toBeTruthy()
    await expect(assertLearnerInScope(scope1, onlyTheirs)).rejects.toMatchObject({ status: 403 })
    await expect(assertLearnerInScope(scope2, onlyTheirs)).resolves.toBeUndefined()
  })

  test('an unknown session is a 404 for a trainer', async () => {
    const scope = await resolveScope(viewer('user-t01', 'trainer'))
    await expect(
      assertSessionInScope(scope, '00000000-0000-4000-8000-000000000000'),
    ).rejects.toMatchObject({ status: 404 })
  })

  test('a trainer-role account without a trainer profile has no scope', async () => {
    await expect(resolveScope(viewer('user-nobody', 'trainer'))).rejects.toMatchObject({
      status: 403,
    })
  })
})

describe('admin and learner scope', () => {
  test('admin passes every check', async () => {
    const scope = await resolveScope(viewer('user-admin', 'admin'))
    expect(scope.kind).toBe('all')
    await expect(
      assertSessionInScope(scope, (await sessionOf('SES-T02-2')).id),
    ).resolves.toBeUndefined()
    expect(await assignedLearnerIds(scope)).toBe('all')
  })

  test('a learner sees only themselves and no sessions as a manager', async () => {
    const scope = await resolveScope(viewer('user-l0001', 'learner'))
    expect(scope.kind).toBe('self')
    await expect(assertLearnerInScope(scope, 'user-l0001')).resolves.toBeUndefined()
    await expect(assertLearnerInScope(scope, 'user-l0002')).rejects.toMatchObject({ status: 403 })
    await expect(
      assertSessionInScope(scope, (await sessionOf('SES-T01-2')).id),
    ).rejects.toMatchObject({
      status: 403,
    })
  })
})
