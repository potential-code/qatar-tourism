import './helpers/env'

import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { app } from '@server/app'
import { auth } from '@server/auth/auth'
import { CLIENT_ORIGIN } from './helpers/env'
import { stubSession } from './helpers/session'

const json = (body: unknown, headers: Record<string, string> = {}) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: CLIENT_ORIGIN, ...headers },
  body: JSON.stringify(body),
})

afterEach(() => {
  mock.restore()
})

describe('public routes', () => {
  test('GET /api/health is 200', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })

  test('unknown route is a JSON 404', async () => {
    const res = await app.request('/api/does-not-exist')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'No route for GET /api/does-not-exist' },
    })
  })

  test('sets security headers', async () => {
    const res = await app.request('/api/health')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })
})

describe('CORS and CSRF', () => {
  test('allows the configured client origin with credentials', async () => {
    const res = await app.request('/api/health', { headers: { Origin: CLIENT_ORIGIN } })
    expect(res.headers.get('access-control-allow-origin')).toBe(CLIENT_ORIGIN)
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
  })

  test('does not reflect other origins', async () => {
    const res = await app.request('/api/health', { headers: { Origin: 'https://evil.test' } })
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  test('rejects a cross-site form post', async () => {
    const res = await app.request('/api/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://evil.test',
      },
      body: 'title=x',
    })
    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe('FORBIDDEN')
  })
})

describe('auth and roles', () => {
  test('protected route is 401 without a session', async () => {
    stubSession(null)
    const res = await app.request('/api/me')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    })
  })

  test('GET /api/me returns the viewer', async () => {
    stubSession('user')
    const res = await app.request('/api/me')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      user: { id: 'user-user', name: 'Test user', email: 'user@example.com', role: 'user' },
    })
  })

  test('admin route is 403 for role user', async () => {
    stubSession('user')
    const res = await app.request('/api/admin/users')
    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe('FORBIDDEN')
  })

  test('admin route is 401 without a session', async () => {
    stubSession(null)
    const res = await app.request('/api/admin/users')
    expect(res.status).toBe(401)
  })
})

describe('validation', () => {
  test('invalid body is a 400 with the error shape', async () => {
    stubSession('user')
    const res = await app.request('/api/notes', json({ title: '' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details.target).toBe('json')
    expect(body.error.details.issues[0].path).toBe('title')
  })

  test('non-uuid id is a 400', async () => {
    stubSession('user')
    const res = await app.request('/api/notes/not-a-uuid')
    expect(res.status).toBe(400)
    expect((await res.json()).error.details.target).toBe('param')
  })

  test('bad pagination is a 400', async () => {
    stubSession('user')
    const res = await app.request('/api/notes?pageSize=1000')
    expect(res.status).toBe(400)
  })

  test('body over 1 MB is a 413', async () => {
    stubSession('user')
    const res = await app.request('/api/notes', json({ title: 'x', body: 'a'.repeat(1_100_000) }))
    expect(res.status).toBe(413)
    expect((await res.json()).error.code).toBe('PAYLOAD_TOO_LARGE')
  })
})

describe('credential rate limit', () => {
  test('sign-in is limited to 10 attempts per window', async () => {
    const handler = spyOn(auth, 'handler').mockImplementation(async () => Response.json({}))
    const attempt = () =>
      app.request('/api/auth/sign-in/email', json({ email: 'a@b.co', password: 'x' }))

    for (let i = 0; i < 10; i++) expect((await attempt()).status).toBe(200)

    const blocked = await attempt()
    expect(blocked.status).toBe(429)
    expect((await blocked.json()).error.code).toBe('RATE_LIMITED')
    expect(handler).toHaveBeenCalledTimes(10)
  })

  test('Better Auth receives our client IP, not the caller-supplied header', async () => {
    const handler = spyOn(auth, 'handler').mockImplementation(async () => Response.json({}))
    await app.request('/api/auth/get-session', { headers: { 'x-client-ip': '6.6.6.6' } })
    const forwarded = handler.mock.calls[0]?.[0] as Request
    expect(forwarded.headers.get('x-client-ip')).not.toBe('6.6.6.6')
  })
})
