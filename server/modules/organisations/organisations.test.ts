import '../../__tests__/helpers/env'

import { afterEach, beforeAll, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { ensureSeeded } from '../../__tests__/helpers/seeded'
import { stubSession } from '../../__tests__/helpers/session'
import { call } from '../profiles/profiles.test-utils'

setDefaultTimeout(120_000)

beforeAll(async () => {
  await ensureSeeded()
})

afterEach(() => {
  mock.restore()
})

type Org = { name: string; isPseudo: boolean; type: string }

describe('GET /api/organisations (brief §4 organisation search)', () => {
  test('needs a session', async () => {
    stubSession(null)
    expect((await call('/api/organisations')).status).toBe(401)
  })

  test('finds fictional organisations and always offers the two pseudo choices', async () => {
    stubSession('learner')
    const { items } = await (await call('/api/organisations?q=pearl')).json()
    const names = items.map((o: Org) => o.name)
    expect(names).toContain('Demo Pearl Hospitality')
    expect(names).toContain('Independent professional')
    expect(names).toContain('Not currently employed')
    expect(items.filter((o: Org) => !o.isPseudo).every((o: Org) => o.name.startsWith('Demo'))).toBe(
      true,
    )
  })

  test('filters by type and treats LIKE wildcards literally', async () => {
    stubSession('learner')
    const byType = await (await call('/api/organisations?type=transport')).json()
    expect(
      byType.items.filter((o: Org) => !o.isPseudo).every((o: Org) => o.type === 'transport'),
    ).toBe(true)
    const wildcard = await (await call('/api/organisations?q=%25')).json()
    expect(wildcard.items.every((o: Org) => o.isPseudo)).toBe(true)
  })
})
