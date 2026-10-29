import { beforeEach, describe, expect, test } from 'bun:test'
import type { ProfileCompleteInput } from '@shared/schemas'
import type { DemoDb } from '@/mocks/db'
import { insertRow } from '../api'
import { searchOrganisations } from '../organisations.service'
import {
  acceptRevision,
  completeProfile,
  getOwnProfile,
  saveDraft,
  updateProfile,
} from '../profiles.service'
import { enrolSelf, listMyEnrolments } from '../programme-enrolment.service'
import { register } from '../registration.service'
import { actAs, freshDemo } from './helpers'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

const orgId = (name: string) => {
  const org = db.organisations.find((o) => o.name === name)
  if (!org) throw new Error(`missing organisation ${name}`)
  return org.id
}

const pathOf = (userId: string, code: 'A' | 'B' = 'B') => {
  const programme = db.programmes.find((p) => p.code === code)
  const enrolment = db.enrolments.find(
    (e) => e.learnerId === userId && e.programmeId === programme?.id,
  )
  return {
    enrolment,
    code: db.learningPaths.find((p) => p.id === enrolment?.pathId)?.code,
  }
}

/** Registers a visitor, marks them verified and signs them in. */
async function registeredLearner(programme: 'A' | 'B' = 'B') {
  const email = `visitor-${db.users.length}@example.com`
  await register({ name: 'Noor Haddad', email, password: 'Visitor2026!', programme })
  const account = db.users.find((u) => u.email === email)
  if (!account) throw new Error('not registered')
  account.emailVerified = true
  actAs(db, account.id)
  return account.id
}

function completeBody(organisationId: string | null): ProfileCompleteInput {
  return {
    organisationId,
    organisationType: 'hotel_accommodation',
    jobTitle: 'Guest relations officer',
    jobFunction: 'guest_services',
    seniority: 'experienced_professional',
    experience: '4_7',
    country: 'Qatar',
    city: 'Doha',
    preferredLanguage: 'English',
    goals: ['complaint_handling', 'communication'],
    weeklyMinutes: 60,
    acceptTerms: true,
    marketingOptIn: false,
  }
}

describe('organisation search (brief §4)', () => {
  test('needs a session; always offers the pseudo choices', async () => {
    await expect(searchOrganisations({ q: 'pearl' })).rejects.toMatchObject({ status: 401 })
    actAs(db, 'user-l0001')
    const names = (await searchOrganisations({ q: 'pearl' })).map((o) => o.name)
    expect(names).toContain('Demo Pearl Hospitality')
    expect(names).toContain('Independent professional')
    expect(names).toContain('Not currently employed')
  })

  test('filters by type and treats wildcards literally', async () => {
    actAs(db, 'user-l0001')
    const byType = await searchOrganisations({ type: 'transport' })
    expect(byType.filter((o) => !o.isPseudo).every((o) => o.type === 'transport')).toBe(true)
    expect((await searchOrganisations({ q: '%' })).every((o) => o.isPseudo)).toBe(true)
  })
})

describe('profile wizard and edits (brief §4)', () => {
  test('own-profile functions need a learner session', async () => {
    await expect(getOwnProfile()).rejects.toMatchObject({ status: 401 })
    actAs(db, 'user-t01')
    await expect(getOwnProfile()).rejects.toMatchObject({ status: 403 })
    actAs(db, 'user-admin')
    await expect(saveDraft({ step: 1 })).rejects.toMatchObject({ status: 403 })
  })

  test('a draft resumes; completion moves an unstarted B enrolment to the matched path', async () => {
    const id = await registeredLearner()
    const pearl = orgId('Demo Pearl Hospitality')
    const saved = await saveDraft({
      step: 2,
      organisationId: pearl,
      organisationType: 'hotel_accommodation',
      jobTitle: 'Guest relations officer',
      jobFunction: 'guest_services',
      seniority: 'experienced_professional',
      experience: '4_7',
    })
    expect(saved).toMatchObject({
      wizardStep: 2,
      status: 'draft',
      organisationName: 'Demo Pearl Hospitality',
    })
    expect(saved.completeness).toBeGreaterThan(0)

    const done = await completeProfile(completeBody(pearl))
    expect(done.next).toBe('B')
    expect(done.profile).toMatchObject({ status: 'complete', completeness: 100 })
    expect(pathOf(id).code).toBe('B-HOTEL')
  })

  test('consent is required to complete, and nothing is written without it', async () => {
    await registeredLearner()
    await expect(
      completeProfile({
        ...completeBody(orgId('Demo Pearl Hospitality')),
        acceptTerms: false as never,
      }),
    ).rejects.toMatchObject({ status: 400 })
    expect((await getOwnProfile()).status).toBe('draft')
  })

  test('"Other" records the typed organisation with its type', async () => {
    const id = await registeredLearner()
    const { profile } = await completeProfile({
      ...completeBody(null),
      organisationOther: 'Agent A Test Shuttles',
      organisationType: 'transport',
      jobFunction: 'transport',
    })
    expect(profile).toMatchObject({
      organisationName: 'Agent A Test Shuttles',
      organisationType: 'transport',
    })
    expect(pathOf(id).code).toBe('B-TRANSPORT')
  })

  test('a role change offers a revised path and keeps completed work', async () => {
    const id = await registeredLearner()
    await completeProfile(completeBody(orgId('Demo Pearl Hospitality')))
    const { enrolment } = pathOf(id)
    if (!enrolment) throw new Error('no enrolment')
    const c01 = db.courses.find((c) => c.code === 'C01')
    insertRow('unitProgress', {
      enrolmentId: enrolment.id,
      courseId: c01?.id ?? '',
      status: 'completed',
      percent: 100,
      completedAt: new Date().toISOString(),
    })
    enrolment.status = 'in_progress'

    const { acceptTerms: _consent, ...update } = completeBody(orgId('Demo City Mobility'))
    const edited = await updateProfile({
      ...update,
      organisationType: 'transport',
      jobFunction: 'transport',
    })
    expect(edited.revisions).toHaveLength(1)
    expect(edited.revisions[0]?.suggestedPath).toBe('B Transport services')
    // Offered only: nothing moved yet.
    expect(pathOf(id).code).toBe('B-HOTEL')

    await acceptRevision('B')
    expect(pathOf(id).code).toBe('B-TRANSPORT')
    const kept = db.unitProgress.filter((u) => u.enrolmentId === enrolment.id)
    expect(kept.find((u) => u.courseId === c01?.id)?.status).toBe('completed')
    const audit = db.auditEvents.find(
      (a) =>
        a.action === 'path.reassign' &&
        a.objectId === enrolment.id &&
        a.reason === 'accepted by the learner after a profile update',
    )
    expect(audit?.before).toEqual({ path: 'B Hotel guest services' })
  })
})

describe('joining a programme (brief §3 routing)', () => {
  test('needs a session, and only a learner may enrol', async () => {
    await expect(enrolSelf('A')).rejects.toMatchObject({ status: 401 })
    actAs(db, 'user-t01')
    await expect(enrolSelf('A')).rejects.toMatchObject({ status: 403 })
    actAs(db, 'user-admin')
    await expect(enrolSelf('A')).rejects.toMatchObject({ status: 403 })
  })

  test('Join Program A keeps the B enrolment and is idempotent; C refuses', async () => {
    const id = await registeredLearner()
    const bBefore = pathOf(id).enrolment?.id
    expect(await enrolSelf('A')).toMatchObject({ programme: 'A', created: true })
    expect((await enrolSelf('A')).created).toBe(false)
    expect(pathOf(id).enrolment?.id).toBe(bBefore)
    const audits = db.auditEvents.filter((a) => a.action === 'enrolment.create' && a.actorId === id)
    expect(audits).toHaveLength(2)
    await expect(enrolSelf('C')).rejects.toMatchObject({
      status: 409,
      code: 'PROGRAMME_ILLUSTRATIVE',
    })
    expect((await listMyEnrolments()).map((e) => e.programme)).toEqual(['A', 'B'])
  })
})
