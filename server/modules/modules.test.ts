import './../__tests__/helpers/env'

import { afterEach, describe, expect, mock, test } from 'bun:test'
import { app } from '@server/app'
import { stubSession } from '../__tests__/helpers/session'

/** Every Phase 1 module stub is mounted, authenticated and answers with its own name. */
const STUBS = [
  'profiles',
  'organisations',
  'programmes',
  'paths',
  'courses',
  'scorm',
  'enrolments',
  'progress',
  'assessments',
  'ai-path',
  'roleplay',
  'sessions',
  'rsvps',
  'attendance',
  'assignments',
  'certificates',
  'notifications',
  'reports',
  'analytics',
  'ai-analytics',
  'exports',
] as const

afterEach(() => {
  mock.restore()
})

describe('module stubs', () => {
  for (const name of STUBS) {
    test(`/api/${name}/ping needs a session and returns its module name`, async () => {
      stubSession(null)
      expect((await app.request(`/api/${name}/ping`)).status).toBe(401)

      stubSession('learner')
      const res = await app.request(`/api/${name}/ping`)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ module: name, status: 'ok' })
    })
  }

  test('audit is admin only', async () => {
    stubSession('trainer')
    expect((await app.request('/api/audit')).status).toBe(403)
    stubSession('learner')
    expect((await app.request('/api/audit')).status).toBe(403)
  })
})
