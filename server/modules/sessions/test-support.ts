import { spyOn } from 'bun:test'
import { app } from '@server/app'
import { auth } from '@server/auth/auth'
import { reseed } from '@server/db/seed'
import { stableUuid } from '@server/db/seed/ids'
import type { Role } from '@shared/roles'
import { CLIENT_ORIGIN } from '../../__tests__/helpers/env'

/**
 * Test support for the sessions, rsvps, attendance and exports modules. Imported by tests only.
 * Import '../../__tests__/helpers/env' first in the test file.
 */

export const REFERENCE_DATE = '2026-10-27'

/** Fresh deterministic dataset: these suites write bookings, so they restore it after too. */
export const freshSeed = () => reseed({ referenceDate: REFERENCE_DATE })

export const sessionId = (code: string) => stableUuid('session', code)

/** Signs the request in as a seeded user (e.g. 'user-l0002', 'user-t01', 'user-admin'). */
export function signInAs(id: string, role: Role, name = id) {
  const spy = spyOn(auth.api, 'getSession')
  spy.mockResolvedValue({
    user: {
      id,
      name,
      email: `${id}@example.com`,
      emailVerified: true,
      image: null,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: `session-${id}`,
      userId: id,
      token: 'token',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: null,
      userAgent: null,
    },
  } as never)
  return spy
}

export const OMAR = ['user-l0002', 'learner', 'Omar Al Safi'] as const
export const MAHA = ['user-l0001', 'learner', 'Maha Al Nouri'] as const
export const LEILA = ['user-l0003', 'learner', 'Leila Rahman'] as const
export const T01 = ['user-t01', 'trainer', 'Amal Al Nouri'] as const
export const T03 = ['user-t03', 'trainer', 'Leila Haddad'] as const
export const T05 = ['user-t05', 'trainer', 'Noura Al Saleh'] as const
export const T10 = ['user-t10', 'trainer', 'Aisha Rahman'] as const
export const ADMIN = ['user-admin', 'admin', 'Academy Admin'] as const

export async function call(method: string, path: string, body?: unknown) {
  const res = await app.request(path, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: CLIENT_ORIGIN },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json: unknown = null
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  // biome-ignore lint/suspicious/noExplicitAny: test convenience for reading JSON bodies
  return { status: res.status, json: json as any, text, headers: res.headers }
}
