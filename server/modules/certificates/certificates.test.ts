import '../../__tests__/helpers/env'

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  mock,
  setDefaultTimeout,
  test,
} from 'bun:test'
import { db } from '@server/db/connection'
import { auditEvents, certificates } from '@server/db/schema'
import { and, asc, eq } from 'drizzle-orm'
import { HAS_TEST_DB } from '../../__tests__/helpers/env'
import { recomputeEnrolment } from '../progress/progress.service'
import { ADMIN, call, freshSeed, signInAs } from '../sessions/test-support'

setDefaultTimeout(180_000)

beforeAll(async () => {
  if (HAS_TEST_DB) await freshSeed()
})
afterAll(async () => {
  if (HAS_TEST_DB) await freshSeed()
})
afterEach(() => mock.restore())

const asAdmin = () => signInAs(ADMIN[0], ADMIN[1], ADMIN[2])

async function certificatesOf(enrolmentId: string) {
  return db
    .select({ code: certificates.code, status: certificates.status })
    .from(certificates)
    .where(eq(certificates.enrolmentId, enrolmentId))
    .orderBy(asc(certificates.code))
}

/** A seeded certificate whose enrolment the rules still find eligible. */
async function eligibleCertificate(skip = 0) {
  const rows = await db
    .select({
      code: certificates.code,
      learnerId: certificates.learnerId,
      enrolmentId: certificates.enrolmentId,
    })
    .from(certificates)
    .orderBy(asc(certificates.code))
  let seen = 0
  for (const row of rows) {
    // Remove the certificate; if a recompute issues a new one, the enrolment is eligible.
    await db.delete(certificates).where(eq(certificates.code, row.code))
    await db.transaction((tx) => recomputeEnrolment(row.learnerId, 'A', tx))
    const [issued] = await certificatesOf(row.enrolmentId)
    if (issued && seen++ === skip) return { ...row, code: issued.code }
  }
  throw new Error('No eligible seeded certificate')
}

describe.skipIf(!HAS_TEST_DB)('certificate revocation (brief §6: admin-only, audited)', () => {
  test('a revoked certificate is not silently re-issued by a later progress recompute', async () => {
    const cert = await eligibleCertificate()
    asAdmin()
    const revoked = await call('POST', `/api/certificates/${cert.code}/revoke`, {
      reason: 'Issued in error during the demo',
    })
    expect(revoked.status).toBe(200)

    // Any learner, trainer or SCORM write re-runs the rules for this enrolment.
    await db.transaction((tx) => recomputeEnrolment(cert.learnerId, 'A', tx))
    expect(await certificatesOf(cert.enrolmentId)).toEqual([{ code: cert.code, status: 'revoked' }])

    // Only the admin reissue replaces it, and a recompute then keeps that one.
    const reissued = await call('POST', `/api/certificates/${cert.code}/reissue`, {
      reason: 'Corrected after review',
    })
    expect(reissued.status).toBe(200)
    await db.transaction((tx) => recomputeEnrolment(cert.learnerId, 'A', tx))
    const after = await certificatesOf(cert.enrolmentId)
    expect(after.filter((c) => c.status === 'issued')).toHaveLength(1)
    expect(after).toHaveLength(2)

    // Brief §11: revocation and reissue are audited with the admin's reason.
    const audited = await db
      .select({ action: auditEvents.action, reason: auditEvents.reason })
      .from(auditEvents)
      .where(and(eq(auditEvents.objectType, 'certificate'), eq(auditEvents.objectId, cert.code)))
    expect(audited).toContainEqual({
      action: 'certificate.revoke',
      reason: 'Issued in error during the demo',
    })
    const [reissueEvent] = await db
      .select({ reason: auditEvents.reason })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.action, 'certificate.reissue'),
          eq(auditEvents.objectId, reissued.json.code),
        ),
      )
    expect(reissueEvent?.reason).toBe('Corrected after review')
  })

  test('two reissues at the same moment get distinct codes (no unique-code collision)', async () => {
    const [first, second] = await db
      .select({ code: certificates.code })
      .from(certificates)
      .where(eq(certificates.status, 'issued'))
      .orderBy(asc(certificates.code))
      .limit(2)
    asAdmin()
    for (const cert of [first, second]) {
      const res = await call('POST', `/api/certificates/${cert?.code}/revoke`, {
        reason: 'Concurrency check',
      })
      expect(res.status).toBe(200)
    }
    const results = await Promise.all(
      [first, second].map((cert) =>
        call('POST', `/api/certificates/${cert?.code}/reissue`, { reason: 'Concurrency check' }),
      ),
    )
    expect(results.map((r) => r.status)).toEqual([200, 200])
    expect(new Set(results.map((r) => r.json.code)).size).toBe(2)
  })
})
