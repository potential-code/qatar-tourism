import type { AppType } from '@server/app'
import type { ClientResponse } from 'hono/client'
import { hc } from 'hono/client'
import type { ResponseFormat } from 'hono/types'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { env } from '@/config/env'

/**
 * Typed RPC client for the Hono API.
 *
 * `AppType` is imported type-only, so no server code reaches the browser bundle
 * (vite.config.ts fails the build if it ever does). Cookies carry the Better Auth session,
 * hence `credentials: 'include'` on a cross-origin API.
 */
export const api = hc<AppType>(env.VITE_API_URL, { init: { credentials: 'include' } }).api

/** The API's error shape: `{ error: { code, message, details? } }`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

type AnyClientResponse = ClientResponse<unknown, number, ResponseFormat>

type SuccessBody<R> =
  R extends ClientResponse<infer T, infer S, ResponseFormat>
    ? S extends SuccessStatusCode
      ? T
      : never
    : never

function isErrorBody(
  body: unknown,
): body is { error: { code: string; message: string; details?: unknown } } {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false
  const error = (body as { error: unknown }).error
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  )
}

/**
 * Resolves an RPC call to its success body, or throws an `ApiError`.
 * Non-JSON error bodies (a proxy's HTML 502, say) still become an ApiError.
 */
export async function unwrap<R extends AnyClientResponse>(
  response: R | Promise<R>,
): Promise<SuccessBody<R>> {
  const res = await response
  if (res.ok) return (await res.json()) as SuccessBody<R>

  const body: unknown = await res.json().catch(() => null)
  if (isErrorBody(body)) {
    throw new ApiError(res.status, body.error.code, body.error.message, body.error.details)
  }
  throw new ApiError(res.status, 'UNKNOWN', res.statusText || `Request failed (${res.status})`)
}
