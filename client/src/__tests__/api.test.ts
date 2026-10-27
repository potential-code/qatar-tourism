import { describe, expect, test } from 'bun:test'
import type { ClientResponse } from 'hono/client'
import { ApiError, unwrap } from '@/lib/api'

// unwrap only reads ok/status/statusText/json, so a real Response stands in for the RPC one.
function response<T>(body: unknown, status: number) {
  const init = { status, headers: { 'Content-Type': 'application/json' } }
  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  return new Response(payload, init) as unknown as ClientResponse<T, 200, 'json'>
}

describe('unwrap', () => {
  test('returns the JSON body of a successful response', async () => {
    await expect(unwrap(response<{ status: 'ok' }>({ status: 'ok' }, 200))).resolves.toEqual({
      status: 'ok',
    })
  })

  test('throws an ApiError built from the error shape', async () => {
    const res = response(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: { title: ['x'] } } },
      400,
    )
    const error = await unwrap(res).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      details: { title: ['x'] },
    })
  })

  test('still throws an ApiError when the error body is not the API shape', async () => {
    const error = await unwrap(response('<html>Bad gateway</html>', 502)).catch(
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 502, code: 'UNKNOWN' })
  })
})
