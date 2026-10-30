import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import {
  CRM_COPY,
  getCrmCard,
  listCrmEvents,
  reportLmsEventToCrm,
  retryCrmEvent,
  runCrmDemoSync,
  saveCrmConnection,
  setCrmOutage,
  setCrmPaused,
  testCrmConnection,
} from '../crm.service'
import {
  linkCrmIdentity,
  listCrmMappings,
  listIdentityReview,
  previewCrmMapping,
  previewResolveMapping,
  reconcileCrmEvent,
  resolveCrmMapping,
  updateCrmMapping,
} from '../crm-mapping.service'
import { advanceCrmScenario, getCrmScenario, resetCrmScenario } from '../crm-scenario.service'
import { listAccessAudit, previewAccess } from '../integrations/access.service'
import { saveApiConfig, saveDataResidency, saveSsoConfig } from '../integrations.service'
import { beginSsoTest, completeSsoTest } from '../sso-test.service'
import { actAs, freshDemo } from './helpers'

let db: DemoDb
const ADMIN = 'user-admin'
const MARIAM = 'user-l0042'

beforeEach(() => {
  db = freshDemo()
  actAs(db, ADMIN)
})

const counts = () => ({
  users: db.users.length,
  profiles: db.profiles.length,
  enrolments: db.enrolments.length,
  certificates: db.certificates.length,
  requests: db.approvalRequests.length,
})

const connectionInput = () => ({
  name: 'Demo CRM (illustrative)',
  environment: 'Sandbox',
  endpoint: 'https://crm.demo.invalid/api',
  authMethod: 'OAuth 2.0 client credentials (simulated)',
  syncDirection: 'both' as const,
  triggerMode: 'event-driven' as const,
  enabledCategories: ['enrolment', 'completion', 'examination', 'certification', 'licence'] as (
    | 'enrolment'
    | 'completion'
    | 'examination'
    | 'certification'
    | 'licence'
  )[],
})

describe('retry, mapping failure and idempotency', () => {
  test('QT-A fails with the exact copy, resolves, then retries to processed with no duplicates', async () => {
    const failed = (await listCrmEvents()).find((e) => e.eventId === 'EVT-0003')
    expect(failed?.status).toBe('failed')
    expect(failed?.error).toBe(CRM_COPY.unmapped)
    expect(failed?.unmappedCode).toBe('QT-A')

    const still = await retryCrmEvent('EVT-0003')
    expect(still.status).toBe('failed')
    expect(still.message).toBe(CRM_COPY.unmapped)

    const preview = await previewResolveMapping('EVT-0003', 'A')
    expect(preview.after).toContain('QT-A to Program A')
    expect(preview.effect).toContain('no duplicate record is created')
    expect((await listCrmMappings()).unmappedCodes).toContain('QT-A')

    await resolveCrmMapping('EVT-0003', 'A')
    expect((await listCrmMappings()).unmappedCodes).not.toContain('QT-A')

    const before = counts()
    const done = await retryCrmEvent('EVT-0003')
    expect(done.status).toBe('processed')
    expect(done.message).toBe(
      'Event processed. Existing enrolment updated; no duplicate record created.',
    )
    expect(counts()).toEqual(before)

    const attempts = db.crmEvents.find((e) => e.eventId === 'EVT-0003')?.attempts
    const again = await retryCrmEvent('EVT-0003')
    expect(again.duplicate).toBe(true)
    expect(counts()).toEqual(before)
    expect(db.crmEvents.find((e) => e.eventId === 'EVT-0003')?.attempts).toBe(attempts)
  })

  test('retrying a processed event changes nothing', async () => {
    const before = structuredClone(db.crmEvents.find((e) => e.eventId === 'EVT-0001'))
    const result = await retryCrmEvent('EVT-0001')
    expect(result.duplicate).toBe(true)
    expect(db.crmEvents.find((e) => e.eventId === 'EVT-0001')).toEqual(before)
  })

  test('an event for an unknown CRM id goes to identity review and creates no learner', async () => {
    const before = counts()
    const review = await listIdentityReview()
    expect(review.map((r) => r.externalLearnerId)).toContain('CRM-7001')
    const first = review[0]
    expect(first?.candidates[0]?.name).toBe('Mariam Al Nuaimi')
    expect(first?.candidates[0]?.linkedTo).toBe('CRM-0042')
    await expect(linkCrmIdentity(first?.mappingId ?? '', MARIAM, 'Same person')).rejects.toThrow(
      /already linked/,
    )
    expect(counts()).toEqual(before)
  })
})

describe('stale events and reconciliation', () => {
  test('a stale inbound licence event never overwrites a newer status', async () => {
    const licence = () => db.licenceStatus.find((l) => l.learnerId === MARIAM)
    const before = structuredClone(licence())
    db.crmEvents.push({
      id: 'stale-1',
      eventId: 'EVT-0900',
      type: 'licence',
      direction: 'crm_to_lms',
      learnerId: MARIAM,
      externalLearnerId: 'CRM-0042',
      entityId: null,
      status: 'queued',
      attempts: 0,
      error: null,
      payload: { licenceStatus: 'suspended', crmUpdatedAt: '2020-01-01T00:00:00.000Z' },
      occurredAt: '2020-01-01T00:00:00.000Z',
      processedAt: null,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    })
    const result = await retryCrmEvent('EVT-0900')
    expect(result.status).toBe('conflict')
    expect(result.message).toContain('Stale CRM event')
    expect(licence()).toEqual(before)
  })

  test('reconcile needs a reason and keeps or applies the chosen value, audited', async () => {
    await expect(reconcileCrmEvent('EVT-0004', 'keep_lms', 'no')).rejects.toThrow()
    const learner = db.crmEvents.find((e) => e.eventId === 'EVT-0004')?.learnerId
    const before = db.licenceStatus.find((l) => l.learnerId === learner)?.status
    await reconcileCrmEvent('EVT-0004', 'keep_lms', 'The LMS status is newer')
    expect(db.crmEvents.find((e) => e.eventId === 'EVT-0004')?.status).toBe('processed')
    expect(db.licenceStatus.find((l) => l.learnerId === learner)?.status).toBe(before)
    expect(
      db.auditEvents.some((a) => a.action === 'crm.event.reconcile' && a.objectId === 'EVT-0004'),
    ).toBe(true)
  })
})

describe('outage and pause', () => {
  test('an outage keeps the event queued for retry, then a sync delivers it', async () => {
    await setCrmOutage(true)
    const queued = reportLmsEventToCrm({
      type: 'completion',
      learnerId: MARIAM,
      payload: { programmeCode: 'QT-A' },
    })
    expect(queued?.status).toBe('queued')
    expect(queued?.message).toBe(CRM_COPY.outage)
    const sync = await runCrmDemoSync()
    expect(sync.results.every((r) => r.status === 'queued')).toBe(true)
    expect((await getCrmCard()).pending).toBeGreaterThanOrEqual(2)

    await setCrmOutage(false)
    const after = await runCrmDemoSync()
    expect(after.results.every((r) => r.status === 'processed')).toBe(true)
    expect((await getCrmCard()).pending).toBe(0)
  })

  test('a paused sync refuses a demo sync and keeps events queued', async () => {
    await setCrmPaused(true)
    await expect(runCrmDemoSync()).rejects.toThrow(/paused/i)
    const queued = reportLmsEventToCrm({ type: 'completion', learnerId: MARIAM, payload: {} })
    expect(queued?.status).toBe('queued')
    expect((await getCrmCard()).mode).toBe('Sync paused')
  })

  test('the test connection reports a simulated outage as failed', async () => {
    await setCrmOutage(true)
    expect((await testCrmConnection()).ok).toBe(false)
    await setCrmOutage(false)
    expect((await testCrmConnection()).ok).toBe(true)
  })
})

describe('SSO test sign in', () => {
  test('returns to the same learner account and creates no profile', async () => {
    const before = counts()
    const assertion = await beginSsoTest()
    expect(assertion.email).toBe('mariam.alnuaimi@example.com')
    const result = await completeSsoTest('approve')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.accountId).toBe(MARIAM)
      expect(result.learnerId).toBe('LRN-0042')
      expect(result.duplicateProfilesCreated).toBe(0)
      expect(result.programmes).toEqual(['Program A', 'Program B'])
    }
    expect(counts()).toEqual(before)
    expect(db.integrationSettings.find((s) => s.area === 'sso')?.state).toBe('Connected demo')
    // The admin's own session is not switched.
    expect(db.session?.userId).toBe(ADMIN)
  })

  test('a failed login shows Test failed and a retry succeeds', async () => {
    const failed = await completeSsoTest('fail')
    expect(failed.ok).toBe(false)
    expect(db.integrationSettings.find((s) => s.area === 'sso')?.state).toBe('Test failed')
    const retry = await completeSsoTest('approve')
    expect(retry.ok).toBe(true)
    const trail = await listAccessAudit()
    expect(trail.filter((r) => r.action === 'SSO test sign in').map((r) => r.result)).toEqual([
      'Allowed',
      'Denied',
    ])
  })
})

describe('previews', () => {
  test('learner launches, unassigned is denied, visitor is asked to sign in', async () => {
    const learner = await previewAccess('learner')
    expect(learner.outcome).toBe('launched')
    expect(learner.steps.map((s) => s.label)).toEqual([
      'Sign in',
      'Identity check',
      'Academy permissions',
      'Authorised content launch',
    ])
    const unassigned = await previewAccess('unassigned')
    expect(unassigned.outcome).toBe('denied')
    expect(unassigned.content).toBeNull()
    const visitor = await previewAccess('visitor')
    expect(visitor.outcome).toBe('sign_in_required')
    const trainer = await previewAccess('trainer')
    expect(trainer.exports.find((e) => e.label.startsWith('Personal data'))?.allowed).toBe(false)
  })
})

describe('permissions', () => {
  test('only an admin can save configuration or mapping', async () => {
    const trainer = db.users.find((u) => u.role === 'trainer')
    const learner = db.users.find((u) => u.role === 'learner')
    const mapping = (await listCrmMappings()).fields[0]
    const calls = [
      () => saveCrmConnection(connectionInput()),
      () => updateCrmMapping(mapping?.id ?? '', { required: true }),
      () => resolveCrmMapping('EVT-0003', 'A'),
      () => advanceCrmScenario({}),
      () =>
        saveSsoConfig({
          providerName: 'Demo IdP',
          protocol: 'saml',
          entityId: 'https://idp.demo.invalid/metadata',
          roleMapping: { learner: 'a', trainer: 'b' },
        }),
      () => saveDataResidency([]),
      () => completeSsoTest('approve'),
    ]
    for (const id of [trainer?.id ?? '', learner?.id ?? '']) {
      actAs(db, id)
      for (const call of calls) await expect(call()).rejects.toMatchObject({ status: 403 })
    }
    actAs(db, null)
    await expect(saveCrmConnection(connectionInput())).rejects.toMatchObject({ status: 401 })
  })

  test('validation refuses real endpoints and unknown values', async () => {
    await expect(
      saveCrmConnection({ ...connectionInput(), endpoint: 'https://crm.example.com/api' }),
    ).rejects.toThrow()
    await expect(
      saveApiConfig({
        baseUrl: 'https://api.real.com',
        connectionType: 'REST polling',
        eventCategories: ['enrolment'],
        scopes: { read: [], write: [] },
      }),
    ).rejects.toThrow()
    const saved = await saveCrmConnection({ ...connectionInput(), syncDirection: 'lms_to_crm' })
    expect(saved.syncDirection).toBe('lms_to_crm')
    expect(db.auditEvents.at(-1)?.action).toBe('integration.config_save')
  })
})

describe('field mapping preview', () => {
  test('shows conflicts and the authoritative system', async () => {
    const { fields } = await listCrmMappings()
    const licence = fields.find((f) => f.crmField === 'licence_status')
    const exam = fields.find((f) => f.crmField === 'exam_score')
    const preview = await previewCrmMapping(licence?.id ?? '', {}, 'ACTIVE')
    expect(preview.output).toBe('active')
    expect(preview.authoritativeLabel).toBe('CRM')
    expect(preview.conflicts).toEqual([])
    const flipped = await previewCrmMapping(exam?.id ?? '', { authoritative: 'crm' }, '0.82')
    expect(flipped.output).toBe(82)
    expect(flipped.conflicts[0]).toContain('CRM is authoritative')
    const programme = fields.find((f) => f.crmField === 'programme_code')
    const gap = await previewCrmMapping(programme?.id ?? '', {}, 'QT-A')
    expect(gap.conflicts[0]).toContain('No mapping for value QT-A')
    await expect(
      previewCrmMapping(exam?.id ?? '', { direction: 'sideways' as never }, '1'),
    ).rejects.toThrow()
  })
})

describe('run scenario', () => {
  test('steps advance in order, gates hold, and no licence is granted without a CRM decision', async () => {
    const certificates = db.certificates.length
    const licence = () => db.licenceStatus.find((l) => l.learnerId === MARIAM)?.status
    const licenceBefore = licence()

    // Step 1 pauses on the unmapped QT-A, with the exact copy.
    const blocked = await advanceCrmScenario()
    expect(blocked.result.blocked).toBe(true)
    expect(blocked.result.message).toBe(CRM_COPY.unmapped)
    expect(blocked.scenario.step).toBe(0)
    const sameEvent = await advanceCrmScenario()
    expect(sameEvent.result.events[0]?.eventId).toBe(blocked.result.events[0]?.eventId)
    expect(
      db.crmEvents.filter(
        (e) =>
          e.payload.source === undefined &&
          e.externalLearnerId === 'CRM-0042' &&
          e.status === 'failed',
      ).length,
    ).toBe(1)

    await resolveCrmMapping('EVT-0003', 'A')
    const s1 = await advanceCrmScenario()
    expect(s1.scenario.step).toBe(1)
    expect(s1.result.message).toBe(CRM_COPY.retried)
    const s2 = await advanceCrmScenario()
    expect(s2.scenario.step).toBe(2)
    expect(s2.result.message).toContain('approved')

    // Step 3 holds: Mariam has not finished her Program A learning, so the gate is not skipped.
    const gate = await advanceCrmScenario()
    expect(gate.result.blocked).toBe(true)
    expect(gate.scenario.step).toBe(2)
    expect(gate.result.message).toContain('Gate not met')

    // Only an explicit, labelled simulated continuation passes it.
    const s3 = await advanceCrmScenario({ simulateEvidence: true })
    expect(s3.scenario.step).toBe(3)
    expect(s3.scenario.log.at(-1)?.simulated).toBe(true)
    expect((await advanceCrmScenario()).scenario.step).toBe(4)
    expect((await advanceCrmScenario()).scenario.step).toBe(5)
    const s6 = await advanceCrmScenario()
    expect(s6.scenario.step).toBe(6)
    expect(s6.result.events.map((e) => e.status)).toEqual(['processed', 'processed', 'processed'])

    // Step 7 needs the CRM decision; until then the licence is untouched.
    const noDecision = await advanceCrmScenario()
    expect(noDecision.result.blocked).toBe(true)
    expect(noDecision.result.message).toContain('Completing training does not grant a licence')
    expect(licence()).toBe(licenceBefore)

    const done = await advanceCrmScenario({ licenceDecision: 'pending' })
    expect(done.scenario.complete).toBe(true)
    expect(licence()).toBe('pending')
    expect(db.certificates.length).toBe(certificates)
    expect(done.scenario.steps.every((s) => s.status === 'done')).toBe(true)

    const reset = await resetCrmScenario()
    expect(reset.step).toBe(0)
    expect((await getCrmScenario()).complete).toBe(false)
  })

  test('an outage during step 6 keeps the three events queued and the run continues', async () => {
    await resolveCrmMapping('EVT-0003', 'A')
    for (let i = 0; i < 2; i += 1) await advanceCrmScenario()
    await advanceCrmScenario({ simulateEvidence: true })
    await advanceCrmScenario()
    await advanceCrmScenario()
    await setCrmOutage(true)
    const s6 = await advanceCrmScenario()
    expect(s6.result.events.map((e) => e.status)).toEqual(['queued', 'queued', 'queued'])
    await setCrmOutage(false)
    const sync = await runCrmDemoSync()
    expect(sync.results.filter((r) => r.status === 'processed').length).toBeGreaterThanOrEqual(3)
  })
})
