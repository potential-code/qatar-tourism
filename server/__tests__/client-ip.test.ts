import './helpers/env'

import { describe, expect, test } from 'bun:test'
import { clientIp } from '@server/middleware/rate-limit.middleware'
import { Hono } from 'hono'

function appWith(trustProxy: boolean) {
  return new Hono().get('/', (c) => c.text(clientIp(c, trustProxy)))
}

describe('clientIp', () => {
  test('ignores X-Forwarded-For unless the proxy is trusted', async () => {
    const res = await appWith(false).request('/', { headers: { 'x-forwarded-for': '1.2.3.4' } })
    // No socket under app.request(), so the fallback shows the header was not used.
    expect(await res.text()).toBe('unknown')
  })

  test('behind a trusted proxy, takes the right-most hop', async () => {
    const res = await appWith(true).request('/', {
      headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.7' },
    })
    expect(await res.text()).toBe('203.0.113.7')
  })
})
