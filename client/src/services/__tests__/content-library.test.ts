import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import {
  type Bookmark,
  canMapBookmark,
  mapBookmark,
  planSwitch,
} from '../content-library/bookmarks'
import { ITEM_SPECS } from '../content-library/registry'
import * as library from '../content-library.service'
import * as courses from '../courses.service'
import { getJourney } from '../progress.service'
import * as scorm from '../scorm.service'
import { rowToStatement, type StatementInput } from '../xapi/statement'
import * as xapi from '../xapi.service'
import { actAs, freshDemo } from './helpers'

/** Content Library (29 Oct): per-package bookmarks, language switch, one completion credit, simulated LRS. */

const MARIAM = 'user-l0042'
const ADMIN = 'user-admin'
const EN = 'wvq-en-scorm2004'
const AR = 'wvq-ar-scorm2004'
const PVE_EN = 'pve-en-xapi'
const PVE_AR = 'pve-ar-xapi'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
  actAs(db, MARIAM)
})

const suspend = (lang: 'en' | 'ar', screen: number, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ v: 1, s: 'wvq-bookmark-1', lang, screen, visited: [1, 2, 3], ...extra })

let launch = 0
const commit = (packageId: string, body: Partial<Parameters<typeof scorm.commit>[1]> = {}) =>
  scorm.commit('C08', {
    programme: 'B',
    launchId: `launch-${String(++launch).padStart(4, '0')}`,
    cmiCompletionStatus: 'incomplete',
    packageId,
    ...body,
  })

describe('SCORM bookmark per package', () => {
  test('each language keeps its own bookmark', async () => {
    await commit(EN, { location: 'screen-3', suspendData: suspend('en', 3) })
    await commit(AR, { location: 'screen-1', suspendData: suspend('ar', 1) })

    const en = await scorm.getState('B', 'C08', EN)
    const ar = await scorm.getState('B', 'C08', AR)
    expect(en.cmi.entry).toBe('resume')
    expect(en.cmi.location).toBe('screen-3')
    expect(JSON.parse(en.cmi.suspendData).lang).toBe('en')
    expect(ar.cmi.location).toBe('screen-1')
    expect(JSON.parse(ar.cmi.suspendData).lang).toBe('ar')
    expect(en.package.packageId).toBe(EN)
    expect(ar.package.launchUrl).toBe('/content/wvq-ar-scorm2004/index.html')
  })

  test('a version never opened has no bookmark to reuse', async () => {
    await commit(EN, { location: 'screen-4', suspendData: suspend('en', 4) })
    const ar = await scorm.getState('B', 'C08', AR)
    expect(ar.cmi.entry).toBe('ab-initio')
    expect(ar.cmi.location).toBe('')
  })

  test('restart clears only that language and keeps the other', async () => {
    await commit(EN, { location: 'screen-3', suspendData: suspend('en', 3) })
    await commit(AR, { location: 'screen-2', suspendData: suspend('ar', 2) })
    await scorm.restart('B', 'C08', AR)
    expect((await scorm.getState('B', 'C08', AR)).cmi.entry).toBe('ab-initio')
    expect((await scorm.getState('B', 'C08', EN)).cmi.location).toBe('screen-3')
  })

  test('a library commit must name its package, and only a package of this unit', async () => {
    await expect(
      scorm.commit('C08', {
        programme: 'B',
        launchId: 'launch-no-pkg-1',
        cmiCompletionStatus: 'incomplete',
      }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(commit(PVE_EN)).rejects.toMatchObject({ status: 404 })
  })
})

describe('completion credit counts once across languages', () => {
  test('passing in English then Arabic completes the unit once', async () => {
    const pass = await commit(EN, {
      cmiCompletionStatus: 'completed',
      cmiSuccessStatus: 'passed',
      scoreRaw: 100,
      location: 'screen-5',
      suspendData: suspend('en', 5),
    })
    expect(pass.completedNow).toBe(true)
    const first = (await courses.getUnit('B', 'C08')).progress.completedAt
    expect(first).not.toBeNull()

    const again = await commit(AR, {
      cmiCompletionStatus: 'completed',
      cmiSuccessStatus: 'passed',
      scoreRaw: 67,
      location: 'screen-5',
      suspendData: suspend('ar', 5),
    })
    expect(again.completedNow).toBe(false)
    expect(again.unitStatus).toBe('completed')
    expect((await courses.getUnit('B', 'C08')).progress.completedAt).toBe(first)

    const lib = await library.getLibraryUnit('B', 'C08')
    expect(lib.credit.completed).toBe(true)
    expect(lib.credit.completedPackageId).toBe(EN)
    // Credit exists in exactly one place: one completed unit row.
    const rows = db.unitProgress.filter(
      (u) =>
        u.courseId === db.courses.find((c) => c.code === 'C08')?.id && u.status === 'completed',
    )
    expect(rows).toHaveLength(1)
  })

  test('a score below the pass mark does not complete the unit', async () => {
    const res = await commit(EN, {
      cmiCompletionStatus: 'completed',
      cmiSuccessStatus: 'passed',
      scoreRaw: 33,
      location: 'screen-5',
    })
    expect(res.unitStatus).toBe('in_progress')
  })
})

describe('language switch', () => {
  test('equivalent position is mapped to the other language, nothing is reset', async () => {
    await commit(EN, {
      location: 'screen-3',
      suspendData: suspend('en', 3, { quiz: { answers: [1, null, null], retries: 0 } }),
    })
    const before = structuredClone(db.enrolments.filter((e) => e.learnerId === MARIAM))

    const plan = await library.planLanguageSwitch('C08', { programme: 'B', from: EN, to: AR })
    expect(plan).toMatchObject({ mapped: true, position: 3, positions: 5, language: 'ar' })
    // Planning changes nothing.
    expect((await scorm.getState('B', 'C08', AR)).cmi.entry).toBe('ab-initio')

    const applied = await library.switchLanguage('C08', { programme: 'B', from: EN, to: AR })
    expect(applied.applied).toBe(true)

    const ar = await scorm.getState('B', 'C08', AR)
    expect(ar.cmi.entry).toBe('resume')
    expect(ar.cmi.location).toBe('screen-3')
    const data = JSON.parse(ar.cmi.suspendData)
    expect(data.lang).toBe('ar')
    expect(data.quiz.answers).toEqual([1, null, null])
    // The English bookmark is untouched and the enrolment is not reset.
    expect((await scorm.getState('B', 'C08', EN)).cmi.location).toBe('screen-3')
    expect(db.enrolments.filter((e) => e.learnerId === MARIAM)).toEqual(before)
    expect(db.auditEvents.some((e) => e.action === 'content.language_switch')).toBe(true)
  })

  test('with no saved position the other language starts at the beginning', async () => {
    const plan = await library.planLanguageSwitch('C08', { programme: 'B', from: EN, to: AR })
    expect(plan.mapped).toBe(false)
    expect(plan.position).toBe(0)
  })

  test('a bookmark saved with another layout is not used or mapped', async () => {
    await commit(EN, { location: 'screen-4', suspendData: suspend('en', 4) })
    const unit = db.unitProgress.find((u) => u.extra?.bookmarks)
    const bookmarks = unit?.extra?.bookmarks as Record<string, Bookmark>
    const saved = bookmarks[EN]
    if (!unit || !saved) throw new Error('no bookmark saved')
    saved.schema = 'wvq-bookmark-0'

    expect((await scorm.getState('B', 'C08', EN)).cmi.entry).toBe('ab-initio')
    const plan = await library.planLanguageSwitch('C08', { programme: 'B', from: EN, to: AR })
    expect(plan.mapped).toBe(false)
  })

  test('pure rules: only variants that share a bookmark schema can map', () => {
    const spec = ITEM_SPECS['welcoming-visitors-to-qatar']
    const en = { packageId: 'a-en', language: 'en' as const, bookmarkSchema: 'x-1' }
    const ar = { packageId: 'a-ar', language: 'ar' as const, bookmarkSchema: 'x-1' }
    const other = { packageId: 'b-ar', language: 'ar' as const, bookmarkSchema: 'x-2' }
    const saved: Bookmark = {
      packageId: 'a-en',
      language: 'en',
      schema: 'x-1',
      location: 'screen-2',
      suspendData: JSON.stringify({ v: 1, s: 'x-1', lang: 'en', screen: 2 }),
      completion: 'incomplete',
      success: 'unknown',
      scoreRaw: null,
      savedAt: '2026-10-27T08:00:00.000Z',
      mappedFrom: null,
    }
    expect(canMapBookmark(en, ar)).toBe(true)
    expect(canMapBookmark(en, other)).toBe(false)
    expect(canMapBookmark(en, en)).toBe(false)
    expect(planSwitch(spec, saved, en, ar)).toMatchObject({ mapped: true, position: 2 })
    expect(planSwitch(spec, saved, en, other)).toMatchObject({ mapped: false, position: 0 })
    expect(mapBookmark(spec, saved, other, null, saved.savedAt)).toBeNull()
    const mapped = mapBookmark(spec, saved, ar, null, saved.savedAt)
    expect(mapped?.packageId).toBe('a-ar')
    expect(mapped?.mappedFrom).toBe('a-en')
    expect(JSON.parse(mapped?.suspendData ?? '{}').lang).toBe('ar')
  })

  test('a learner outside the unit cannot read or switch it', async () => {
    actAs(db, ADMIN)
    await expect(library.getLibraryUnit('B', 'C08')).rejects.toMatchObject({ status: 403 })
  })
})

describe('xAPI statements to the simulated LRS', () => {
  const stmt = (
    packageId: string,
    verb: string,
    part = '',
    result?: StatementInput['result'],
  ): StatementInput => ({
    id: crypto.randomUUID(),
    actor: {
      objectType: 'Agent',
      name: 'Mariam Al Nuaimi',
      account: { homePage: 'https://academy.demo.invalid', name: 'LRN-0042' },
    },
    verb: { id: `http://adlnet.gov/expapi/verbs/${verb}`, display: { 'en-US': verb } },
    object: {
      objectType: 'Activity',
      id: `https://lrs.demo.invalid/activities/${packageId}${part}`,
    },
    ...(result ? { result } : {}),
    timestamp: new Date().toISOString(),
  })
  const record = (packageId: string, statement: StatementInput, programme: 'A' | 'B' = 'B') =>
    xapi.recordStatement('C09', { programme, packageId, statement })

  test('stores actor, verb, activity, timestamp and result, labelled simulated', async () => {
    const statement = stmt(PVE_EN, 'answered', '/service-response', {
      response: 'confirmed',
      success: true,
      score: { scaled: 1 },
    })
    const res = await record(PVE_EN, statement)
    expect(res.duplicate).toBe(false)

    const row = db.xapiStatements.find((s) => s.statementId === statement.id)
    expect(row).toMatchObject({
      actorLearnerId: MARIAM,
      verb: 'answered',
      packageId: PVE_EN,
      activityId: 'https://lrs.demo.invalid/activities/pve-en-xapi/service-response',
      simulatedLrs: true,
    })
    expect(row?.result).toMatchObject({ success: true })
    expect(typeof row?.timestamp).toBe('string')

    const full = rowToStatement(row as NonNullable<typeof row>, {
      name: 'Mariam Al Nuaimi',
      account: 'LRN-0042',
    })
    expect(full).toMatchObject({
      id: statement.id,
      actor: { objectType: 'Agent', account: { name: 'LRN-0042' } },
      verb: { id: 'http://adlnet.gov/expapi/verbs/answered' },
      object: { objectType: 'Activity' },
    })
    expect(full.context.extensions['https://lrs.demo.invalid/ext/simulated']).toBe('true')

    const launchData = await xapi.getLaunch('B', 'C09', PVE_EN)
    expect(launchData.lrs.simulated).toBe(true)
    expect(launchData.lrs.label).toBe('Simulated learning record store')
    expect(launchData.statements[0]?.statementId).toBe(statement.id)
    expect(launchData.actor.account).toBe('LRN-0042')
  })

  test('rejects an actor that is not the signed-in learner, or another activity', async () => {
    const wrongActor = stmt(PVE_EN, 'answered')
    wrongActor.actor.account.name = 'LRN-0001'
    await expect(record(PVE_EN, wrongActor)).rejects.toMatchObject({ status: 400 })
    await expect(
      record(PVE_EN, { ...stmt(PVE_EN, 'answered'), object: { id: 'https://example.com/other' } }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(record(PVE_EN, stmt(PVE_EN, 'deleted'))).rejects.toMatchObject({ status: 400 })
    expect(
      db.xapiStatements.filter(
        (s) => s.packageId === PVE_EN && s.actorLearnerId === MARIAM && s.verb === 'deleted',
      ),
    ).toHaveLength(0)
  })

  test('a statement id is stored once, so a retry adds no second row', async () => {
    const statement = stmt(PVE_EN, 'experienced', '/destination', { response: 'Museum' })
    await record(PVE_EN, statement)
    const again = await record(PVE_EN, statement)
    expect(again.duplicate).toBe(true)
    expect(db.xapiStatements.filter((s) => s.statementId === statement.id)).toHaveLength(1)
  })

  test('the state document is saved per language and completion counts once', async () => {
    await xapi.saveState('C09', {
      programme: 'B',
      packageId: PVE_EN,
      location: 'step-3',
      suspendData: JSON.stringify({ v: 1, s: 'pve-bookmark-1', lang: 'en', step: 3 }),
    })
    expect((await xapi.getLaunch('B', 'C09', PVE_EN)).state.location).toBe('step-3')
    expect((await xapi.getLaunch('B', 'C09', PVE_AR)).state.location).toBe('')

    const done = (packageId: string) =>
      record(
        packageId,
        stmt(packageId, 'completed', '', { completion: true, success: true, score: { scaled: 1 } }),
      )
    const first = await done(PVE_EN)
    expect(first.completedNow).toBe(true)
    const second = await done(PVE_AR)
    expect(second.completedNow).toBe(false)
    expect(second.unitStatus).toBe('completed')
    expect((await library.getLibraryUnit('B', 'C09')).credit.completedPackageId).toBe(PVE_EN)
  })

  test('an unsuccessful completed statement is stored but does not complete the unit', async () => {
    const res = await record(
      PVE_EN,
      stmt(PVE_EN, 'completed', '', { completion: true, success: false, score: { scaled: 0.25 } }),
    )
    expect(res.completedNow).toBe(false)
    expect(res.unitStatus).toBe('in_progress')
  })

  test('the admin tracking test lists the table; learners cannot', async () => {
    await record(PVE_EN, stmt(PVE_EN, 'initialized'))
    actAs(db, ADMIN)
    const table = await xapi.listStatements(PVE_EN)
    expect(table.label).toBe('Simulated learning record store')
    expect(table.items.some((i) => i.actorAccount === 'LRN-0042' && i.verb === 'initialized')).toBe(
      true,
    )
    actAs(db, MARIAM)
    await expect(xapi.listStatements(PVE_EN)).rejects.toMatchObject({ status: 403 })
  })

  test('an admin preview statement is stored without touching any learner record', async () => {
    actAs(db, ADMIN)
    const preview = await xapi.previewLaunch(PVE_AR)
    expect(preview.actor.account).toBe('PREVIEW-user-admin')
    const statement = stmt(PVE_AR, 'initialized')
    statement.actor.account.name = preview.actor.account
    statement.actor.name = preview.actor.name
    await xapi.recordPreviewStatement(PVE_AR, statement)
    expect(
      db.xapiStatements.some((s) => s.statementId === statement.id && s.actorLearnerId === ADMIN),
    ).toBe(true)
    expect(db.unitProgress.some((u) => u.extra?.activePackageId === PVE_AR)).toBe(false)
  })
})

describe('Content Library catalogue', () => {
  test('lists the two items with four language variants for an admin', async () => {
    actAs(db, ADMIN)
    const { items } = await library.listLibrary()
    expect(items.map((i) => i.courseKey).sort()).toEqual([
      'planning-a-visitor-experience',
      'welcoming-visitors-to-qatar',
    ])
    const variants = items.flatMap((i) => i.variants.map((v) => v.packageId)).sort()
    expect(variants).toEqual([PVE_AR, PVE_EN, AR, EN].sort())
    expect(items.find((i) => i.courseCode === 'C08')?.variants.map((v) => v.language)).toEqual([
      'en',
      'ar',
    ])
  })

  test('learners cannot read the admin catalogue', async () => {
    await expect(library.listLibrary()).rejects.toMatchObject({ status: 403 })
  })

  test('Mariam sees both units in her Program A and B journeys without changing her progress', async () => {
    for (const programme of ['A', 'B'] as const) {
      const journey = await getJourney(programme)
      const items = journey.items.filter((i) => i.courseCode === 'C08' || i.courseCode === 'C09')
      expect(items.map((i) => i.courseCode).sort()).toEqual(['C08', 'C09'])
      expect(items.every((i) => !i.required && i.state !== 'completed')).toBe(true)
      expect(['C08', 'C09']).not.toContain(journey.nextAction?.courseCode ?? '')
    }
  })

  test('the units sit in the Program A and B paths as optional items', async () => {
    for (const programme of ['A', 'B'] as const) {
      const unit = await courses.getUnit(programme, 'C08')
      expect(unit.content.kind).toBe('scorm')
      expect((await courses.getUnit(programme, 'C09')).content.kind).toBe('xapi')
    }
    const optional = db.pathItems.filter(
      (i) => i.courseId === db.courses.find((c) => c.code === 'C08')?.id,
    )
    expect(optional.length).toBeGreaterThanOrEqual(4)
    expect(optional.every((i) => i.required === false)).toBe(true)
  })
})
